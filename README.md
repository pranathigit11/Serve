# SERVE — Night Canteen Ordering

Monorepo for SERVE: students order from their hostel's night canteen, staff run
the canteen in real time, and admins manage canteens and staff.

| Folder | What | Stack |
| --- | --- | --- |
| `backend/` | REST API, Socket.IO, business rules | Node 20+, Express 5, Prisma 7, PostgreSQL, firebase-admin |
| `student-app/` | Student app (Android/iOS/web) | Flutter, Provider, Firebase Auth |
| `staff-dashboard/` | Canteen staff web app | React 19, Vite, Firebase Auth |
| `admin-portal/` | Admin web app | React 19, Vite, Firebase Auth |
| `e2e/` | Browser end-to-end checks across all three apps | Playwright |

The frontends never share code and never touch the database: everything goes
through the backend, which is the single source of truth.

## How it works

**Identity.** All three apps sign in with Firebase Authentication and send the
Firebase ID token as `Authorization: Bearer <token>` (and in the Socket.IO
handshake). The backend verifies the token and maps the Firebase uid to a
PostgreSQL `User`. **The role (`STUDENT` / `STAFF` / `ADMIN`) and account status
in PostgreSQL are authoritative**; Firebase custom claims are not used, so the
two can never disagree. Request bodies never decide who the caller is.

- Students self-register (`POST /api/students/register`); their hostel picks a default canteen.
- Staff self-register with **no canteen access**, then request a canteen; an admin approves.
- Admins cannot self-register. Grant the role to an existing Firebase user with
  `npm run admin:create -- --email someone@college.edu` (backend).

**Multi-canteen menus.** Every canteen owns its own categories and items (with
their own price and availability). A composite foreign key guarantees an item's
category belongs to the same canteen. Staff can only touch their assigned
canteen: the canteen is always derived from the staff member's database
assignment, never from ids in the request. Menu items are soft-deleted, and each
order line stores an immutable snapshot (name, unit price, quantity, total), so
editing or removing items never changes past orders.

**Orders and payment (mock).**

```
POST /api/orders            → PENDING_PAYMENT  (server prices every line; Idempotency-Key required)
POST /api/payments          → payment attempt  (rechecks canteen open + items available)
POST /api/payments/mock/:id/complete → simulated gateway result, HMAC-signed by the server
POST /api/payments/verify   → signature + amount + state checked under a row lock
                              → payment SUCCEEDED, order PLACED (visible to staff)
staff: PLACED → PREPARING → READY → COLLECTED (compare-and-set transitions)
```

Clients only send item ids and quantities; totals are computed from the
database. Only `/verify` can mark an order paid, it needs a signature only the
server can produce, and it is idempotent (`409 ALREADY_VERIFIED`). Unpaid
orders expire after `PENDING_PAYMENT_TTL_MINUTES`.

**Real time.** Socket connections are authenticated during the handshake.
Clients never choose rooms: the server joins each socket to rooms derived from
PostgreSQL (`user:<id>`, `canteen:<id>:staff` for assigned staff,
`canteen:<id>:public` for the student's selected canteen, `admins`) and moves
live sockets when an assignment or selection changes. Events:
`order:created`, `order:status_updated`, `order:cancelled`,
`canteen:updated`, `canteen:order_taking_updated`, `menu:item_updated`,
`menu:availability_updated`, `menu:item_deleted`, `menu:category_updated`,
`change_request:created`, `change_request:updated`,
`staff:canteen_assignment_updated`, `staff:updated`, `notification:created`.

## API

| Method & path | Who |
| --- | --- |
| `GET /api/health`, `GET /api/health/ready` | public |
| `GET /api/canteens` (active canteens) | public |
| `GET /api/me` | any registered account |
| `POST /api/students/register`, `POST /api/staff/register` | signed-in Firebase user |
| `GET /api/canteens/:id/menu` | registered account (students: active canteens only) |
| `PATCH /api/students/me` (`selectedCanteenId`), `GET /api/students/me/orders` | student |
| `POST /api/orders`, `GET /api/orders/:id`, `POST /api/orders/:id/cancel` | student (own orders) |
| `POST /api/payments`, `POST /api/payments/mock/:id/complete`, `POST /api/payments/verify`, `POST /api/payments/:id/cancel` | student (own payments) |
| `GET /api/staff/me`, `GET/POST /api/staff/canteen-requests` | staff |
| `GET /api/staff/canteen`, `PATCH /api/staff/canteen/order-taking` | assigned staff |
| `GET /api/staff/orders`, `PATCH /api/staff/orders/:id/status` | assigned staff |
| `GET /api/staff/menu`, `POST/PATCH /api/staff/menu/categories[/:id]`, `POST/PATCH/DELETE /api/staff/menu/items[/:id]`, `PATCH /api/staff/menu/items/:id/availability` | assigned staff |
| `GET/POST/PATCH /api/admin/canteens[/:id]` | admin |
| `GET /api/admin/staff`, `PATCH /api/admin/staff/:id/assignment`, `PATCH /api/admin/staff/:id/status` | admin |
| `GET /api/admin/canteen-requests`, `POST /api/admin/canteen-requests/:id/approve|reject` | admin |
| `GET /api/notifications`, `POST /api/notifications/:id/read`, `POST /api/notifications/read-all` | any registered account (own) |

Errors are JSON: `{ "error": "CODE", "message": "..." }`. Missing/invalid token →
401, wrong role / other canteen / inactive account → 403, other students'
orders and payments → 404.

## Local development

Prerequisites: Node 20.19+, PostgreSQL 14+, Flutter 3.44+, and the Firebase CLI
(`npx firebase-tools`) for the Auth emulator.

```bash
# Firebase Auth emulator (repo root; config in firebase.json)
npx firebase-tools emulators:start --only auth --project demo-serve

# Backend
cd backend
cp .env.example .env            # set DATABASE_URL; for the emulator set
                                # FIREBASE_PROJECT_ID=demo-serve and FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
npm install
npm run db:migrate              # prisma migrate deploy (never `migrate reset` on real data)
npm run db:seed                 # dev-only canteens + starter menus (idempotent)
npm run admin:create -- --email you@example.com   # after creating that user in Firebase/emulator
npm run dev                     # http://localhost:5001

# Staff dashboard / admin portal (use .env.development → emulator + local API)
cd staff-dashboard && npm install && npm run dev            # http://localhost:5173
cd admin-portal && npm install && npm run dev               # http://localhost:5174

# Student app — debug builds default to the local API and emulator
cd student-app && flutter pub get && flutter run
```

## Checks

```bash
cd backend && npm run typecheck && npm run build && npm test   # 59 integration tests (Postgres + Auth emulator)
cd staff-dashboard && npm run build && npm run lint
cd admin-portal && npm run build && npm run lint
cd student-app && flutter analyze && flutter test
cd e2e && npm test                                            # see e2e/README.md
```

## Production configuration

Everything is configured through environment / build-time variables; no
development endpoint is used as a fallback in production builds.

- **Backend** — see `backend/.env.example`. In `NODE_ENV=production` the server
  refuses to start if `FIREBASE_AUTH_EMULATOR_HOST` is set, `CORS_ORIGINS` is
  empty/`*`/localhost, the mock payment secret is weak, or `PAYMENT_MODE=mock`
  is used without `ALLOW_MOCK_PAYMENTS_IN_PRODUCTION=true`. Run
  `npm run db:migrate` on deploy. Set `TRUST_PROXY_HOPS` behind a load balancer.
- **Staff / admin** — `VITE_API_URL`, `VITE_FIREBASE_*` (see each `.env.example`).
  Production builds reject localhost API URLs and ignore the emulator setting.
- **Student app** — pass values with
  `--dart-define-from-file=config/production.json` (template:
  `student-app/config/production.example.json`). Release builds require an
  `https` `API_BASE_URL` and the Firebase values, and never fall back to
  localhost/10.0.2.2. Android release signing reads `android/key.properties`.

Before going live, also: replace the mock payment provider with a real gateway,
set a real Android `applicationId` (currently `com.example.serve.student_app`)
and release keystore, run a single backend instance or add a Socket.IO adapter
(e.g. Redis) before scaling out, and decide on `STUDENT_EMAIL_DOMAINS` /
`REQUIRE_EMAIL_VERIFIED`.
