# Oinbox - Real Estate Operating System

Oinbox é um "Sistema Operacional Imobiliário" completo, desenhado para centralizar a operação de corretores e imobiliárias. A plataforma une **CRM**, **Inbox Unificado** (Omnichannel) e **Marketing**, tudo potencializado por Inteligência Artificial Generativa (Google Gemini).

## 🚀 Stack Tecnológico

O projeto utiliza uma arquitetura moderna, serverless e de baixo custo (Edge Computing):

*   **Frontend:** React 19, Tailwind CSS, Lucide Icons.
*   **AI Core:** Google Gemini API (`gemini-2.5-flash` e `gemini-2.5-flash-lite`).
*   **Backend (Serverless):** Cloudflare Workers.
*   **Banco de Dados:** Cloudflare D1 (SQLite na Edge).
*   **Storage:** Cloudflare R2 (Armazenamento de Contratos e Fotos).
*   **Build Tool:** Vite.

---

## 💎 Funcionalidades Principais

### 1. Inteligência Artificial (Agentic AI)
*   **Flash Agent:** Respostas ultra-rápidas no chat simulando o corretor.
*   **Visão Computacional:** Upload de foto do imóvel -> A IA detecta características (piso, acabamento) e preenche o cadastro.
*   **Voice-to-CRM:** Transcrição de áudios de visita transformados em dados estruturados no CRM.
*   **Consultor de Mercado:** Chatbot especialista em direito e economia imobiliária.

### 2. Inbox Unificado & CRM
*   **Omnichannel:** Gestão de WhatsApp, Instagram e Portais em uma única tela.
*   **Lead Scoring:** Termômetro automático que pontua leads quentes.
*   **Pipeline Visual:** Kanban (Novo, Visita, Proposta, Fechado).

### 3. Ferramentas de Venda (Sales Enablement)
*   **Simulador Financeiro:** Cálculo de parcelas SAC/Price conectado a taxas de mercado (Selic/IPCA).
*   **Gerador de Contratos:** Criação de PDFs jurídicos automáticos.
*   **Marketing Studio:** Editor visual para criar Stories/Posts de imóveis vendidos ou oportunidades.
*   **Campanhas:** "AI Matchmaker" que cruza imóveis com a base de leads para disparos precisos.

### 4. Gestão SaaS (Super Admin)
*   Dashboard exclusivo para o dono da plataforma gerenciar Inquilinos (Tenants), MRR e planos.

---

## 🛠️ Instalação e Configuração

### Pré-requisitos
*   Node.js 18+
*   Conta na Cloudflare (para Backend/DB)
*   Chave de API do Google AI Studio (Gemini)

### Passo 1: Clone e Instalação
```bash
git clone https://github.com/seu-usuario/oconnector.git
cd oconnector
npm install
```

### Passo 2: Configuração de Ambiente
Crie um arquivo `.env` na raiz baseado no exemplo:
```env
API_KEY="sua_chave_gemini_aqui"
REACT_APP_API_URL="http://localhost:8787" # Para dev local
```

### Passo 3: Configuração do Backend (Cloudflare)
Instale o Wrangler (CLI da Cloudflare) e configure o banco D1:
```bash
npm install -g wrangler
wrangler login

# Criar banco de dados
wrangler d1 create oconnector-db

# Executar esquema SQL inicial
wrangler d1 execute oconnector-db --file=./backend/schema.sql --local
```

### Passo 4: Executar Localmente
Para rodar Frontend e Backend simultaneamente:
```bash
npm run dev
```
O Frontend rodará em `http://localhost:5173` e o Backend em `http://localhost:8787`.

---

## 📦 Estrutura do Projeto

```text
/oconnector
├── /backend            # Cloudflare Worker & SQL Schema
│   ├── worker.js       # API REST Serverless
│   └── schema.sql      # Definição do Banco de Dados
├── /src
│   ├── /components     # UI Components (Inbox, CRM, Tools...)
│   ├── /services       # Integrações (Gemini, API, Stripe)
│   └── /types          # Definições TypeScript
├── wrangler.toml       # Configuração Cloudflare
└── vite.config.ts      # Configuração do Build
```

## 🔒 Segurança

*   A plataforma utiliza autenticação simulada para demonstração, pronta para integração com Auth0, Clerk ou Firebase.
*   Chaves de API críticas (Stripe, Cloudflare) devem ficar apenas no Backend (Worker), nunca no Frontend.

## 📄 Licença

Este projeto é proprietário. Todos os direitos reservados a Euimob Tecnologia.
