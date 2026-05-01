# Getting Started

## Backend Setup

### 1. Clone the Repository

```bash
git clone
```

If prompted for credentials, enter your GitHub username and use your personal access token as the password.

```bash
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

```

---

### 2. Set Up a Virtual Environment (Recommended)

```bash
python -m venv venv
```

Activate it:

- **Windows:** `venv\Scripts\activate`
- **Mac/Linux:** `source venv/bin/activate`

---

### 3. Install Dependencies

You have two options:

**Option A — Using `requirements.txt` (recommended):**

```bash
pip install -r requirements.txt
```

> **What is `requirements.txt`?** It's a file that lists all the Python packages your project needs, along with their versions. Running the command above installs everything at once — no need to install packages one by one.

**Option B — Install manually:**

```bash
pip install fastapi "fastapi-users[sqlalchemy]" uvicorn alembic "psycopg[binary]" asyncpg python-dotenv
```

---

### 4. Configure Environment Variables

Past env Variables

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost/dbname
SECRET=your-secret-key
```

---

### 5. Run Database Migrations

```bash
alembic upgrade head
```

> This applies any pending database migrations and sets up your tables.

---

### 6. Start the Backend Server

```bash
uvicorn app.main:app --reload
```

> The API will be available at `http://localhost:8000`. The `--reload` flag auto-restarts the server when you save changes.

---

## Frontend Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Frontend

```bash
npm run dev
```

---
