# BBB Library 📚

> Interactive digital archive for **Broke Bibliophiles Bangalore (BBB)** inspired by the Criterion Closet.

---

## 🌟 Project Overview

**BBB Library** is a production-grade digital archive and virtual shelf experience created for Broke Bibliophiles Bangalore. It captures the rich history of book discussions, recommendations, and community interactions held across monthly BBB meetups.

The initial architecture centers on an interactive virtual bookshelf (Criterion Closet experience) enabling users to search, filter, select, 3D rotate, and explore books discussed at BBB.

---

## 🏗️ Monorepo Folder Structure

```
bbb-library/
├── .github/              # CI/CD Workflows & GitHub Configurations
│   └── workflows/
│       └── ci.yml
├── assets/               # Branding assets, 3D models, textures
├── backend/              # Python FastAPI Core Application
│   ├── app/
│   │   ├── api/          # REST Endpoint Controllers (v1)
│   │   ├── core/         # Settings, Logging & Global Configs
│   │   ├── db/           # SQLAlchemy Session & Engine Configuration
│   │   ├── importer/     # Data Import Pipeline Abstract Classes
│   │   ├── models/       # Declarative ORM Base Models
│   │   ├── parser/       # PDF & Document Parsing Interface
│   │   ├── repositories/ # Abstract Repository Pattern Interfaces
│   │   ├── schemas/      # Pydantic Input/Output Schemas
│   │   ├── search/       # Full-Text & Vector Search Abstractions
│   │   ├── services/     # Service Layer Base Implementations
│   │   ├── utils/        # Internal Utilities & Helpers
│   │   └── main.py       # FastAPI Entrypoint
│   ├── tests/            # Pytest Suite
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── requirements.txt
├── database/             # Alembic Migration System (No tables in Sprint 0)
│   ├── migrations/
│   │   ├── versions/
│   │   ├── env.py
│   │   └── script.py.mako
│   └── alembic.ini
├── docs/                 # Architecture, API specs, and technical documentation
├── frontend/             # Next.js App Router (TypeScript + Three.js)
│   ├── app/              # App Router Pages & Providers
│   ├── components/       # Generic Reusable UI Components
│   ├── features/         # Feature-Sliced Modules (bookshelf, search, history)
│   ├── hooks/            # Custom React Hooks
│   ├── lib/              # Library Client Initializers (React Query)
│   ├── public/           # Static Assets
│   ├── services/         # API HTTP Client Service Layer
│   ├── store/            # Zustand Global State Management
│   ├── styles/           # Global CSS & Tailwind Design Tokens
│   ├── types/            # TypeScript Type Definitions
│   ├── utils/            # Utilities (cn, formatting)
│   ├── Dockerfile
│   ├── next.config.mjs
│   ├── package.json
│   ├── tailwind.config.ts
│   └── tsconfig.json
├── packages/             # Shared TypeScript/Python packages
├── scripts/              # Automation and deployment scripts
├── .editorconfig         # Code style configuration across editors
├── .gitignore            # Git exclusion definitions
├── .pre-commit-config.yaml # Pre-commit hook definitions
├── docker-compose.yml    # Multi-container local development stack
├── LICENSE               # MIT License
└── README.md             # Project documentation
```

---

## 🛠️ Technology Stack

### Frontend Stack
* **Framework**: Next.js 14+ (App Router)
* **Language**: TypeScript (Strict Mode)
* **Styling**: TailwindCSS + Vanilla CSS Variables
* **3D Graphics**: Three.js, React Three Fiber (`@react-three/fiber`), Drei (`@react-three/drei`)
* **State Management**: Zustand
* **Data Fetching & Cache**: React Query (`@tanstack/react-query`)
* **Animations**: Framer Motion
* **Linting & Formatting**: ESLint, Prettier

### Backend Stack
* **Language**: Python 3.11+
* **Framework**: FastAPI
* **ORM & Migrations**: SQLAlchemy 2.0 (AsyncIO), Alembic
* **Validation & Settings**: Pydantic v2, Pydantic-Settings
* **Database**: PostgreSQL 16
* **Database Driver**: `asyncpg` (Async execution) / `psycopg2-binary` (Migrations)
* **Testing & Quality**: Pytest, Mypy (Strict), Ruff, Black

### Infrastructure & DevOps
* **Orchestration**: Docker & Docker Compose
* **CI/CD**: GitHub Actions

---

## 🚀 Development Setup

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Recommended)
* Node.js 20+ & `npm`
* Python 3.11+

### Running via Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/bbb-library.git
cd bbb-library

# 2. Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 3. Start the entire container stack
docker-compose up --build
```

Access points:
* **Frontend Application**: `http://localhost:3000`
* **FastAPI Backend Documentation**: `http://localhost:8000/docs`
* **PostgreSQL Database**: `localhost:5432`

---

### Local Development (Without Docker)

#### 1. Backend Setup
```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### 2. Database Migrations Setup
```bash
cd database
alembic upgrade head
```

#### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🗺️ Future Roadmap

- **Sprint 0**: Project Initialization & Monorepo Foundation ✅
- **Sprint 1**: Data Pipeline & Ingestion Engine (Meetup PDF/Doc Parsers, Database Schemas for Books & Meetups)
- **Sprint 2**: Core API & Search Service (FastAPI Repositories, Full-text Search, Filtering)
- **Sprint 3**: Virtual Bookshelf (Criterion Closet 3D Canvas, Physics, Book Spine & Rotation Controls)
- **Sprint 4**: Book History & Meetup Archive Timeline
- **Future Expansions**:
  - Immersive Museum Mode (Walkable 3D Gallery)
  - AI Librarian (Conversational assistant with RAG over BBB discussion notes)
  - Recommendation Engine (Collaborative & content-based book suggestions)
  - Knowledge Graph (Visualizing interconnected authors, genres, and discussion themes)
  - Interactive Reading Statistics & Community Insights

---

## 📜 License

Distributed under the [MIT License](LICENSE).
