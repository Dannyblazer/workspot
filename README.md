# WorkSpot — Workspace Booking Platform

> A platform for discovering, booking, and managing shared workspaces across Nigeria.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [User Roles](#user-roles)
- [Screenshots](#screenshots)
- [API & Data Model](#api--data-model)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

WorkSpot is a modern workspace booking platform built for the Nigerian market. It connects workspace seekers with workspace owners, enabling flexible bookings by the hour, day, week, or month. The platform supports three user roles — **Users**, **Owners**, and **SuperAdmins** — each with tailored dashboards and functionality.

It is a full-stack app: a zero-build React frontend backed by a **Go (Gin) + PostgreSQL** API with JWT authentication. Money and availability are computed and enforced **server-side** — bookings are transactional (no overbooking), fees are calculated by the API, and owner balances are derived from real data.

### Key Highlights
- 🇳🇬 **NGN Currency** — All pricing in Nigerian Naira (₦)
- 📍 **Nigerian Locations** — Workspaces in Lagos, Abuja, Port Harcourt, Ibadan
- ⚡ **Transactional Booking** — `SELECT ... FOR UPDATE` guards prevent overbooking and last-slot races
- 🔐 **JWT Auth** — Role-based access (user/owner/superadmin); token stored in `localStorage`
- 💰 **Server-computed money** — 5% booking fee, 1.5% withdrawal fee, derived owner balances
- 📊 **Admin Analytics** — Revenue tracking, occupancy rates, user management

---

## Features

### For Workspace Seekers (Users)
| Feature | Description |
|---------|-------------|
| 🔍 **Discover** | Browse and filter workspaces by location, price, amenities, and availability |
| ❤️ **Favorites** | Save workspaces to a personal favorites list |
| 📅 **Bookings** | Book by hour, day, week, or month with instant confirmation |
| 🧾 **My Bookings** | View booking history, status, and total spend |
| 🏢 **Workspace Details** | Full gallery, reviews, amenities, and pricing breakdown |

### For Workspace Owners
| Feature | Description |
|---------|-------------|
| 🏗️ **Add Workspace** | List new workspaces with multi-select amenities, pricing tiers, and availability |
| 📊 **Owner Dashboard** | Revenue stats, occupancy rate, and recent bookings |
| 🏢 **My Workspaces** | Manage all listed workspaces and edit availability |
| 📋 **Booking Management** | View all bookings for owned workspaces |

### For SuperAdmins
| Feature | Description |
|---------|-------------|
| 📈 **Revenue Overview** | Platform-wide revenue analytics and trends |
| 🏢 **All Workspaces** | Search, filter, and monitor every workspace on the platform |
| 📋 **All Bookings** | Full booking history across all users and workspaces |
| 👤 **User Management** | View all registered users with role-based filtering |
| 🏷️ **Featured Control** | Manage which workspaces appear in the featured section |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 (CDN), JSX via Babel Standalone |
| **Styling** | Tailwind CSS (CDN) |
| **API client** | `assets/js/api.js` — dependency-free `fetch` wrapper on `window.api` |
| **State Management** | React Hooks (`useState`, `useEffect`, `useMemo`) |
| **Frontend build** | None — zero-build setup with CDN dependencies |
| **Backend** | Go 1.26 + [Gin](https://github.com/gin-gonic/gin) |
| **Database** | PostgreSQL 18 (via [pgx/v5](https://github.com/jackc/pgx)) |
| **Auth** | JWT ([golang-jwt/jwt/v5](https://github.com/golang-jwt/jwt)) + bcrypt password hashing |
| **Migrations/Seed** | Embedded `.sql` files run at startup (`embed.FS`), tracked in `schema_migrations` |

---

## Project Structure

```
workspot/
├── index.html                  # Entry point — loads React, Tailwind, Babel, api.js, app.js
├── assets/
│   └── js/
│       ├── api.js              # API client (window.api) — loaded before app.js
│       └── app.js              # Main application (all React components)
├── backend/
│   ├── main.go                 # Config load, DB connect, migrate+seed, start Gin
│   ├── .env.example            # DB_URL, JWT_SECRET, PORT, CORS_ORIGIN + demo creds
│   └── internal/
│       ├── config/             # env parsing
│       ├── database/           # pgxpool connect, migration runner, migrations/ + seed/ SQL
│       ├── models/             # structs + JSON tags matching the frontend shapes
│       ├── auth/               # bcrypt, JWT sign/parse, RequireAuth/RequireRole middleware
│       ├── handlers/           # auth, workspaces, bookings, favorites, owner, withdrawals, admin
│       └── server/             # route table + CORS
└── README.md                   # This file
```

### Component Architecture

```
App (root)
├── Navbar                  # Role-aware navigation
├── AuthModal               # Login/Signup with role selection
├── Hero                    # Landing page search banner
├── FeaturedSection         # Curated workspace cards
├── HowItWorks              # 3-step process explanation
├── ListingsView            # Searchable/filterable workspace grid
├── WorkspaceDetails        # Full workspace page (gallery, reviews, pricing)
├── BookingModal            # 2-step booking + payment flow
├── AddWorkspaceModal       # Owner workspace creation form
├── EditAvailabilityModal   # Owner availability management
├── UserDashboard           # User stats + recent bookings
├── OwnerDashboard          # Owner stats + revenue
├── OwnerWorkspaces         # Owner workspace list
├── OwnerBookings           # Owner booking list
├── SuperAdminDashboard     # Admin analytics + management
├── FavoritesView           # User favorites grid
├── MyBookingsView          # User booking history
└── Footer                  # Site-wide footer
```

---

## Getting Started

The app has two parts: the **Go/Postgres backend** (API on `:8080`) and the **static frontend** (served on `:3000`). Start the backend first.

### Prerequisites
- **Go 1.26+**
- **PostgreSQL 18** running locally (or any reachable Postgres)
- A modern web browser + internet connection (frontend CDN dependencies)

### 1. Backend

```bash
cd backend
cp .env.example .env          # then edit DB_URL / JWT_SECRET as needed
go run .
```

On first boot the server connects to Postgres, runs the embedded migrations, and seeds demo data — all idempotent (tracked in `schema_migrations`). You should see `WorkSpot API listening on :8080`.

`.env` keys:

| Key | Default | Purpose |
|-----|---------|---------|
| `PORT` | `8080` | API listen port |
| `DB_URL` | `postgres://…/workspot_db?sslmode=disable` | Postgres connection string |
| `JWT_SECRET` | `dev-secret-change-me` | **Change in any real deployment** |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed frontend origin |

### 2. Frontend

Serve the project root with any static file server:

```bash
# from the workspot/ root
python -m http.server 3000
# or: npx serve .
```

Open `http://localhost:3000`. The frontend talks to `http://localhost:8080/api` by default (override with `window.API_BASE` before `api.js` loads).

> **Note:** `index.html` loads `assets/js/api.js` **before** the Babel `assets/js/app.js`. The API client (`window.api`) must exist before the app renders.

---

## User Roles

All seeded demo accounts use the password `password123`.

### 1. Workspace Seeker (User)
- Browse and search workspaces
- Book workspaces (hourly/daily/weekly/monthly)
- Manage favorites
- View booking history and spending

**Demo Login:**
- Email: `alex@example.com`
- Password: `password123`

### 2. Workspace Owner
- All user features
- Add and manage workspaces
- Edit availability in real-time
- View revenue and occupancy analytics
- Withdraw earnings (balance = revenue − withdrawals)

**Demo Login:**
- Email: `sarah@example.com` (owns the 6 seeded workspaces)
- Password: `password123`

### 3. SuperAdmin
- Platform-wide analytics dashboard
- Manage all users, workspaces, and bookings
- Monitor revenue and platform health
- **Cannot be granted via signup** — seeded only

**Demo Login:**
- Email: `admin@workspot.ng`
- Password: `password123`

---

## Screenshots

### Landing Page
Hero section with location search and booking type selector.

### Workspace Listings
Filterable grid with search, amenity filters, and sort options.

### Workspace Details
Image gallery with thumbnails, reviews tab, amenities grid, and sticky pricing card.

### Booking Flow
Two-step modal: select booking type/quantity/date → payment details.

### Owner Dashboard
Revenue cards, occupancy stats, and recent booking feed.

### SuperAdmin Dashboard
Platform overview with revenue chart, top workspaces, and user management.

---

## API & Data Model

All endpoints are under `/api`. Auth is `Authorization: Bearer <jwt>`.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/auth/register` | – | Create user (role `user`/`owner` only), return `{token, user}` |
| POST | `/auth/login` | – | Return `{token, user}` |
| GET | `/auth/me` | any | Current user from JWT |
| GET | `/workspaces` | – | List all workspaces (with tiers + derived rating) |
| GET | `/workspaces/:id` | – | Workspace detail |
| GET | `/workspaces/:id/reviews` | – | Reviews for a workspace |
| POST | `/workspaces` | owner | Create workspace + tiers (owner from JWT) |
| PATCH | `/workspaces/:id/availability` | owner | Update tier totals (must own it) |
| POST | `/bookings` | any | **Transactional** booking — 409 if not enough availability |
| GET | `/bookings` | any | Role-scoped: user→own, owner→their workspaces', admin→all |
| GET | `/favorites` | any | User's favorite workspace ids |
| POST | `/favorites/:workspaceId` | any | Add favorite |
| DELETE | `/favorites/:workspaceId` | any | Remove favorite |
| GET | `/owner/stats` | owner | Revenue, withdrawn, balance, occupancy |
| GET | `/withdrawals` | owner | Withdrawal history |
| POST | `/withdrawals` | owner | **Transactional** withdrawal (validates balance) |
| GET | `/admin/stats` | superadmin | Platform totals |
| GET | `/admin/users` | superadmin | All users with booking counts |

**Server-computed money (never trusted from client):** booking `fee = round(subtotal × 0.05)`; withdrawal `fee = round(amount × 0.015)`. **Ratings and owner balances are derived** on read (`AVG(rating)`, `SUM(bookings.total) − SUM(withdrawals.amount)`), never stored.

### Workspace Object (API response)
```javascript
{
  id: String,              // uuid
  ownerId: String,         // uuid
  name: String,
  address: String,
  image: String,           // Primary image URL
  images: [String],        // Gallery image URLs
  rating: Number,          // derived AVG(rating), rounded to 1dp
  reviews: Number,         // derived COUNT(*)
  description: String,
  amenities: [String],     // From predefined AMENITIES_LIST
  pricing: {
    hourly: Number,        // NGN
    daily: Number,
    weekly: Number,
    monthly: Number
  },
  availability: {
    hourly: { total: Number, booked: Number, available: Number },
    daily:  { total: Number, booked: Number, available: Number },
    weekly: { total: Number, booked: Number, available: Number },
    monthly:{ total: Number, booked: Number, available: Number }
  },
  featured: Boolean
}
```

### Booking Object (API response)
```javascript
{
  id: String,              // uuid
  workspaceId: String,
  userId: String,
  userName: String,
  workspaceName: String,
  type: "hourly" | "daily" | "weekly" | "monthly",
  quantity: Number,
  date: String,            // YYYY-MM-DD
  subtotal: Number,        // NGN
  fee: Number,             // NGN (5% service fee)
  total: Number,           // NGN (subtotal + fee)
  status: "confirmed" | "pending" | "cancelled"
}
```

### Predefined Amenities (28 options)
```javascript
[
  "WiFi", "Coffee", "Meeting Rooms", "Parking", "24/7 Access", "Printing",
  "Kitchen", "Bike Storage", "Event Space", "Mentorship", "Mail Handling",
  "Phone Booths", "Lockers", "Shower", "Organic Cafe", "Garden", "Yoga Room",
  "EV Charging", "Recycling", "Server Room", "Gaming Lounge", "Snacks",
  "Air Conditioning", "Security", "CCTV", "Reception", "Lounge Area", "Whiteboard"
]
```

---

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Notes
- The **frontend** is a **zero-build** project — no Webpack, Vite, or build step. JSX is compiled in-browser by Babel Standalone.
- Frontend components live in `assets/js/app.js`; the API client is in `assets/js/api.js`.
- The **backend** is standard Go — `go run .` from `backend/`. Migrations and seed run automatically on boot.
- Tailwind classes are used directly in JSX; frontend state is managed via React Hooks (no Redux/Zustand).

---

## Roadmap

- [x] Backend API integration (Go / Gin)
- [x] Database persistence (PostgreSQL)
- [x] JWT authentication with role-based access
- [x] Transactional bookings (no overbooking) and server-computed money
- [x] Review and rating system (derived from real review rows)
- [ ] Real-time availability updates via WebSockets
- [ ] Paystack payment gateway integration (booking payment step is currently mock)
- [ ] Email notifications for bookings
- [ ] Workspace verification and approval workflow
- [ ] Mobile app (React Native or Flutter)
- [ ] Multi-city expansion beyond Nigeria

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Acknowledgements

- Images via [Unsplash](https://unsplash.com)
- Icons via custom SVG components
- UI inspired by modern marketplace platforms

---

<p align="center">
  <strong>WorkSpot</strong> — Find your perfect workspace, anywhere in Nigeria.<br/>
  Built with ❤️ for the Nigerian tech community.
</p>
