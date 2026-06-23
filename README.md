# Hail

![Node](https://img.shields.io/badge/node-20%2B-339933?logo=nodedotjs)
![Express](https://img.shields.io/badge/express-5-000?logo=express)
![Tests](https://img.shields.io/badge/tests-141%20passing-22BB33)
![k6](https://img.shields.io/badge/k6-smoke%20passing-7D1A8F)
![License](https://img.shields.io/badge/license-ISC-8899aa)

A ride-hailing API backend with WebSocket real-time events, Paystack payment integration, and k6 load testing. Designed for Lagos, Nigeria. Frontend PWA under development.

## Features

- REST API for full ride lifecycle (request → accept → start → complete → pay)
- Real-time WebSocket event system (driver location, ride state changes, payment status)
- Paystack payment orchestration (card, USSD, transfer, cash)
- JWT authentication with httpOnly refresh token rotation and email verification
- Role-based authorization (rider, driver, admin) with granular endpoint access
- Rate-limited auth endpoints, HMAC-signed webhooks, Zod input validation
- Prisma ORM with PostgreSQL — full migration history, strong consistency for payments
- k6 load testing suite — smoke, load, stress, and soak scenarios

## Tech Stack

### Backend (`server/`)

| Layer | Technology |
|---|---|
| Runtime | Node.js (Express 5) |
| Database | PostgreSQL |
| ORM | Prisma |
| Cache / Pub/Sub | Redis (ioredis) |
| Auth | JWT (access + refresh tokens, httpOnly cookies) |
| Validation | Zod |
| Payments | Paystack |
| Maps | Google Maps API |
| Logging | Pino |
| Real-time | Socket.IO |
| Load testing | k6 |
| Unit tests | Jest |
| Integration tests | Jest + Testcontainers + Supertest |

### Frontend (`client/`) — *planned*

| Layer | Technology |
|---|---|
| Framework | React 19 (PWA) |
| Bundler | Vite |
| Routing | React Router |
| State | Zustand |
| HTTP | Axios |
| Real-time | socket.io-client |

### Infrastructure

- Docker Compose (PostgreSQL + Redis + API server)
- Dockerized deployment (ECS-ready via GitHub Actions)
- CI: lint + unit tests on push; CD: build → ECR → ECS deploy

## Getting Started

### Prerequisites

- Node.js 20+
- Docker Desktop

### 1. Clone and install

```bash
git clone <repo-url> && cd hail/server
npm install
```

### 2. Start infrastructure

```bash
# From repo root
docker compose up -d
```

This starts PostgreSQL (port 5432) and Redis (port 6379).

### 3. Configure environment

Create `server/.env` with the following:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hb
REDIS_URL=redis://localhost:6379
NODE_ENV=development
JWT_SECRET=<your-secret>
JWT_REFRESH_SECRET=<your-refresh-secret>
PAYSTACK_SECRET_KEY=<paystack-secret>
PAYSTACK_PUBLIC_KEY=<paystack-public>
FRONTEND_URL=http://localhost:5173
COMPANY_NAME=Hail
SUPPORT_EMAIL=support@hail.com
GOOGLE_MAPS_API_KEY=<google-maps-key>
```

### 4. Run database migrations

```bash
docker exec -it hail npx prisma migrate dev
```

### 5. Start the server

```bash
# From server/
npm run dev          # hot reload via nodemon
```

### 6. Seed test data (optional)

```bash
docker exec -it hail node loadtest/seed.js
```

### 7. Run load tests (optional)

```bash
k6 run server/loadtest/scrripts/smoke.js
```

## Project Structure

```
hail/
├── server/                  Express backend
│   ├── __tests__/           Unit and integration tests
│   ├── config/              Environment config, Prisma, Redis, logger
│   ├── controller/          Route handlers
│   ├── Domain/              Email templates
│   ├── error/               AppError hierarchy (8 custom error types)
│   ├── gateway/             External API wrappers (Paystack, Google Maps)
│   ├── loadtest/            k6 load testing suite
│   │   ├── scrripts/        Smoke, load, stress, soak test scripts
│   │   ├── config.js        Shared k6 constants and thresholds
│   │   ├── helpers.js       k6 auth and utility functions
│   │   └── seed.js          Node.js seed script (21 test users)
│   ├── middleware/           Auth, authorization, validation, rate limiting, error handling
│   ├── prisma/              Schema and 7 migrations
│   ├── repo/                Prisma repository wrappers (thin data access layer)
│   ├── routes/              Express router factories
│   ├── services/            Business logic (auth, rides, payments, drivers, etc.)
│   ├── socket/              Socket.IO event handlers
│   ├── validation/          Zod schemas
│   ├── NFR.md               Non-functional requirements documentation
│   └── app.js               Entry point
├── client/                  React PWA frontend (scaffold only, in development)
│   └── design/              Design system tokens and reference
├── .github/workflows/       CI (lint + test) and CD (ECR + ECS deploy)
├── docker-compose.yml       PostgreSQL + Redis + API
└── README.md                This file
```

## Architecture

**Request flow:** Route (middleware) → Controller → Service → Repository → Prisma

**Dependency injection:** Manual DI via `container.js` — repositories are instantiated first, injected into services, which are injected into controllers. Routes are factory functions receiving their controller. Adding a new feature follows a predictable path across these layers.

**Real-time events:** Driver location updates → Redis pub/sub → Socket.IO → WebSocket clients. Ride state changes emit events to room-scoped channels.

**Payment flow:** Paystack webhook → `/webhook/paystack` → HMAC signature verification → `PaymentService.handlePaymentSuccess()` → Postgres + Redis event.

**Saga pattern:** `completeRide` initiates payment before marking the ride COMPLETED. If payment fails (Paystack outage, network error), the ride stays IN_PROGRESS and the driver retries — preventing inconsistent ride/payment states.

## API Overview

Base URL: `http://localhost:8810/api/v1`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register a new user |
| POST | `/auth/login` | — | Login, returns access token |
| POST | `/auth/refresh` | — | Refresh access token (httpOnly cookie) |
| POST | `/auth/logout` | — | Revoke refresh token |
| GET | `/auth/verify-email` | — | Verify email address |
| POST | `/auth/forgot-password` | — | Request password reset |
| POST | `/auth/reset-password` | — | Reset password |
| POST | `/riders` | RIDER | Create rider profile |
| GET | `/riders/profile` | RIDER | Get own profile |
| PATCH | `/riders/profile` | RIDER | Update rider profile |
| POST | `/drivers` | DRIVER | Register as driver |
| GET | `/drivers/me` | DRIVER | Get own profile |
| PATCH | `/drivers/me` | DRIVER | Update vehicle info |
| PATCH | `/drivers/me/availability` | DRIVER | Toggle availability |
| POST | `/rides` | RIDER | Request a ride |
| PATCH | `/rides/:id/accept` | DRIVER | Accept a ride |
| PATCH | `/rides/:id/start` | DRIVER | Start ride |
| PATCH | `/rides/:id/complete` | DRIVER | Complete ride |
| PATCH | `/rides/:id/cancel` | RIDER/DRIVER | Cancel ride |
| PATCH | `/rides/:id/confirm-cash` | DRIVER | Confirm cash payment |
| GET | `/admin/rides` | ADMIN | List/filter rides |
| GET | `/admin/drivers` | ADMIN | List/filter drivers |
| PATCH | `/admin/drivers/:id/approve` | ADMIN | Approve driver |
| PATCH | `/admin/drivers/:id/reject` | ADMIN | Reject driver |
| PATCH | `/admin/drivers/:id/suspend` | ADMIN | Suspend driver |
| GET | `/admin/users` | ADMIN | List/filter users |
| PATCH | `/admin/users/:id/suspend` | ADMIN | Suspend user |
| DELETE | `/admin/users/:id` | ADMIN | Delete user |
| GET | `/admin/payments` | ADMIN | List/filter payments |

Full request/response schemas in [`AGENTS.md`](AGENTS.md).

## WebSocket Events

| Event | Direction | Description |
|---|---|---|
| `join:ride` | Client → Server | Join ride room |
| `leave:ride` | Client → Server | Leave ride room |
| `location:update` | Client → Server | Driver location update |
| `ride:requested` | Server → Driver | New ride request |
| `ride:accepted` | Server → Room | Ride accepted |
| `ride:started` | Server → Room | Ride started |
| `ride:cancelled` | Server → Room | Ride cancelled |
| `ride:completed` | Server → Room | Ride completed |
| `location:updated` | Server → Room | Driver location |
| `payment:initiated` | Server → Room | Payment started |
| `payment:captured` | Server → Room | Payment successful |
| `payment:failed` | Server → Room | Payment failed |

## Ride State Machine

```
REQUESTED → ACCEPTED → IN_PROGRESS → COMPLETED
                                              → CANCELLED (from any active state)
```

## User Flows

**Rider:** Register → verify email → login → create profile → request ride → track driver → ride complete → pay

**Driver:** Register → verify email → login → register as driver → wait for approval → go online → receive requests → accept → pickup → drop off → confirm payment

**Admin:** Login → dashboard with filterable list views for Rides, Drivers, Users, Payments

## Commands

### Backend (`server/`)
| Command | Description |
|---|---|
| `npm run dev` | Dev server with nodemon |
| `npm start` | Production start |
| `npm test` | Run Jest unit tests |
| `npm run test:integration` | Integration tests with Testcontainers |
| `npm run lint` | ESLint |

### Load testing (requires k6 CLI)
| Command | Description |
|---|---|
| `k6 run loadtest/scrripts/smoke.js` | Smoke test (1 VU, 30s, validates all endpoints) |
| `k6 run loadtest/scrripts/load-auth.js` | Ramping arrival rate on register + login |
| `k6 run loadtest/scrripts/stress.js` | Ramping VUs to find breaking point |

### Seed data
| Command | Description |
|---|---|
| `docker exec hail node loadtest/seed.js` | Create 1 admin + 10 riders + 10 drivers (idempotent) |

### Infrastructure (root)
| Command | Description |
|---|---|
| `docker compose up -d` | Start PostgreSQL + Redis |
| `docker compose down -v` | Stop + remove volumes |
| `docker exec -it hail npx prisma migrate dev` | Run pending migrations |

## License

ISC
