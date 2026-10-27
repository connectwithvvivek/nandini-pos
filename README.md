# Nandini Parlour POS

A production-ready POS, Customer Management, Inventory and Billing System for Nandini milk/dairy parlour.

---

## Stack

**Backend:** Python 3.12, Django 4.2, Django REST Framework, PostgreSQL (Supabase), JWT Auth  
**Frontend:** React 19, Vite, Tailwind CSS, TanStack Query, React Router, Lucide Icons

---

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your Supabase credentials

# Run migrations
python manage.py migrate

# Seed initial data
python manage.py seed_data

# Start server
python manage.py runserver
```

### 2. Frontend Setup

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

App runs at: http://localhost:5173  
API runs at: http://localhost:8000

---

## Default Login Credentials

| Role     | Username | Password   |
|----------|----------|------------|
| Owner    | owner    | owner@123  |
| Employee | ravi     | emp@123    |
| Employee | priya    | emp@123    |
| Employee | suresh   | emp@123    |

---

## Environment Variables (backend/.env)

```env
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-db-password
DB_HOST=db.your-project-ref.supabase.co
DB_PORT=5432

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
SUPABASE_STORAGE_BUCKET=product-images

CORS_ALLOWED_ORIGINS=http://localhost:5173
```

---

## Supabase Setup

1. Create a new Supabase project
2. Copy the database connection string to `.env`
3. Copy the service role key to `.env` (never expose to frontend)
4. Create a storage bucket named `product-images` and set it to **public**

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login/ | Login |
| POST | /api/auth/refresh/ | Refresh token |
| POST | /api/auth/logout/ | Logout |
| GET | /api/auth/me/ | Current user |
| GET/POST | /api/customers/ | List/create customers |
| GET/PATCH | /api/customers/{id}/ | Get/update customer |
| GET/PATCH | /api/pricing/customers/{id}/prices/ | Customer prices |
| GET | /api/pricing/customers/{id}/products/ | Products with customer prices |
| GET/POST | /api/products/ | List/create products |
| POST | /api/products/{id}/upload-image/ | Upload product image |
| GET/POST | /api/sales/ | List sales |
| POST | /api/sales/create/ | Create sale |
| GET | /api/sales/{id}/ | Sale detail |
| POST | /api/sales/{id}/cancel/ | Cancel sale |
| GET | /api/shifts/ | List shifts |
| POST | /api/shifts/open/ | Open shift |
| POST | /api/shifts/close/ | Close shift |
| GET | /api/shifts/current/ | Current shift |
| POST | /api/inventory/adjust/ | Adjust stock |
| GET | /api/dashboard/today/ | Dashboard data |
| GET | /api/dashboard/reports/ | Reports |

---

## Running Tests

```bash
cd backend
python manage.py test tests
```

---

## Key Business Rules

- Customer-specific prices override default product prices
- Employees cannot change prices or stock
- Historical bills preserve the price at time of sale
- Stock automatically decreases on sale completion
- Every bill has a unique number (INV-YYYY-XXXXXX)
- Every customer has a unique code (CUS-XXXX)
- Product images stored in Supabase Storage (never in DB)
