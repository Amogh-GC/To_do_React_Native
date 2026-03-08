# To-Do App — Optional REST API

> **This backend is entirely optional.** The React Native app already uses Firebase Firestore directly.  
> Use this Express/MongoDB API if you want a self-hosted backend, offline-first server caching, or to extend the project with more advanced features.

---

## Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Runtime    | Node.js ≥ 18                        |
| Framework  | Express 4                           |
| Database   | MongoDB (local or Atlas)            |
| ODM        | Mongoose 8                          |
| Auth       | JSON Web Tokens (`jsonwebtoken`)    |
| Password   | bcryptjs (bcrypt, salt rounds = 12) |
| Validation | express-validator                   |
| Dev server | nodemon                             |

---

## Quick start

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Create your .env file from the example
cp .env.example .env
# Edit .env and set MONGO_URI + JWT_SECRET

# 3. Start (development — auto-restarts on change)
npm run dev

# 4. Verify
curl http://localhost:5000/api/health
```

---

## Environment variables

| Variable     | Required | Description                                 |
| ------------ | -------- | ------------------------------------------- |
| `PORT`       | No       | HTTP port (default `5000`)                  |
| `NODE_ENV`   | No       | `development` or `production`               |
| `MONGO_URI`  | **Yes**  | Full MongoDB connection string              |
| `JWT_SECRET` | **Yes**  | Long random string used to sign/verify JWTs |
| `JWT_EXPIRE` | No       | Token lifetime (default `7d`)               |

---

## API reference

### Authentication

All auth routes: `POST /api/auth/...`

#### `POST /api/auth/register`

Create a new account.

**Body**

```json
{ "name": "Alice", "email": "alice@example.com", "password": "secret123" }
```

**Response 201**

```json
{
  "success": true,
  "token": "<JWT>",
  "user": { "id": "...", "name": "Alice", "email": "alice@example.com", "createdAt": "..." }
}
```

---

#### `POST /api/auth/login`

**Body** `{ "email": "alice@example.com", "password": "secret123" }`

**Response 200** — same shape as register.

---

#### `GET /api/auth/me` _(protected)_

Returns the current user. Send `Authorization: Bearer <token>` header.

---

#### `PUT /api/auth/me` _(protected)_

Update `name` and/or `password`.

---

### Tasks

All task routes require `Authorization: Bearer <token>`.

| Method   | Path                    | Description                       |
| -------- | ----------------------- | --------------------------------- |
| `GET`    | `/api/tasks`            | List tasks (filterable/paginated) |
| `POST`   | `/api/tasks`            | Create a task                     |
| `GET`    | `/api/tasks/:id`        | Get a single task                 |
| `PUT`    | `/api/tasks/:id`        | Full replace of a task            |
| `PATCH`  | `/api/tasks/:id`        | Partial update                    |
| `PATCH`  | `/api/tasks/:id/toggle` | Toggle pending ↔ completed        |
| `DELETE` | `/api/tasks/:id`        | Delete a task                     |

---

#### `GET /api/tasks` — query parameters

| Param      | Type   | Values                                             | Default     |
| ---------- | ------ | -------------------------------------------------- | ----------- |
| `status`   | string | `pending` \| `completed`                           | —           |
| `priority` | string | `high` \| `medium` \| `low`                        | —           |
| `sortBy`   | string | `createdAt` \| `deadline` \| `priority` \| `title` | `createdAt` |
| `order`    | string | `asc` \| `desc`                                    | `desc`      |
| `search`   | string | Substring match on title + description             | —           |
| `page`     | number | Page number (1-based)                              | `1`         |
| `limit`    | number | Items per page (max 100)                           | `50`        |

---

#### Task object shape

```json
{
  "_id": "64abc...",
  "userId": "64xyz...",
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "priority": "high",
  "status": "pending",
  "deadline": "2025-12-31",
  "dateTime": "2025-12-30T09:00:00.000Z",
  "tags": ["personal", "errands"],
  "completedAt": null,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-02T12:00:00.000Z"
}
```

---

#### `POST /api/tasks` body

```json
{
  "title": "Buy groceries", // required
  "description": "Milk, eggs, bread", // optional
  "priority": "high", // optional, default "medium"
  "status": "pending", // optional, default "pending"
  "deadline": "2025-12-31", // optional ISO date string
  "dateTime": "2025-12-30T09:00:00.000Z", // optional ISO date-time
  "tags": ["personal"] // optional, max 10 items
}
```

---

## MongoDB schema diagram

```
┌──────────────────────────────────────────────────────┐
│  users                                               │
│  ─────────────────────────────────────────────────── │
│  _id          ObjectId  (PK)                         │
│  name         String                                 │
│  email        String    (unique)                     │
│  password     String    (bcrypt, select:false)       │
│  createdAt    Date                                   │
└────────────────────────┬─────────────────────────────┘
                         │ 1 : N
┌────────────────────────▼─────────────────────────────┐
│  tasks                                               │
│  ─────────────────────────────────────────────────── │
│  _id          ObjectId  (PK)                         │
│  userId       ObjectId  (FK → users._id)  [index]    │
│  title        String                                 │
│  description  String                                 │
│  priority     'high' | 'medium' | 'low'              │
│  status       'pending' | 'completed'                │
│  deadline     String (ISO date, nullable)            │
│  dateTime     String (ISO datetime, nullable)        │
│  tags         [String]                               │
│  completedAt  Date (nullable)                        │
│  createdAt    Date  (auto)                           │
│  updatedAt    Date  (auto)                           │
└──────────────────────────────────────────────────────┘
```

---

## Adding the backend URL to the React Native app

If you switch from Firebase to this API, update `src/services/taskService.ts` and `src/services/authService.ts` to call `https://your-api-host/api/...` instead of the Firestore SDK.  
A simple approach is to put `BASE_URL=http://10.0.2.2:5000` (Android emulator) in a `.env` file and use it with `@env`.
