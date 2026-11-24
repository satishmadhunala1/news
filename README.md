# Personal AI News Assistant

Personal news aggregator with a Next.js dashboard and Telegram bot.

Collects news from GNews, NewsAPI, and Google News RSS, optionally summarizes with Gemini, stores in MongoDB Atlas, and delivers via web + Telegram.

## Structure

```
newsbot/
├── frontend/     Next.js App Router (port 3000)
├── backend/      Express API + scheduler (port 5000)
├── README.md
└── .gitignore
```

## Setup

### 1. Backend env

Copy `backend/.env.example` to `backend/.env` and fill keys (already created locally).

### 2. Frontend env

`frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
INTERNAL_API_SECRET=same-as-backend
BACKEND_URL=http://localhost:5000/api
```

### 3. Install & run

```powershell
# Terminal 1 — API
cd C:\Users\Satish\Desktop\newsbot\backend
npm install
npm run dev

# Terminal 2 — Dashboard
cd C:\Users\Satish\Desktop\newsbot\frontend
npm install
npm run dev

# Optional production scheduler (separate process)
cd C:\Users\Satish\Desktop\newsbot\backend
npm run scheduler
```

### Useful scripts

```powershell
cd backend
npm run test:providers          # smoke-test GNews / NewsAPI / RSS
```

Manual fetch (PowerShell):

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/news/fetch -Headers @{ 'x-api-secret' = 'YOUR_SECRET'; 'Content-Type' = 'application/json' } -Body '{}'
```

## API overview

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/health` | Health + provider flags |
| GET | `/api/news` | List + filters |
| GET | `/api/news/latest` | Latest |
| GET | `/api/news/important` | High importance |
| GET | `/api/news/category/:category` | By category |
| GET | `/api/news/location/:location` | By location |
| GET | `/api/news/search?q=` | Search |
| POST | `/api/news/fetch` | Requires `x-api-secret` |
| GET/PUT | `/api/preferences` | User settings |
| GET | `/api/notifications/history` | Telegram log |
| POST | `/api/notifications/test` | Requires `x-api-secret` |

## Security notes

- Never commit `.env` / `.env.local`
- Browser code never receives API keys
- Sensitive actions use Next.js server proxies + `INTERNAL_API_SECRET`
- Rotate keys if they were shared in chat

## Default schedules (Asia/Kolkata)

- 09:00 Morning briefing
- 13:00 Afternoon updates
- 19:00 Evening briefing

Change times in Dashboard → Settings.
