# Hail

![Node](https://img.shields.io/badge/node-20%2B-339933?logo=nodedotjs)
![Express](https://img.shields.io/badge/express-5-000?logo=express)
![React](https://img.shields.io/badge/react-19-61DAFB?logo=react)
![License](https://img.shields.io/badge/license-ISC-8899aa)

A ride-hailing platform backend and React PWA frontend — connecting riders and drivers across Lagos, Nigeria.

## Features

- Request rides with real-time driver tracking
- Pay via card, cash, USSD, or transfer (Paystack)
- Role-based dashboards for riders, drivers, and admins
- WebSocket-powered live location and ride events
- JWT authentication with silent refresh token rotation

## Tech Stack

### Backend (`server/`)

| Layer | Technology |
|---|---|
| Runtime | Node.js (Express 5) |
| Database | PostgreSQL |
| ORM | Prisma |
| Cache / Pub/Sub | Redis (ioredis) |
| Auth | JWT (access + refresh tokens) |
| Validation | Zod |
| Payments | Paystack |
| Maps | Google Maps API |
| Logging | Pino |
| Real-time | Socket.IO |
| Testing | Jest, Supertest, Testcontainers |

### Frontend (`client/`)

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
- Dockerized deployment (ECS-ready)

## Getting Started

### Prerequisites

- Node.js 20+
- Docker Desktop

### 1. Clone and install

```bash
git clone <repo-url> && cd hail

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Start infrastructure

```bash
# From repo root
docker compose up -d
```

This starts PostgreSQL (port 5432) and Redis (port 6379).

### 3. Configure environment

Copy `server/.env.example` to `server/.env` and fill in:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hb
REDIS_URL=redis://localhost:6379
JWT_SECRET=<your-secret>
JWT_REFRESH_SECRET=<your-refresh-secret>
PAYSTACK_SECRET_KEY=<paystack-secret>
PAYSTACK_PUBLIC_KEY=<paystack-public>
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

### 6. Start the client

```bash
# From client/
npm run dev          # Vite dev server on port 5173
```

## Project Structure

```
hail/
├── server/                Express backend
│   ├── __tests__/         Jest unit tests
│   ├── config/            Environment config
│   ├── controllers/       Route handlers
│   ├── error/             Custom error classes
│   ├── gateway/           External API wrappers (Paystack, Google Maps)
│   ├── middleware/        Auth, validation, rate limiting
│   ├── prisma/            Schema and migrations
│   ├── repositories/      Prisma wrappers
│   ├── routes/            Express router factories
│   ├── services/          Business logic
│   ├── validation/        Zod schemas
│   └── app.js             Entry point
├── client/                React PWA frontend
│   ├── design/            Design system tokens + reference
│   ├── public/            Static assets
│   └── src/
│       ├── components/    UI components (Button, Input, Badge, etc.)
│       ├── pages/         Route-level page components
│       ├── services/      Axios + Socket.IO clients
│       ├── store/         Zustand stores
│       └── App.jsx        Router entry point
├── docker-compose.yml     PostgreSQL + Redis + API
└── SYSTEM_DESIGN.md       Architecture documentation
```

## Architecture

Request flow: **Route → Controller → Service → Repository → Prisma**

Dependency injection via `container.js` — instantiate repos → services → controllers. Routes are factory functions receiving their controller.

Real-time: driver location updates → Redis pub/sub → Socket.IO → WebSocket clients.

Payment webhook: Paystack → `/webhook/paystack` → PaymentService → Postgres + Redis.

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
| `npm test` | Run Jest tests |
| `npm run lint` | ESLint |
| `npm run test:integration` | Integration tests with Testcontainers |

### Frontend (`client/`)
| Command | Description |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview build |
| `npm run lint` | ESLint |

### Infrastructure (root)
| Command | Description |
|---|---|
| `docker compose up -d` | Start PostgreSQL + Redis |
| `docker compose down -v` | Stop + remove volumes |

## Design System

Brand: Hail, Lagos, Nigerian Naira (₦). Font: Plus Jakarta Sans (400/600).

- Design tokens: `client/design/tokens.css`
- UI components: Button, Input, Badge, RideStatusCard, BottomSheet, RideTypeCard
- All components use CSS custom properties — no hardcoded values
- 4px spacing scale, WCAG AA contrast compliant

## Roadmap

- [ ] Driver proximity-based matching
- [ ] Ratings and reviews
- [ ] Ride history
- [ ] Push notifications
- [ ] Dynamic fare calculation

## License

ISC
