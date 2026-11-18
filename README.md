# PRISMA

**P**rocesso de **R**emoção **I**nteligente e **S**ustentável de **M**icroplásticos **A**quáticos — app de monitoramento (SCADA/IoT) de uma estação de tratamento com 4 estágios.

## Arquitetura

```
├── supabase/schema.sql      ← rode no SQL Editor (tabelas, RLS, trigger, bucket)
├── server/                  ← BFF Node (rotas SuperAdmin c/ service_role)
├── src/
│   ├── context/             ← Auth, Theme (dark/light) e Process (motor da planta)
│   ├── components/          ← AppLayout, Sidebar, BottomNav, Units, StatCard, AlarmBanner
│   └── pages/               ← Login, Dashboard, Controle (Simulator), History, Profile, Admin
└── .env                     ← copie de .env.example
```

| Porta | O que é | O que vê |
|---|---|---|
| `localhost:5173` | 🎨 App (frontend) | O PRISMA completo (login, dashboard...) |
| `localhost:3333` | ⚙️ BFF (API) | Só endpoints — abrir no navegador mostra página explicativa |

## Como rodar (resumo de 1 linha)

```bash
npm run dev:all      # sobe frontend + BFF juntos em um único terminal
```

Comandos individuais (se preferir): `npm run dev` (só web) e `npm run server` (só BFF).

## Passo a passo de implantação (do zero)

### 1. Criar o projeto no Supabase
1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Preencha: **Name** `prisma`, **Database Password** (guarde, não usamos no app), **Region** `South America (São Paulo)`.
3. Aguarde ~2 min até o painel carregar.

### 2. Rodar o schema (cria as tabelas)
1. No menu lateral do projeto, abra o **SQL Editor**.
2. **New query** → cole **todo** o conteúdo de `supabase/schema.sql` → **Run**.
3. "Success. No rows returned" = sucesso. Cria: tabela `profiles` (com RLS), tabela `readings`, trigger que cria o perfil a cada cadastro e o **bucket `avatars`** (público).

### 3. Pegar as chaves da API
Em **Project Settings → API / API Keys**, copie:
- **Project URL** — se não aparecer, monte você mesmo: o código após `/project/` na barra de endereço é o subdomínio → `https://SEUCODIGO.supabase.co`
- **anon public** — no formato novo começa com `sb_publishable_...`
- **service_role** — no formato novo começa com `sb_secret_...` ⚠️ *secreta! Nunca exponha no frontend nem publique.*

### 4. Variáveis de ambiente
```bash
copy .env.example .env           # Windows (no Mac/Linux: cp)
copy server\.env.example server\.env
```
| Arquivo | Variável | Valor |
|---|---|---|
| `.env` | `VITE_SUPABASE_URL` | Project URL |
| `.env` | `VITE_SUPABASE_ANON_KEY` | anon / `sb_publishable_...` |
| `.env` | `VITE_API_URL` | `http://localhost:3333` |
| `server\.env` | `SUPABASE_URL` | Project URL (a mesma) |
| `server\.env` | `SUPABASE_SERVICE_ROLE_KEY` | service_role / `sb_secret_...` |
| `server\.env` | `PORT` | `3333` |

> ⚠️ O `.env` só é lido na inicialização — depois de editar, **reinicie** o `dev:all`.

### 5. Instalar dependências
```bash
npm install                  # raiz (Vite + React + Tailwind)
npm install --prefix server  # BFF (Express + Supabase admin)
```

### 6. Rodar
```bash
npm run dev:all
```
- Frontend → http://localhost:5173
- BFF → http://localhost:3333 (health: `/api/health`)

### 7. Criar a primeira conta
1. No app → aba **Criar conta** → cadastre com **um e-mail real seu** e uma senha (6+ caracteres).
2. Se aparecer "email ou senha incorretos" logo após criar, veja a seção **Confirmação de e-mail** abaixo.

### 8. Promover o primeiro SuperAdmin
No **SQL Editor** do Supabase (troque o e-mail pelo que você cadastrou):
```sql
update public.profiles set role = 'superadmin'
where id = (select id from auth.users where email = 'voce@email.com');
```
Relogue no app → o menu **Gestão SuperAdmin** aparece na Sidebar.

## Solução de problemas (troubleshooting)

### "email ou senha incorretos" logo depois de criar a conta
A conta existe, mas o Supabase exige **confirmação de e-mail** antes de liberar o login (a mensagem dele é genérica/enganosa). Duas soluções:

**A) Desativar a confirmação (recomendado em dev):**
- Supabase → **Authentication** → **Sign In / Providers** → **Email** → desligue **"Confirm email"** → Save.

**B) Confirmar a conta manualmente** (scripts prontos em `server/`):
```bash
# ver usuários cadastrados e se estão confirmados
node --env-file=server/.env server/check-users.mjs

# confirmar o e-mail de um usuário
node --env-file=server/.env server/confirm-email.mjs email@exemplo.com
```

### "Port 5173 is in use" ou "EADDRINUSE: 3333"
Já existe outra instância rodando em algum terminal (ou em segundo plano). Feche ela (Ctrl+C) antes de rodar `dev:all` de novo.

### "Cannot GET /" no navegador
Você abriu a porta do **backend** (`:3333`). O app fica em **http://localhost:5173**.

### OneDrive trava a instalação (`EBUSY` / `EPERM` no esbuild.exe)
O OneDrive sincroniza o `node_modules` e trava executáveis durante o sync. Solução aplicada neste projeto: os `node_modules` ficam **fora do OneDrive** e são vinculados por junction:
```
node_modules          → C:\Users\User\.prisma-deps\node_modules
server\node_modules   → C:\Users\User\.prisma-deps-server\node_modules
```
Para recriar em outra máquina:
```bash
mkdir C:\Users\User\.prisma-deps\node_modules
cmd /c mklink /J node_modules C:\Users\User\.prisma-deps\node_modules
mkdir C:\Users\User\.prisma-deps-server\node_modules
cmd /c mklink /J server\node_modules C:\Users\User\.prisma-deps-server\node_modules
```

## A planta · rede com 5 ETAs, cada uma com a máquina PRISMA completa

O painel monitora uma operação **contínua** (estilo SCADA/HMI) de uma **rede com 5 ETAs**.
**Todas as unidades possuem a máquina PRISMA completa** — sensor de entrada, separação FAD
com reciclagem, sensor de saída e nanofiltração (em bypass ou ativa):

| Unidade | Bairro | Vazão nominal | Sensibilidade do ponto de captação |
|---|---|---|---|
| `ETA-01` | Central | 5,0 m³/h | 1,00× |
| `ETA-02` | Norte | 4,0 m³/h | 1,15× |
| `ETA-03` | Leste | 3,5 m³/h | 0,90× |
| `ETA-04` | Sul | 2,5 m³/h | 1,05× |
| `ETA-05` | Poente | 2,0 m³/h | 1,20× |

### Arquitetura conceitual do PRISMA (o que o motor simula)

1. **Sensor 1 (entrada):** um sensor a laser vigia a água que chega a cada ETA.
   - Plástico **não detectado** (afluente ≤ 0,05 ppm) → água passa **direto** (bypass),
     sem gastar energia de tratamento;
   - Plástico **detectado** (> 0,05 ppm) → a água é **desviada** para a separação:
     injeção de aglutinante + microbolhas de ar fazem o plástico boiar (separação FAD),
     que é retirado e enviado a **cooperativas de reciclagem**.
2. **Sensor 2 (saída · lógica falha-segura):** vigia a água pós-limpeza.
   - Água **100% segura** (residual ≤ 0,15 ppm) → o filtro pesado de alta pressão
     (nanofiltração) permanece **em BYPASS, desligado**;
   - Passou **alguma partícula minúscula** (residual > 0,15 ppm = 3× o limite de consumo
     humano) → a **nanofiltração da própria ETA liga automaticamente** e volta ao bypass
     quando o residual cai (< 0,08 ppm — histerese, sem oscilar no limiar).
3. **O diferencial:** ao não deixar a filtragem de alta pressão ligada 24 h sem
   necessidade, o PRISMA garante água segura e projeta **economia de mais de 70%**
   na energia das estações (no painel, o KPI "Economia de energia" calcula isso ao vivo).

```
Captação ──► SENSOR 1 (laser) ──► limpo? → BYPASS direto (economia)
                  │
                  └── plástico? → DESVIO → separação FAD (aglutinante + microbolhas)
                              → plástico retirado → cooperativas de reciclagem
                              → SENSOR 2 (falha-segura)
                                    ├── água 100% segura → NF em BYPASS
                                    └── passou partícula minúscula → NF ATIVA
```

- **Eventos de carga:** a captação opera numa faixa normal (0,02–0,12 ppm) e, de vez em
  quando, um evento eleva o afluente (1,5–12 ppm) por 2–6 min — depois volta ao normal.
  É nesses eventos que as rotas mudam (bypass → desvio FAD) e, se a limpeza comum não
  der conta, a NF aciona sozinha;
- **Estoque e cooperativas:** o plástico boiado fica em estoque e, ao fechar lote
  (50 g), é despachado para as cooperativas de reciclagem — alarme de despacho +
  card "Reciclagem" no painel (capturado / em estoque / entregue);
- **Falhas e manutenções** acontecem e se resolvem sozinhas, gerando alarmes.

### Gráficos e estatísticas
- **Gráfico principal (10 min):** afluente (área preenchida) × saída (linha) com grade,
  eixo em ppm, rótulos de tempo (-10 min / -5 min / agora) e linha tracejada do limite;
- **Barra de conformidade por ETA:** onde a saída está em relação ao limite (verde
  dentro / vermelho fora, marcador do limite no meio da escala);
- **Gerais (sessão):** disponibilidade, energia economizada (kWh), plástico recuperado
  e nº de acionamentos de NF.

### Controle de operação
- **Ordens de manutenção** por ETA (botão no rodapé do card: 🔧 enviar / ↺ restaurar);
- **Histórico de alarmes** (últimos 8, com horário);
- **Registro manual** de leitura agregada; a rede também registra sozinha a cada 4 min
  e no fim de cada evento de NF.

## Funcionalidades

| Requisito | Onde |
|---|---|
| Login/Cadastro (Supabase Auth) | `src/pages/Login.jsx` |
| Perfis + foto (Supabase Storage) | `src/pages/Profile.jsx` |
| SuperAdmin gerencia usuários | `src/pages/Admin.jsx` + `server/index.js` (BFF) |
| Rede com 5 ETAs ao vivo (HMI) | `src/pages/Dashboard.jsx` + `components/Units.jsx` |
| Motor do pitch (Sensor 1 → desvio FAD → Sensor 2 → NF bypass/ativa) | `src/context/ProcessContext.jsx` |
| Gráfico da rede (10 min, eixo/limite/legenda) | `components/NetworkChart.jsx` |
| Controle de operação (manutenção + alarmes + registros) | `src/pages/Simulator.jsx` |
| Relatórios por período (24h/7d/30d/tudo) + exportação CSV | `src/pages/Reports.jsx` |
| Configurações (tema, banner de alarmes, especificação) | `src/pages/Configs.jsx` |
| Histórico de leituras | `src/pages/History.jsx` (tabela `readings`) |
| Dark/Light mode | `ThemeContext.jsx` (transição suave) |
| Bottom Menu + Sidebar | `BottomNav.jsx` / `Sidebar.jsx` |

## Notas técnicas

- **Motor contínuo:** tick de 2 s — carga da bacia por passeio aleatório com eventos
  de carga ocasionais; cada ETA executa a máquina PRISMA a cada tick.
- **Modelo de energia:** sensores a laser (0,04 kW) sempre ligados; separação FAD
  (0,64 kW por m³/h) só quando a água é desviada; nanofiltração (2,45 kW por m³/h)
  em bypass a 5% do consumo nominal. Referência = tudo ligado 24 h (~53 kW);
  a economia exibida é a diferença para o consumo real.
- **RLS:** usuários só leem/editam o próprio perfil; a elevação de `role` é bloqueada
  pela política de UPDATE; exclusões exigem `is_superadmin()`.
- **BFF:** criar/excluir usuários exige a `service_role key` — essas ações passam
  pelo servidor Node (valida JWT + role). Rotas: `GET/POST /api/admin/users`,
  `PATCH/DELETE /api/admin/users/:id`.
- Cada registro em `readings` guarda: cenário (NF ativa na rede ou não), ppm médio
  de entrada/saída, massa recuperada, economia e se alguma NF estava ativa.
- **Segurança:** nunca versionar `.env` (está no `.gitignore`). Se a `sb_secret_`
  vazar, troque-a no painel do Supabase.
