import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const email = process.argv[2]
const { data, error } = await admin.auth.admin.listUsers({ perPage: 100 })
if (error) { console.error('ERRO:', error.message); process.exit(1) }
const user = data.users.find((u) => u.email?.toLowerCase() === email?.toLowerCase())
if (!user) { console.error('Usuário não encontrado:', email); process.exit(1) }

const { error: err2 } = await admin.auth.admin.updateUserById(user.id, { email_confirm: true })
if (err2) { console.error('ERRO ao confirmar:', err2.message); process.exit(1) }
console.log(`OK: ${user.email} confirmado! Agora é só logar.`)
