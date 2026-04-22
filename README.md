# Newsletter Backend Assignment

This repository now implements the mandatory assignment features:

- Secure click/open tracking with signed tokens
- Asynchronous processing using BullMQ + Redis
- Worker-based click logging and email sending
- Dead Letter Queue (DLQ) for failed jobs
- Real-time tenant-scoped dashboard updates over WebSockets

## Architecture

### Click Flow (non-blocking)

1. Email contains tracked URL: `/api/click-stats/t/:token`
2. API validates signed token + rate limit + sanitization
3. API redirects user immediately to original URL
4. API pushes click event to `click-events` queue
5. Worker consumes event and writes to DB
6. Worker emits `click.processed` websocket event to tenant room

### Open Tracking Flow

1. Email embeds pixel URL: `/api/click-stats/o/:token`
2. API returns tracking pixel immediately
3. API pushes open event to queue
4. Worker persists + emits websocket update

### Queue Topology

- `email-events` -> email sending worker
- `click-events` -> click processing worker
- `automation-events` -> automation worker
- `dead-letter-events` -> failed jobs capture (DLQ)

## Security Controls Implemented

- Signed tracking tokens (HMAC SHA-256)
- Token expiry validation
- UUID/entity validation before enqueue/write
- Rate limiting on tracking endpoints
- Input sanitization (IP, user-agent, URL)
- Parameterized ORM queries
- Tenant room isolation in websocket events
- JWT-authenticated websocket connections

## Environment Setup

Copy and edit one of:

- `.env.example` (recommended)
- `src/.test.env` (development fallback)

### Required variables

- Postgres: `POSTGRES_*`
- Redis: `REDIS_HOST`, `REDIS_PORT`
- Mail: `MAILGUN_*`
- Security: `JWT_SECRET`, `TRACKING_TOKEN_SECRET`
- App URL: `APP_BASE_URL`

## Run Locally

```bash
npm install
docker compose up -d
npm run start:dev
```

API base URL: `http://localhost:8000/api`

## Key Endpoints

- `POST /api/users/login` -> returns JWT for websocket auth
- `POST /api/campaigns` -> create campaign (`targetUrl` optional)
- `POST /api/campaigns/:id/send` -> queues emails with unique tracked links
- `GET /api/click-stats/t/:token` -> tracked click redirect
- `GET /api/click-stats/o/:token` -> tracked open pixel
- `GET /api/click-stats/campaign/:campaignId?organizationId=...` -> aggregate stats

## WebSocket

Namespace: `/stats`

Use JWT from login:

```ts
const socket = io('http://localhost:8000/stats', {
  auth: { token: accessToken },
});
```

Events:

- `click.processed`
- `email.processed`

## Demo Checklist (for submission video)

1. Start backend + Postgres + Redis
2. Register/login user (tenant-scoped)
3. Create campaign with real recipient and `targetUrl`
4. Send campaign (queued, not inline)
5. Open inbox and click tracked link
6. Show DB row in `click_events`
7. Show `GET /api/click-stats/campaign/:campaignId` output
8. Show websocket event arrival in real time
