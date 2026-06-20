# ProjectFlow — Free Project Management App

Zero-cost stack: React + Vite + Tailwind → Vercel | Supabase (DB + Auth + Edge) | Cloudflare CDN

---

## Setup in 4 steps

### 1. Create your Supabase project
1. Go to supabase.com → New project
2. Open SQL Editor → paste supabase-schema.sql → Run
3. Go to Settings → API → copy Project URL and anon key

### 2. Configure environment
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

### 3. Run locally
npm install
npm run dev
# Open http://localhost:5173

### 4. Deploy to Vercel
# Connect GitHub repo on vercel.com for auto-deploy
# Add env vars in: Project → Settings → Environment Variables

---

## Project structure

src/
├── components/
│   ├── layout/Sidebar.jsx        Nav + project list
│   └── tasks/
│       ├── KanbanBoard.jsx       Drag-and-drop board
│       ├── TaskCard.jsx          Task card with priority + due date
│       └── TaskModal.jsx         Edit task modal
├── pages/
│   ├── AuthPage.jsx              Login / signup
│   ├── DashboardPage.jsx         Project overview
│   └── ProjectPage.jsx           Kanban view per project
├── store/
│   ├── authStore.js              Zustand auth state
│   ├── projectStore.js           Projects CRUD
│   └── taskStore.js              Tasks CRUD + move
└── lib/supabase.js               Supabase client

---

## Features
- Email + Google + GitHub login via Supabase Auth
- Multiple projects per user
- Kanban board: To do / In progress / In review / Done
- Drag-and-drop between columns
- Task details: title, description, priority, status, due date
- Inline task creation per column
- Overdue date highlighting
- Mobile-responsive sidebar
- RLS enforced — each user sees only their own data

---

## Free tier headroom (2026)
Vercel Hobby      100 GB bandwidth    Static CDN, no concurrent cap
Supabase DB       500 MB storage      Fine for thousands of tasks
Supabase Auth     50,000 MAU          Fine for early growth
Supabase Realtime 200 concurrent      OK without live sync feature
Bandwidth         5 GB/month          Add Cloudflare CDN to extend

Tip: Add Cloudflare (free) in front of your Vercel domain — takes 5 min,
absorbs traffic spikes, and extends your effective bandwidth significantly.

---

## What to build next
- [ ] Team members and project sharing
- [ ] Comments on tasks
- [ ] File attachments (Supabase Storage — 1 GB free)
- [ ] My Tasks view across all projects
- [ ] Notifications
