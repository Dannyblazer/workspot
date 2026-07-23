# WorkSpot — Workspace Booking Platform

> **Previously DeskNear** | A full-stack React application for discovering, booking, and managing shared workspaces across Nigeria.

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

### Key Highlights
- 🇳🇬 **NGN Currency** — All pricing in Nigerian Naira (₦)
- 📍 **Nigerian Locations** — Workspaces in Lagos, Abuja, Port Harcourt, Ibadan
- ⚡ **Instant Booking** — Real-time availability with immediate confirmation
- 🔐 **Secure Payments** — Paystack-integrated payment flow
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
| **Icons** | Custom SVG icon components |
| **State Management** | React Hooks (`useState`, `useEffect`, `useMemo`) |
| **Routing** | Client-side view switching |
| **Build Tool** | None — zero-build setup with CDN dependencies |

---

## Project Structure

```
workspot/
├── index.html              # Entry point — loads React, Tailwind, Babel, and app.js
├── app.js                  # Main application (all React components)
├── assets/
│   └── js/
│       └── app.js          # Alternative path (legacy support)
└── README.md               # This file
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

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- An internet connection (for CDN dependencies)

### Installation

1. **Clone or download** the project files:
   ```bash
   git clone https://github.com/your-org/workspot.git
   cd workspot
   ```

2. **Serve the files** using any static file server:
   ```bash
   # Python 3
   python -m http.server 3000

   # Node.js (npx)
   npx serve .

   # PHP
   php -S localhost:3000
   ```

3. **Open** `http://localhost:3000` in your browser.

> **Note:** The original project used `assets/js/app.js` as the script path. The updated version uses `app.js` in the root directory. Ensure your `index.html` `<script>` tag points to the correct location:
> ```html
> <script type="text/babel" src="app.js"></script>
> ```

---

## User Roles

### 1. Workspace Seeker (User)
- Browse and search workspaces
- Book workspaces (hourly/daily/weekly/monthly)
- Manage favorites
- View booking history and spending

**Demo Login:**
- Email: `alex@example.com`
- Role: **Workspace Seeker**

### 2. Workspace Owner
- All user features
- Add and manage workspaces
- Edit availability in real-time
- View revenue and occupancy analytics

**Demo Login:**
- Email: `sarah@example.com`
- Role: **Workspace Owner**

### 3. SuperAdmin
- All owner features
- Platform-wide analytics dashboard
- Manage all users, workspaces, and bookings
- Monitor revenue and platform health

**Demo Login:**
- Email: `admin@workspot.ng`
- Role: **Admin**

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

### Workspace Object
```javascript
{
  id: Number,
  name: String,
  address: String,
  image: String,           // Primary image URL
  images: [String],        // Gallery image URLs
  rating: Number,
  reviews: Number,
  description: String,
  amenities: [String],     // From predefined AMENITIES_LIST
  pricing: {
    hourly: Number,        // NGN
    daily: Number,
    weekly: Number,
    monthly: Number
  },
  ownerId: String,
  availability: {
    hourly: { total: Number, booked: Number },
    daily:  { total: Number, booked: Number },
    weekly: { total: Number, booked: Number },
    monthly:{ total: Number, booked: Number }
  },
  featured: Boolean
}
```

### Booking Object
```javascript
{
  id: Number,
  workspaceId: Number,
  userId: String,
  userName: String,
  workspaceName: String,
  type: "hourly" | "daily" | "weekly" | "monthly",
  quantity: Number,
  date: String,            // YYYY-MM-DD
  total: Number,           // NGN (includes 5% service fee)
  status: "confirmed" | "pending"
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
- This is a **zero-build** project — no Webpack, Vite, or build step required
- All components are in a single `app.js` file for simplicity
- Tailwind classes are used directly in JSX
- State is managed via React Hooks (no Redux, Zustand, etc.)

---

## Roadmap

- [ ] Backend API integration (Node.js/Express or Python/FastAPI)
- [ ] Database persistence (PostgreSQL or MongoDB)
- [ ] Real-time availability updates via WebSockets
- [ ] Mobile app (React Native or Flutter)
- [ ] Paystack payment gateway integration
- [ ] Email notifications for bookings
- [ ] Workspace verification and approval workflow
- [ ] Review and rating system (currently mock data)
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
