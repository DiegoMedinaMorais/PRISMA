# PRISMA

**P**rocesso de **R**emoção **I**nteligente e **S**ustentável de **M**icroplásticos **A**quáticos —
app de monitoramento SCADA/IoT de uma rede de estações de tratamento.

O sistema detecta microplásticos com sensores a laser e só aciona a nanofiltração
quando necessário, economizando energia. O painel simula a planta em tempo real,
registra leituras no Supabase e separa acessos por perfil.

---

## Acesso rápido

| Onde | Endereço | O que é |
|---|---|---|
| 💻 Local | http://localhost:5173 | App (frontend) |
| ⚙️ Local | http://localhost:3333/api/health | BFF (API) |
| ☁️ Produção | _URL da Vercel_ | Link de apresentação |

### 🔑 Conta de demonstração (SuperAdmin)

```
E-mail:  superadmin@gmail.com
Senha:   admin123
```

Na tela de login, clique em **"Entrar com conta demo"** — entra automaticamente
com acesso total. A conta existe no **Supabase do dono do projeto**, criada por:

```bash
npm run seed:demo     # idempotente: cria ou atualiza a conta demo
```

> ⚠️ Qualquer visitante do link pode entrar como SuperAdmin. Isso é intencional
> para a apresentação. Para fechar depois, troque as credenciais com o seed ou
> remova o botão em `src/pages/Login.jsx`.

---

## Arquitetura

```
├── api/
│   └── [...path].js         ← função serverless da Vercel (BFF)
├── server/
│   ├── app.js               ← rotas Express + validação JWT/role (compartilhado)
│   ├── index.js             ← servidor local (porta 3333)
│   ├── seed-demo.mjs        ← cria/garante a conta SuperAdmin demo
│   └── check-users.mjs / confirm-email.mjs  ← utilitários
├── supabase/schema.sql      ← tabelas, RLS, trigger, bucket (SQL Editor)
├── src/
│   ├── context/             ← Auth, Theme (dark/light), Process (motor da planta)
│   ├── components/          ← AppLayout, Sidebar, BottomNav, Units, StatCard, AlarmBanner
│   ├── pages/               ← Login, Dashboard, Simulator, History, Reports, Configs, Profile, Admin
│   └── lib/supabaseClient.js← cliente Supabase + URL do BFF
├── .env                     ← frontend (VITE_*) — NÃO versionar
├── server/.env              ← BFF (service_role) — NÃO versionar
├── vercel.json              ← build/regras de rota na Vercel
└── docs/PROMPT_COPILOT.md    ← prompt pronto para publicar via Copilot
```

**Fluxo de autorização das rotas administrativas:**

```
Browser → BFF (JWT do Supabase) → admin.auth.getUser(token)
        → profiles.role === 'superadmin' → service_role key → Supabase Admin API
```

A `service_role key` **nunca** vai para o navegador.

---

## Rodando localmente

### Resumo

```bash
npm install
npm install --prefix server
npm run dev:all        # frontend + BFF no mesmo terminal
```

Comandos individuais: `npm run dev` (web) e `npm run server` (BFF).

### Do zero (passo a passo)

1. **Supabase:** crie um projeto em [supabase.com/dashboard](https://supabase.com/dashboard)
   (região South America / São Paulo) e rode **todo** `supabase/schema.sql` no SQL Editor.
   Isso cria `profiles` (RLS), `readings`, o trigger de perfil e o bucket `avatars`.

2. **Chaves** em *Project Settings → API / API Keys*:
   - **Project URL** → `https://<ref>.supabase.co`
   - **anon public** → `sb_publishable_...` (público)
   - **service_role** → `sb_secret_...` ⚠️ secreto, só no BFF

3. **Ambiente:** copie os exemplos e preencha.

   ```bash
   cp .env.example .env
   cp server/.env.example server/.env
   ```

   | Arquivo | Variável | Valor |
   |---|---|---|
   | `.env` | `VITE_SUPABASE_URL` | Project URL |
   | `.env` | `VITE_SUPABASE_ANON_KEY` | `sb_publishable_...` |
   | `.env` | `VITE_API_URL` | `http://localhost:3333` |
   | `server/.env` | `SUPABASE_URL` | a mesma URL |
   | `server/.env` | `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` |
   | `server/.env` | `PORT` | `3333` |

   > `.env` é lido na inicialização — reinicie `dev:all` após editar.

4. **Conta demo:** `npm run seed:demo`.

5. **Rodar:** `npm run dev:all` → frontend em :5173, BFF em :3333.

---

## Deploy na Vercel

Todos os visitantes usam **o mesmo** Supabase — ninguém precisa criar o seu.
As chaves ficam apenas nas variáveis de ambiente da Vercel.

### 1. Enviar o código

O commit de preparação já está feito (`7f813ea`). Basta:

```bash
git push origin main
```

> Dica: use o prompt pronto em [`docs/PROMPT_COPILOT.md`](docs/PROMPT_COPILOT.md)
> para o Copilot fazer push, configurar e validar o deploy.

### 2. Importar na Vercel

- Repositório: `DiegoMedinaMorais/PRISMA`, branch `main`
- Framework: **Vite** (detectado automaticamente)
- Build: `npm run build` · Output: `dist` · Install: `npm install`
- Tudo isso já está declarado em `vercel.json`.
- O BFF sobe como a função serverless `api/[...path].js` (rotas `/api/*`).

### 3. Variáveis de ambiente

Em **Settings → Environment Variables** (Production, Preview e Development):

| Variável | Valor | Onde aparece |
|---|---|---|
| `VITE_SUPABASE_URL` | URL do seu Supabase | frontend (público) |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_...` | frontend (público) |
| `VITE_API_URL` | **vazia** (string vazia) | frontend → `/api` relativo |
| `SUPABASE_URL` | a mesma URL | BFF (servidor) |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` | BFF (**secreta**) |

> `VITE_*` são embutidas no build. Configure **antes** de dar o deploy.

### 4. Supabase

- **Authentication → URL Configuration:** adicione a URL da Vercel em *Site URL*
  e *Redirect URLs* (ex.: `https://prisma-xxx.vercel.app/**`).
- Rode `supabase/schema.sql` se ainda não tiver aplicado.
- Garanta a conta demo: `npm run seed:demo` (local, com `server/.env` real).

### 5. Validar

```bash
curl https://<url>/api/health
# {"status":"ok","service":"prisma-bff"}
```

Abra a URL → tela de login → **"Entrar com conta demo"** → menu *Gestão SuperAdmin*.

---

## Funcionalidades

| Requisito | Onde |
|---|---|
| Login/Cadastro (Supabase Auth) | `src/pages/Login.jsx` |
| Conta demo SuperAdmin | `src/pages/Login.jsx` + `scripts/seed-demo.mjs` |
| Perfis + foto (Supabase Storage) | `src/pages/Profile.jsx` |
| SuperAdmin gerencia usuários | `src/pages/Admin.jsx` + `server/app.js` (BFF) |
| Rede com 5 ETAs ao vivo (HMI) | `src/pages/Dashboard.jsx` + `components/Units.jsx` |
| Motor PRISMA (Sensor 1 → FAD → Sensor 2 → NF bypass/ativa) | `src/context/ProcessContext.jsx` |
| Gráfico da rede (10 min, eixo/limite/legenda) | `components/NetworkChart.jsx` |
| Controle de operação (manutenção + alarmes + registros) | `src/pages/Simulator.jsx` |
| Relatórios por período + exportação CSV | `src/pages/Reports.jsx` |
| Configurações (tema, banner de alarmes, especificação) | `src/pages/Configs.jsx` |
| Histórico de leituras | `src/pages/History.jsx` (tabela `readings`) |
| Dark/Light mode | `ThemeContext.jsx` (transição suave) |
| Bottom Menu + Sidebar | `BottomNav.jsx` / `Sidebar.jsx` |

---

## A planta · rede com 5 ETAs

O painel monitora uma operação **contínua** (estilo SCADA/HMI) de uma rede com
**5 ETAs**. Todas possuem a máquina PRISMA completa: sensor de entrada, separação
FAD com reciclagem, sensor de saída e nanofiltração (em bypass ou ativa).

| Unidade | Bairro | Vazão nominal | Sensibilidade do ponto de captação |
|---|---|---|---|
| `ETA-01` | Central | 5,0 m³/h | 1,00× |
| `ETA-02` | Norte | 4,0 m³/h | 1,15× |
| `ETA-03` | Leste | 3,5 m³/h | 0,90× |
| `ETA-04` | Sul | 2,5 m³/h | 1,05× |
| `ETA-05` | Poente | 2,0 m³/h | 1,20× |

### Como funciona

1. **Sensor 1 (entrada):** laser vigia a água que chega.
   - Limpo (≤ 0,05 ppm) → **bypass direto**, sem gastar energia;
   - Plástico (> 0,05 ppm) → **desvio** para separação FAD (aglutinante +
     microbolhas). O plástico boiado vai para **cooperativas de reciclagem**.
2. **Sensor 2 (saída · falha-segura):**
   - Residual ≤ 0,15 ppm → nanofiltração em **BYPASS**;
   - Residual > 0,15 ppm → NF **liga automaticamente** e volta ao bypass
     quando cai abaixo de 0,08 ppm (histerese, sem oscilar no limiar).
3. **Diferencial:** não manter a filtragem de alta pressão ligada 24 h →
   **economia de mais de 70%** de energia (KPI calculado ao vivo).

```
Captação ──► SENSOR 1 (laser) ──► limpo? → BYPASS direto (economia)
                   │
                   └── plástico? → DESVIO → FAD (aglutinante + microbolhas)
                               → cooperativas de reciclagem
                               → SENSOR 2 (falha-segura)
                                     ├── seguro → NF em BYPASS
                                     └── partícula minúscula → NF ATIVA
```

- **Eventos de carga:** faixa normal 0,02–0,12 ppm; de vez em quando um evento
  eleva o afluente (1,5–12 ppm) por 2–6 min.
- **Estoque e cooperativas:** lote de 50 g fechado → despacho + card "Reciclagem".
- **Falhas e manutenções** acontecem e se resolvem sozinhas, gerando alarmes.

### Gráficos

- **Principal (10 min):** afluente (área) × saída (linha), eixo em ppm, limites e rótulos de tempo.
- **Conformidade por ETA:** verde dentro do limite / vermelho fora.
- **Sessão:** disponibilidade, energia economizada (kWh), plástico recuperado, acionamentos de NF.

### Controle de operação

- Ordens de manutenção por ETA (🔧 enviar / ↺ restaurar);
- Histórico dos últimos 8 alarmes com horário;
- Registro manual de leitura; a rede também registra sozinha a cada 4 min e no fim de cada evento de NF.

---

## Notas técnicas

- **Motor contínuo:** tick de 2 s com passeio aleatório; cada ETA executa a máquina a cada tick.
- **Energia:** laser 0,04 kW sempre ligado; FAD 0,64 kW por m³/h só no desvio;
  NF 2,45 kW por m³/h em bypass a 5%. Referência ≈ 53 kW (tudo ligado 24 h).
- **RLS:** usuários leem/editam só o próprio perfil; elevação de `role` bloqueada
  por política de UPDATE; exclusões exigem `is_superadmin()`.
- **BFF:** `GET/POST /api/admin/users` e `PATCH/DELETE /api/admin/users/:id`.
  Local via `server/index.js`; Vercel via `api/[...path].js`.
- **Readings:** guardam cenário (NF ativa ou não), ppm de entrada/saída, massa
  recuperada, economia e se alguma NF esteve ativa.
- **Segurança:** `.env` está no `.gitignore`. Se uma `sb_secret_` vazar, troque-a no painel.

---

## Solução de problemas

| Sintoma | Causa / solução |
|---|---|
| "email ou senha incorretos" ao criar conta | Confirmação de e-mail ativa. Desligue em *Authentication → Sign In / Providers → Email → Confirm email*, ou use `node --env-file=server/.env server/confirm-email.mjs EMAIL`. |
| `EADDRINUSE` / "Port 5173 in use" | Já existe instância rodando. Encerre-a (Ctrl+C) antes de `dev:all`. |
| "Cannot GET /" | Você abriu a porta :3333 (BFF). O app está em :5173. |
| `/api/health` falha na Vercel | Faltam `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` nas env vars da função. |
| `EBUSY`/`EPERM` no esbuild (OneDrive) | `node_modules` fora do OneDrive via junction — veja o histórico do projeto. |
| Quero ver usuários / confirmar e-mail | `node --env-file=server/.env server/check-users.mjs` e `server/confirm-email.mjs EMAIL`. |

---

## Links úteis

- [Prompt para o Copilot publicar na Vercel](docs/PROMPT_COPILOT.md)
- [Schema Supabase](supabase/schema.sql)
- [Supabase Dashboard](https://supabase.com/dashboard)
