import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data, error } = await admin.auth.admin.listUsers({ perPage: 10 })
if (error) {
  console.error('ERRO:', error.message)
  process.exit(1)
}
for (const u of data.users) {
  console.log(JSON.stringify({
    email: u.email,
    confirmado: u.email_confirmed_at ? 'SIM' : 'NÃO',
    criado_em: u.created_at,
    ultimo_login: u.last_sign_in_at,
  }))
}
