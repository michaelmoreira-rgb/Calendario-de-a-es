# Calendário de Ações - Fullstack TypeScript

Este é um sistema de gestão de eventos e ações corporativas, com funcionalidades de aprovação hierárquica (Coordenador -> Supervisor -> Admin), integração com Google Agenda via Service Accounts, autenticação Google OAuth2 e análise de dados com IA (Google Gemini).

## 🚀 Tecnologias

- **Frontend:** React 18, Vite, TailwindCSS, Material UI, React Query, Recharts, FullCalendar.
- **Backend:** Node.js, Express, Socket.io (Notificações em tempo real).
- **Database:** PostgreSQL (via Prisma ORM).
- **Queue:** Redis + Bull (para envio de e-mails assíncronos).
- **AI:** Google Gemini API.
- **Infra:** Docker & Docker Compose.

---

## 📋 Pré-requisitos

Para rodar este projeto externamente, você precisará ter instalado:

- [Node.js](https://nodejs.org/) (v18 ou superior)
- [Docker](https://www.docker.com/) e Docker Compose
- Uma conta no [Google Cloud Platform](https://console.cloud.google.com/)

---

## ⚙️ Configuração do Ambiente

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/calendario-acoes.git
   cd calendario-acoes
   ```

2. **Configure as Variáveis de Ambiente:**
   Copie o arquivo `.env` (que já foi criado na raiz) ou use o exemplo:
   ```bash
   cp .env.example .env
   ```
   *Edite o arquivo `.env` e preencha as chaves obrigatórias (veja a seção "Configuração Google" abaixo).*

---

## 🔧 Como Rodar (Método Rápido: Docker)

A maneira mais fácil de rodar todo o stack (Frontend, Backend, Banco e Redis) é usando o Docker Compose.

1. **Inicie os containers:**
   ```bash
   npm run docker:up
   # ou
   docker-compose up --build -d
   ```

2. **Execute as Migrations e Seed (Popular Banco):**
   ```bash
   npm run docker:migrate
   npm run docker:seed
   ```

3. **Acesse a aplicação:**
   - Frontend: [http://localhost](http://localhost) (Porta 80)
   - Backend API: [http://localhost:3000](http://localhost:3000)
   - Banco de Dados: Porta 5432
   - Redis: Porta 6379

---

## 💻 Como Rodar (Método Manual / Desenvolvimento Local)

Se preferir rodar Node.js localmente e usar Docker apenas para os serviços de infraestrutura (Postgres/Redis):

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Suba apenas o Banco e Redis via Docker:**
   ```bash
   docker-compose up -d postgres redis
   ```

3. **Configure o Prisma:**
   Certifique-se que o `DATABASE_URL` no `.env` aponta para `localhost`.
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. **Inicie o Servidor Backend (Terminal 1):**
   ```bash
   npm run server
   ```

5. **Inicie o Frontend Vite (Terminal 2):**
   ```bash
   npm run dev
   ```
   Acesse [http://localhost:5173](http://localhost:5173).

---

## ☁️ Configuração Google Cloud (Obrigatório)

Para que o Login com Google e a Sincronização de Calendário funcionem:

### 1. OAuth 2.0 (Login)
1. Vá ao [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um projeto.
3. Vá em **APIs & Services > Credentials**.
4. Crie credenciais do tipo **OAuth 2.0 Client ID**.
5. Configure as **Authorized redirect URIs** para: `http://localhost:3000/api/auth/google/callback`.
6. Copie o `Client ID` e `Client Secret` para o seu `.env`.

### 2. Service Account (Calendário)
1. No mesmo projeto, vá em **IAM & Admin > Service Accounts**.
2. Crie uma nova Service Account.
3. Crie uma chave JSON para esta conta e baixe o arquivo.
4. Abra o JSON, copie o `client_email` e a `private_key` para o `.env`.
   - **Nota:** A `GOOGLE_PRIVATE_KEY` no `.env` deve ser uma linha única contendo os caracteres `\n`.
5. Habilite a **Google Calendar API** na biblioteca de APIs.
6. **Importante:** Para testar, compartilhe um calendário Google específico com o email da Service Account (`client_email`), dando permissão de "Fazer alterações nos eventos".

### 3. Gemini AI
1. Gere uma chave em [Google AI Studio](https://aistudio.google.com/).
2. Cole em `API_KEY` no `.env`.

---

## 🛠️ Comandos Úteis

- **Logs do Docker:** `npm run docker:logs`
- **Parar Docker:** `npm run docker:down`
- **Lint:** `npm run lint`

## 📂 Estrutura do Projeto

- `/components` - Componentes React Reutilizáveis UI
- `/context` - Context API (Auth, Notifications)
- `/pages` - Telas da Aplicação
- `/server` - Backend Express
  - `/routes` - Rotas da API
  - `/services` - Lógica de Negócio (Google, Email)
  - `/prisma` - Schema do Banco de Dados
- `/types` - Tipos TypeScript Compartilhados
