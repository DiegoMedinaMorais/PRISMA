import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'

/**
 * PRISMA · BFF (Backend-for-Frontend)
 * ---------------------------------------------------------------------------
 * O Supabase não permite usar a service_role key no navegador. Por isso,
 * ações administrativas (criar/excluir usuários, listar todos os perfis)
 * passam por este servidor Node, que:
 *   1. Valida o JWT do requisitante via Supabase Auth;
 *   2. Confere no banco se o perfil dele é 'superadmin';
 *   3. Só então executa a operação com a service_role key.
 */

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORT = 3333 } = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    '[prisma-bff] Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no server/.env'
  )
  process.exit(1)
}

// Cliente ADMIN (service role) — só existe aqui no servidor
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const app = express()
app.use(cors())
app.use(express.json())

// Página amigável na raiz: evita o "Cannot GET /" quando alguém abre o BFF no navegador
app.get('/', (_req, res) => {
  res
    .type('html')
    .send(
      '<h1>🛰️ PRISMA · BFF</h1><p>Este é o servidor de API (porta 3333), não há páginas aqui.</p>'
      + '<p>O app roda em <a href="http://localhost:5173">http://localhost:5173</a></p>'
      + '<p>Health check: <a href="/api/health">/api/health</a></p>'
    )
})

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'prisma-bff' }))

/** Middleware: exige um usuário autenticado (JWT válido). */
async function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Token ausente' })

  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada' })
  }
  req.user = data.user
  next()
}

/** Middleware: exige role = superadmin. */
async function requireSuperAdmin(req, res, next) {
  const { data: profile, error } = await admin
    .from('profiles')
    .select('role')
    .eq('id', req.user.id)
    .single()

  if (error || profile?.role !== 'superadmin') {
    return res.status(403).json({ error: 'Acesso restrito a SuperAdmin' })
  }
  next()
}

// ---------------------------------------------------------------------------
// Rotas administrativas (SuperAdmin)
// ---------------------------------------------------------------------------

/** Lista todos os usuários + perfis. */
app.get('/api/admin/users', requireAuth, requireSuperAdmin, async (_req, res) => {
  const [usersRes, profilesRes] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 200 }),
    admin.from('profiles').select('*').order('created_at', { ascending: false }),
  ])

  if (usersRes.error) return res.status(500).json({ error: usersRes.error.message })
  if (profilesRes.error) return res.status(500).json({ error: profilesRes.error.message })

  const profilesById = new Map(profilesRes.data.map((p) => [p.id, p]))
  const users = usersRes.data.users.map((u) => {
    const p = profilesById.get(u.id) || {}
    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      full_name: p.full_name || '',
      cargo: p.cargo || '',
      role: p.role || 'operador',
      avatar_url: p.avatar_url || null,
    }
  })
  res.json({ users })
})

/** Cria um novo usuário (auth + profile). */
app.post('/api/admin/users', requireAuth, requireSuperAdmin, async (req, res) => {
  const { email, password, full_name, cargo, role } = req.body || {}
  if (!email || !password || password.length < 6) {
    return res
      .status(400)
      .json({ error: 'Informe e-mail e senha (mínimo 6 caracteres).' })
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name || email.split('@')[0], cargo: cargo || 'Operador' },
  })
  if (error) return res.status(400).json({ error: error.message })

  const { error: profileError } = await admin
    .from('profiles')
    .upsert({
      id: data.user.id,
      full_name: full_name || email.split('@')[0],
      cargo: cargo || 'Operador',
      role: ['superadmin', 'operador', 'visualizador'].includes(role) ? role : 'operador',
    })
  if (profileError) return res.status(500).json({ error: profileError.message })

  res.status(201).json({ user: { id: data.user.id, email: data.user.email } })
})

/** Atualiza role/cargo/nome de um usuário. */
app.patch('/api/admin/users/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  const { id } = req.params
  const { role, cargo, full_name } = req.body || {}

  const patch = {}
  if (['superadmin', 'operador', 'visualizador'].includes(role)) patch.role = role
  if (typeof cargo === 'string') patch.cargo = cargo
  if (typeof full_name === 'string') patch.full_name = full_name
  if (!Object.keys(patch).length) {
    return res.status(400).json({ error: 'Nada para atualizar' })
  }

  const { error } = await admin.from('profiles').update(patch).eq('id', id)
  if (error) return res.status(400).json({ error: error.message })
  res.json({ ok: true })
})

/** Exclui definitivamente um usuário (auth.users → cascade apaga o profile). */
app.delete('/api/admin/users/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  const { id } = req.params
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Você não pode excluir a si mesmo.' })
  }
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return res.status(400).json({ error: error.message })
  res.json({ ok: true })
})

// ---------------------------------------------------------------------------
// Health-check (definido junto às rotas, no topo do arquivo)
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`[prisma-bff] rodando em http://localhost:${PORT}`)
})
