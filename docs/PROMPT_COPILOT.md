# Prompt para o GitHub Copilot — publicar o PRISMA na Vercel

Copie **todo** o bloco abaixo e cole no chat do Copilot (ou no issue/PR dele).
Os valores secretos **não** estão escritos aqui de propósito: o Copilot deve lê-los
dos arquivos `.env` locais, que já existem e não são versionados.

---

````text
Você está no repositório GitHub `DiegoMedinaMorais/PRISMA`, branch `main`.
É o projeto PRISMA MVP: frontend Vite + React 18 em `/`, BFF Express em `server/`,
Supabase como banco/Auth/Storage. O último commit (7f813ea) já contém tudo o que
é necessário para publicar na Vercel.

OBJETIVO
Publicar o app na Vercel para eu enviar um link de apresentação. Todos os
visitantes devem usar o MEU projeto Supabase — não criar outro projeto, não pedir
para ninguém criar conta Supabase.

PASSOS

1. Release e push:
   - Confirme que o git status está limpo e que o HEAD é `7f813ea`.
   - Rode `git push origin main`. Não crie novos commits a menos que haja erro real.

2. Importar na Vercel (use a CLI `vercel`, a integração ou MCP, o que estiver disponível):
   - Importe `DiegoMedinaMorais/PRISMA`, framework Vite, branch `main`.
   - Build command: `npm run build`. Output directory: `dist`. Install: `npm install`.
   - Isso já está em `vercel.json`; não precisa alterar.

3. Variáveis de ambiente (preencha para Production, Preview e Development):
   Leia os valores reais dos arquivos LOCAIS (não versionados):
     - `.env`         → VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
     - `server/.env`  → SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
   Configure na Vercel:
     VITE_SUPABASE_URL            = valor de .env
     VITE_SUPABASE_ANON_KEY       = valor de .env
     VITE_API_URL                 = ""   (string VAZIA — o frontend usa /api relativo)
     SUPABASE_URL                 = valor de server/.env
     SUPABASE_SERVICE_ROLE_KEY    = valor de server/.env  (SEGREDO)
   As variáveis VITE_* precisam existir ANTES do build. Se o deploy já tiver
   rodado sem elas, faça um novo deploy depois de configurar.

4. Supabase (painel do MEU projeto, aquele das URLs acima):
   - Authentication → URL Configuration: adicione a URL da Vercel em "Site URL"
     e em "Redirect URLs" (ex.: https://prisma-xxx.vercel.app/**).
   - Confirme que `supabase/schema.sql` foi aplicado (tabelas profiles/readings,
     bucket avatars e RLS).
   - A conta demo `superadmin@gmail.com` / `admin123` já existe com role
     `superadmin` (criada por `npm run seed:demo`). Não apague nem troque.

5. Validação depois do deploy:
   - `GET https://<url>/api/health` → 200 com `{"status":"ok"}`.
   - Abrir a URL no navegador → tela de login do PRISMA.
   - Clicar em "Entrar com conta demo" → entrar como SuperAdmin sem erro.
   - Verificar que o menu "Gestão SuperAdmin" aparece.
   - Me devolver a URL final do deploy.

RESTRIÇÕES IMPORTANTES
- NUNCA escreva, commite ou mostre em logs os valores de SB_SECRET_ / anon key.
- NÃO crie um novo projeto Supabase. Use o das variáveis de ambiente.
- NÃO altere as credenciais demo.
- NÃO commite arquivos .env. Eles estão no .gitignore.
- Se a Vercel pedir domínio/build different, use exatamente o vercel.json do repo.

SE FALTAR ALGO
Se não der para acessar a Vercel por ferramenta, me passe:
  (a) o comando `vercel --prod` pronto para eu rodar; e
  (b) a lista exata de env vars para eu colar no painel da Vercel.
Não inventar valores.
````

---

## Verificação rápida que o Copilot deve conseguir fazer

```bash
git status                       # limpo
git log -1 --oneline             # 7f813ea ...
npm run build                    # OK
curl https://<url>/api/health    # {"status":"ok","service":"prisma-bff"}
```

Se o `GET /api/health` falhar mas o site abrir, o problema é a função serverless
`api/[...path].js` — conferir se as env vars `SUPABASE_URL` e
`SUPABASE_SERVICE_ROLE_KEY` foram definidas na Vercel.
