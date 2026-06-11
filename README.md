# CookLyt POS — Restaurant Management Platform

A full restaurant management monorepo: a point-of-sale dashboard (which also serves the public landing page), a super-admin panel, a customer QR-menu ordering app, and a Node.js/Express + PostgreSQL backend with real-time updates over WebSocket.

## Monorepo Layout

| Package | Description |
|---|---|
| `dashboard/` | Main POS web app (React + Vite + Tailwind) — orders, tables, kitchen, inventory, waste tracking, loyalty, reports. Serves the public landing page at `/`. Dev port 5173. |
| `admin/` | Super-admin panel — restaurant provisioning, users, audit logs. Dev port 5174. |
| `menu/` | Customer-facing QR menu & ordering app. |
| `backend/` | Express API + PostgreSQL + WebSocket server. |

> **Note:** The reference below documents the original backend core (auth, menu, tables, orders, payments, kitchen, reports). The backend has since grown to ~26 modules — inventory, recipes, waste, loyalty, coupons, reservations, reviews, scheduler, and more — each following the same router → service → repository pattern. See `backend/src/` for the full list.

---

## Table of Contents

- [Architecture & Methodology](#architecture--methodology)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)
- [Roles & Permissions](#roles--permissions)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Running the Server](#running-the-server)
- [Running Tests](#running-tests)
- [Docker](#docker)

---

## Architecture & Methodology

The backend follows a **layered architecture** with clear separation of concerns:

```
Router  →  Service  →  Repository  →  PostgreSQL
```

- **Router** (`*.router.js`) — Express route definitions. Handles HTTP method/path, applies authentication/authorization middleware, delegates to the service layer.
- **Service** (`*.service.js`) — Business logic. Validates inputs, orchestrates cross-module calls, emits WebSocket events.
- **Repository** (`*.repository.js`) — All raw SQL queries. The only layer that talks to the database.
- **Interface** (`*.interface.js`) — Thin cross-module adapters. Allows one module's service to call another module's repository without circular coupling.

Each domain (auth, menu, tables, orders, payments, kitchen, reports) lives in its own self-contained folder under `src/`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18 |
| Framework | Express 4 |
| Database | PostgreSQL 15 |
| DB Driver | `pg` (node-postgres) |
| Migrations | `node-pg-migrate` |
| Auth | JWT (`jsonwebtoken`) + bcrypt |
| Real-time | WebSocket (`ws`) |
| Security | `helmet`, `cors` |
| Testing | Jest + Supertest |
| Dev | Nodemon |

---

## Project Structure

```
backend/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── migrations/
│   ├── 001_create_users.js
│   ├── 002_create_tables_and_menu.js
│   └── 003_create_orders_and_payments.js
└── src/
    ├── app.js               # Express app setup (middleware + routes)
    ├── server.js            # HTTP server + WebSocket init
    ├── auth/
    │   ├── auth.router.js
    │   ├── auth.service.js
    │   └── auth.repository.js
    ├── menu/
    │   ├── menu.router.js
    │   ├── menu.service.js
    │   ├── menu.repository.js
    │   └── menu.interface.js
    ├── tables/
    │   ├── tables.router.js
    │   ├── tables.service.js
    │   ├── tables.repository.js
    │   └── tables.interface.js
    ├── orders/
    │   ├── orders.router.js
    │   ├── orders.service.js
    │   ├── orders.repository.js
    │   └── orders.interface.js
    ├── payments/
    │   ├── payments.router.js
    │   ├── payments.service.js
    │   └── payments.repository.js
    ├── kitchen/
    │   ├── kitchen.router.js
    │   ├── kitchen.service.js
    │   └── kitchen.repository.js
    ├── reports/
    │   ├── reports.router.js
    │   ├── reports.service.js
    │   └── reports.repository.js
    └── shared/
        ├── db.js                    # pg connection pool
        ├── websocket.js             # WebSocket server wrapper
        ├── errors.js                # AppError, NotFoundError, UnauthorizedError, etc.
        └── middleware/
            ├── auth.js              # authenticate + authorize middleware
            └── validate.js          # body schema validation middleware
```

---

## Database Schema

Migrations run in order via `node-pg-migrate`. Tables created:

### `users`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, auto-generated |
| email | varchar(255) | unique, not null |
| password | varchar(255) | bcrypt hash |
| role | varchar(50) | `admin`, `staff`, `kitchen` |
| created_at | timestamp | defaults to now |

### `tables`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| number | integer | unique |
| status | varchar(50) | `available`, `occupied` |
| seats | integer | |

### `menu_items`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | varchar(255) | |
| price | numeric(10,2) | |
| category | varchar(100) | |
| available | boolean | defaults to true |

### `orders`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| table_id | uuid | FK → tables |
| status | varchar(50) | `open`, `preparing`, `ready`, `paid`, `cancelled` |
| created_by | uuid | FK → users |
| created_at | timestamp | |

### `order_items`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| order_id | uuid | FK → orders |
| menu_item_id | uuid | FK → menu_items |
| quantity | integer | |
| notes | text | optional |

### `payments`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| order_id | uuid | FK → orders |
| amount | numeric(10,2) | |
| method | varchar(50) | `cash`, `card`, `mobile` |
| status | varchar(50) | `pending`, `completed`, `failed` |
| created_at | timestamp | |

---

## API Reference

All endpoints are prefixed with `/api`. Every endpoint except `POST /api/auth/login` requires a valid JWT in the `Authorization: Bearer <token>` header.

### Health Check

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Returns `{ status: "ok", timestamp }` |

---

### Auth — `/api/auth`

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/api/auth/login` | None | — | Login with email + password. Returns JWT token. |
| POST | `/api/auth/register` | Required | admin | Register a new staff/admin account. |
| GET | `/api/auth/me` | Required | any | Get the current user's profile. |

**Login request body:**
```json
{ "email": "admin@example.com", "password": "secret" }
```

**Login response:**
```json
{
  "token": "<jwt>",
  "user": { "id": "...", "email": "admin@example.com", "role": "admin" }
}
```

JWT expires in **8 hours**.

---

### Menu — `/api/menu`

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/menu` | Required | any | Get all menu items. |
| GET | `/api/menu/available` | Required | any | Get only available menu items. |
| GET | `/api/menu/:id` | Required | any | Get a single menu item by ID. |
| POST | `/api/menu` | Required | admin | Create a new menu item. |
| PATCH | `/api/menu/:id` | Required | admin | Update a menu item. |
| DELETE | `/api/menu/:id` | Required | admin | Delete a menu item. |

---

### Tables — `/api/tables`

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/tables` | Required | any | List all tables. |
| GET | `/api/tables/:id` | Required | any | Get a single table. |
| POST | `/api/tables` | Required | admin | Create a new table. |
| PATCH | `/api/tables/:id/status` | Required | any | Update table status (`available` / `occupied`). |
| DELETE | `/api/tables/:id` | Required | admin | Delete a table. |

---

### Orders — `/api/orders`

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/orders/:id` | Required | any | Get a single order with its items. |
| GET | `/api/orders/table/:tableId` | Required | any | Get active orders for a table. |
| POST | `/api/orders` | Required | any | Create a new order. |
| POST | `/api/orders/:id/items` | Required | any | Add items to an existing order. |
| PATCH | `/api/orders/:id/status` | Required | any | Update order status. |

**Create order request body:**
```json
{
  "tableId": "<uuid>",
  "items": [
    { "menuItemId": "<uuid>", "quantity": 2, "notes": "no onions" }
  ]
}
```

Valid order statuses: `open`, `preparing`, `ready`, `paid`, `cancelled`

Creating an order automatically marks the table as `occupied` and broadcasts a `NEW_ORDER` WebSocket event.

---

### Payments — `/api/payments`

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/api/payments/:orderId` | Required | any | Process payment for an order. |
| GET | `/api/payments/:orderId` | Required | any | Get all payments for an order. |

**Process payment request body:**
```json
{ "method": "cash", "amountTendered": 50.00 }
```

Valid methods: `cash`, `card`, `mobile`

On success, the order is marked as `paid`, the table is freed (`available`), and a `PAYMENT_COMPLETED` WebSocket event is broadcast. If `amountTendered` is provided, the response includes the change owed.

---

### Kitchen — `/api/kitchen`

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/kitchen/queue` | Required | admin, kitchen, staff | Get all orders currently needing preparation. |
| PATCH | `/api/kitchen/:orderId/preparing` | Required | any | Mark an order as being prepared. |
| PATCH | `/api/kitchen/:orderId/ready` | Required | any | Mark an order as ready for pickup. |

---

### Reports — `/api/reports`

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/reports/daily` | Required | admin | Get daily sales summary. |

**Query parameter:** `?date=YYYY-MM-DD` (defaults to today)

**Response includes:**
- `summary` — total orders, total revenue
- `byCategory` — revenue broken down by menu category
- `topItems` — best-selling items
- `hourly` — sales by hour of day

---

## WebSocket Events

Connect to the server's WebSocket endpoint (`ws://localhost:3000`). On connection, you receive a `CONNECTED` event.

| Event | Trigger | Payload |
|---|---|---|
| `CONNECTED` | Client connects | `{}` |
| `NEW_ORDER` | Order created | `{ orderId, tableId }` |
| `ORDER_UPDATED` | Items added to order | `{ orderId }` |
| `ORDER_STATUS_CHANGED` | Order status updated | `{ orderId, status }` |
| `PAYMENT_COMPLETED` | Payment processed | `{ orderId, paymentId, total }` |

All messages are JSON: `{ event, data, timestamp }`.

---

## Roles & Permissions

| Role | Description |
|---|---|
| `admin` | Full access. Can manage users, menu, tables, view reports. |
| `staff` | Can create/view orders, process payments, update table status. |
| `kitchen` | Can view the kitchen queue, mark orders as preparing/ready. |

---

## Setup & Installation

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL 15 (or Docker)

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd krilok-pos/backend
npm install
```

### 2. Start the database

The easiest way is Docker Compose, which spins up both a dev DB and a test DB:

```bash
docker compose up -d
```

This starts:
- **Dev DB** on `localhost:5432` — database `pos_dev`, user `pos_user`, password `pos_password`
- **Test DB** on `localhost:5433` — database `pos_test`, same credentials

If you prefer to use your own PostgreSQL instance, create the database and user manually and set the `DATABASE_URL` env var accordingly.

### 3. Configure environment variables

Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL=postgres://pos_user:pos_password@localhost:5432/pos_dev
JWT_SECRET=your-secret-key-change-this-in-production
PORT=3000
NODE_ENV=development
```

### 4. Run migrations

```bash
npm run migrate
```

This applies all migrations in the `migrations/` directory in order, creating the `users`, `tables`, `menu_items`, `orders`, `order_items`, and `payments` tables.

To migrate the test database:

```bash
npm run migrate:test
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | Secret key for signing JWTs |
| `PORT` | No | `3000` | Port the HTTP server listens on |
| `NODE_ENV` | No | `development` | `development` or `production` |

---

## Running the Server

**Development** (auto-restarts on file changes):
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server starts on `http://localhost:3000` (or the configured `PORT`).

- REST API: `http://localhost:3000/api/...`
- Health check: `http://localhost:3000/health`
- WebSocket: `ws://localhost:3000`

---

## Running Tests

Tests use Jest + Supertest and run against the test database (`pos_test` on port `5433`).

Make sure the test DB is running and migrated first:

```bash
docker compose up -d
npm run migrate:test
```

Then run tests:

```bash
npm test
```

Tests run serially (`--runInBand`) to avoid database race conditions. Test files live in `backend/tests/`:

- `auth.test.js`
- `menu.test.js`
- `orders.test.js`
- `payments.test.js`

---

## Docker

### Application container only

Build and run the backend image:

```bash
docker build -t cooklyt-pos-backend .
docker run -p 3000:3000 \
  -e DATABASE_URL=postgres://pos_user:pos_password@host.docker.internal:5432/pos_dev \
  -e JWT_SECRET=your-secret \
  cooklyt-pos-backend
```

### Dev + test databases only

```bash
docker compose up -d
```

Starts two PostgreSQL 15 containers:

| Service | Host Port | Database | User | Password |
|---|---|---|---|---|
| `db` (dev) | 5432 | `pos_dev` | `pos_user` | `pos_password` |
| `db_test` | 5433 | `pos_test` | `pos_user` | `pos_password` |

Database data for the dev instance is persisted in a named Docker volume (`postgres_data`). The test database has no persistent volume and resets on container restart.
