/**
 * PRISMA — Garante a conta de demonstração no SUPABASE DO USUÁRIO.
 *
 * Uso:  npm run seed:demo
 *
 * Lê SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY de server/.env (ou do ambiente).
 * Idempotente: se o e-mail já existir, atualiza a senha e força role=superadmin.
 * Se não existir, cria o usuário com e-mail confirmado.
 */
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: 'server/.env' }) // roda a partir da raiz via npm script

const URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const DEMO_EMAIL = 'superadmin@gmail.com'
const DEMO_PASSWORD = 'admin123'
const DEMO_METADATA = {
  full_name: 'Admin NEXO (Demo)',
  cargo: 'SuperAdmin',
}

if (!URL || !SERVICE_KEY) {
  console.error(
    '❌ Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em server/.env antes de rodar.',
  )
  process.exit(1)
}

const admin = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (listError) throw listError

  const existing = list.users.find((u) => u.email?.toLowerCase() === DEMO_EMAIL)
  let userId

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: DEMO_METADATA,
    })
    if (error) throw error
    userId = existing.id
    console.log(`♻️  Usuário ${DEMO_EMAIL} já existia — senha e metadados atualizados.`)
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: DEMO_METADATA,
    })
    if (error) throw error
    userId = data.user.id
    console.log(`✅ Usuário ${DEMO_EMAIL} criado.`)
  }

  // Garante o perfil SuperAdmin (o profile é criado por trigger, mas aqui forçamos o role).
  const { error: profileError } = await admin.from('profiles').upsert({
    id: userId,
    full_name: DEMO_METADATA.full_name,
    cargo: DEMO_METADATA.cargo,
    role: 'superadmin',
  })
  if (profileError) throw profileError

  console.log('✅ Perfil role=superadmin garantido.')
  console.log(`\nLogin demo: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
}

main().catch((err) => {
  console.error('❌ Falha:', err.message)
  process.exit(1)
})
