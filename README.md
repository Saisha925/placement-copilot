# 🎯 Placement Copilot AI

**An agentic, multi-agent AI platform that orchestrates a team of specialized AI agents to help students prepare for campus placements — from resume analysis to mock interviews to 30/60/90 day study plans.**

---

## 🚀 Live Demo

> Run locally — see setup instructions below.

---

## 📸 Overview

Placement Copilot AI is a full-stack, production-grade AI platform built around the **agentic AI** paradigm. A central Supervisor Agent dynamically orchestrates 8 specialized sub-agents, each responsible for a different domain of placement preparation. The system is context-aware — every agent reads from and writes to a shared `PlacementState`, so downstream agents always have full context from upstream results.

---

## ✨ Features

### 🤖 Multi-Agent Orchestration
- **Hybrid Supervisor Pattern** — deterministic rule-based routing with LLM fallback, powered by **LangGraph 1.2.2**
- Shared `PlacementState` TypedDict passed across all agents — zero redundant LLM calls
- Feedback loop: if interview scores drop, the Career Planner Agent automatically revises the study plan

### 🧠 Specialized AI Agents
| Agent | Responsibility |
|---|---|
| **Resume Agent** | PDF parsing, ATS scoring, bullet-point rewrites |
| **Skill Gap Agent** | Semantic skill matching via RAG, categorised gap analysis |
| **Career Planner Agent** | Personalised 30/60/90 day roadmap (Llama 70B) |
| **DSA Agent** | Daily LeetCode plan, urgency-aware scheduling, duplicate guard |
| **Project Recommender** | Portfolio project suggestions tailored to skill gaps |
| **Interview Agent** | Multi-round mock interviews (Technical / HR / System Design) |
| **CS Fundamentals Agent** | OS, DBMS, CN quizzes with vocal answers |
| **System Design Agent** | Architecture challenges with AI evaluation |

### 📚 RAG Pipeline
- Knowledge base ingested into **Qdrant Cloud** (cosine similarity, 384-dim embeddings via `all-MiniLM-L6-v2`)
- Covers OS, DBMS, Computer Networks, OOPs, ML algorithms
- Used by the Skill Gap Agent and Interview Agent for verified, accurate content

### 🎤 Speech-to-Text Interview Practice
- Record answers directly in the browser via **MediaRecorder API**
- Transcribed via **Groq Whisper** (`whisper-large-v3`)
- Evaluated for technical accuracy **and** communication quality (clarity, confidence, filler words)

### 📊 Readiness Score
- Deterministic, weighted scoring across 7 dimensions — never calls an LLM
- Resume (15%) · DSA (20%) · CS Fundamentals (15%) · System Design (15%) · Mock Interviews (15%) · Communication (10%) · Projects (10%)
- Updates in real-time as agents complete

### 💾 Persistent State
- Full `agent_state` persisted to **Supabase** after every agent node
- Resumable sessions — pick up exactly where you left off

---

## 🛠️ Tech Stack

### Frontend
| | |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui, Radix UI |
| Animations | Framer Motion |
| Auth | Supabase SSR |

### Backend
| | |
|---|---|
| Framework | FastAPI |
| Language | Python |
| Agent Orchestration | LangGraph 1.2.2 (StateGraph) |
| LLM Provider | Groq API |
| Default Model | `llama-3.1-8b-instant` |
| Complex Planning | `llama-3.3-70b-versatile` |
| STT | Groq Whisper (`whisper-large-v3`) |

### Infrastructure
| | |
|---|---|
| Auth + DB | Supabase |
| Vector DB | Qdrant Cloud |
| Embeddings | `all-MiniLM-L6-v2` (HuggingFace Inference API) |
| PDF Parsing | pdfplumber |

---

## 🏗️ Architecture

```
User Request
     │
     ▼
┌─────────────────────────────────────┐
│           Supervisor Agent           │
│   (LangGraph StateGraph Orchestrator)│
│                                     │
│  1. Rule-based routing (priority)   │
│  2. LLM fallback for edge cases     │
│  3. Readiness score on every pass   │
└──────────────┬──────────────────────┘
               │  PlacementState (shared)
    ┌──────────┼──────────────────────┐
    ▼          ▼          ▼           ▼
Resume     Skill Gap   Career      DSA
Agent      Agent       Planner     Agent
               │       (70B)
          RAG (Qdrant)
               │
    ┌──────────┼──────────────────────┐
    ▼          ▼          ▼           ▼
Project   Interview  CS Funds   System
Recomm.   Agent      Agent      Design
          (Whisper             Agent
           STT)
               │
               ▼
          Aggregate Node
          (Readiness Score)
               │
               ▼
          Supabase (persist state)
```

---

## 📁 Project Structure

```
placement-copilot/
├── backend/
│   ├── agents/              # 8 specialized AI agents
│   │   ├── resume_agent.py
│   │   ├── skill_gap_agent.py
│   │   ├── career_planner_agent.py
│   │   ├── dsa_agent.py
│   │   ├── interview_agent.py
│   │   ├── project_recommender.py
│   │   ├── cs_fundamentals_agent.py
│   │   └── system_design_agent.py
│   ├── graph/               # LangGraph orchestration
│   │   ├── workflow.py      # StateGraph + _safe_route
│   │   ├── supervisor.py    # Hybrid routing logic
│   │   ├── nodes.py         # Agent node wrappers
│   │   └── state.py         # PlacementState TypedDict
│   ├── core/
│   │   ├── readiness.py     # Deterministic scoring
│   │   ├── state_manager.py # Supabase persistence
│   │   ├── llm.py           # Groq provider
│   │   └── database.py      # Supabase client
│   ├── api/routes/          # FastAPI endpoints
│   ├── knowledge_base/      # RAG source documents
│   │   ├── os/, dbms/, cn/, oops/, ml/
│   ├── tools/
│   │   └── rag_tools.py     # Qdrant search tool
│   └── scripts/
│       └── ingest_rag.py    # Knowledge base ingestion
└── frontend/
    ├── app/
    │   ├── (auth)/          # Login, Signup
    │   └── (main)/          # All dashboard pages
    │       ├── copilot/     # Main orchestrator UI
    │       ├── career-plan/ # 30/60/90 day plan view
    │       ├── resume/      # Resume analyzer
    │       ├── dsa/         # DSA mentor + tracker
    │       ├── interview/   # Mock interview sessions
    │       ├── projects/    # Portfolio recommender
    │       ├── core-concepts/ # CS fundamentals quiz
    │       └── system-design/ # Architecture practice
    ├── components/
    │   ├── shared/          # Navbar, PageTransition
    │   └── ui/              # shadcn + custom components
    └── lib/
        ├── api.ts           # All API calls
        ├── supabase.ts      # Browser client
        └── supabase-server.ts # Server client
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js 20+
- Python 3.11+
- A [Supabase](https://supabase.com) project
- A [Qdrant Cloud](https://cloud.qdrant.io) cluster
- A [Groq](https://console.groq.com) API key
- A [HuggingFace](https://huggingface.co) token (for embeddings)

### 1. Clone the repo

```bash
git clone https://github.com/Saisha925/placement-copilot
cd placement-copilot
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate   # Windows
# source venv/bin/activate  # Mac/Linux

pip install -r requirements.txt
```

Create `backend/.env`:
```env
GROQ_API_KEY=your_groq_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_api_key
HF_TOKEN=your_huggingface_token
```

Ingest the knowledge base into Qdrant:
```bash
python scripts/ingest_rag.py
```

Start the backend:
```bash
uvicorn index:app --reload --port 8000
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Start the frontend:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Supabase tables

Create the following tables in your Supabase project:

```sql
-- Agent state persistence
create table agent_state (
  user_id uuid primary key,
  state jsonb,
  last_agent text,
  iteration_count int,
  updated_at timestamptz default now()
);

-- DSA tracking
create table dsa_problems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  topic text,
  problem_name text,
  difficulty text,
  platform text,
  time_taken_mins int,
  notes text,
  mistakes text,
  is_revision boolean default false,
  marked_for_revision boolean default false,
  created_at timestamptz default now()
);

create table dsa_progress (
  user_id uuid primary key,
  total_solved int,
  easy_solved int,
  medium_solved int,
  hard_solved int,
  topic_scores jsonb,
  weak_topics jsonb,
  overall_score int,
  daily_plan jsonb,
  last_updated timestamptz
);

-- Interview history
create table mock_interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  target_role text,
  round_type text,
  questions_and_answers jsonb,
  overall_score int,
  feedback text,
  created_at timestamptz default now()
);

-- Project recommendations
create table project_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text,
  description text,
  tech_stack jsonb,
  step_by_step jsonb,
  skills_addressed jsonb,
  difficulty text,
  estimated_hours int,
  why_this_project text,
  status text default 'suggested',
  created_at timestamptz default now()
);

-- CS fundamentals history
create table cs_fundamentals_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  subject text,
  topic text,
  question text,
  answer text,
  score int,
  feedback text,
  missing_points jsonb,
  created_at timestamptz default now()
);

-- Agent run logs
create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  agent_name text,
  duration_ms int,
  created_at timestamptz default now()
);
```

---

## 🗺️ Roadmap

- [ ] Communication Skills Coach agent
- [ ] System Design Mentor with diagram generation
- [ ] Company-Specific Interview Prep (Amazon, Google, Microsoft)
- [ ] Streak tracking and gamification
- [ ] Email digest of daily DSA plan
- [ ] Mobile app (React Native)

---

## 👩‍💻 Author

**Saisha Bhasin** — B.Tech AI/ML, IGDTUW Delhi  
[GitHub](https://github.com/Saisha925) · [LinkedIn](https://www.linkedin.com/in/saishabhasin925)

---
