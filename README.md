# Spin & Win Campaign

A standalone Next.js (App Router) app implementing a lead-generation "Spin & Win" prize wheel
with a server-authoritative prize engine and an authenticated admin dashboard.

## Stack

Next.js 14 · React 18 · TypeScript · Tailwind CSS · MongoDB Atlas · Mongoose

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` (already present with dev placeholders) and fill in:
   - `MONGODB_URI` — an Atlas connection string. Must point at a replica-set cluster
     (all Atlas clusters, including the free M0 tier, are replica sets) since prize
     reservation uses multi-document transactions.
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD` — admin dashboard credentials.
   - `ADMIN_SESSION_SECRET` — long random string used to sign the admin session cookie.
   - `FLIGHT_TICKET_QTY` / `TSHIRT_QTY` / `COUPON_20_QTY` / `COUPON_15_QTY` — initial prize
     inventory. Must sum to exactly 800.
3. Seed the initial prize inventory (only runs once — refuses to touch an existing campaign):
   ```bash
   npm run seed
   ```
4. Run the dev server:
   ```bash
   npm run dev
   ```

## Routes

- `/spin` — public campaign page (form → wheel → result). `/` redirects here.
- `/dashboard` — admin dashboard (stats, participants, inventory). Requires login.
- `/dashboard/login` — admin login.
- `POST /api/spin` — the only public write endpoint. Validates input, atomically reserves a
  prize inside a MongoDB transaction, and returns the server-selected result.
- `GET /api/spin` — lets the page know (via a non-sensitive signed cookie) whether this browser
  already has a result to show, and whether the campaign is exhausted.
- `/api/admin/*` — stats, participants, export, inventory, login, logout. All except login
  require a valid admin session cookie.

## How oversubscription is prevented

Every spin runs inside one MongoDB transaction: check for an existing participant (by email or
phone) → weighted-random pick among prize types with remaining stock → atomic conditional
decrement (`remainingQuantity: { $gt: 0 }`) → insert the participant record → commit. If two
requests race for the same prize, MongoDB's transaction conflict detection causes one to retry
automatically; the retry re-reads current stock, so it never oversells. Because the four prize
quantities always sum to exactly 800 and every participant consumes exactly one unit, total
spins can never exceed 800 without a separate counter.

## Notes

- No client-side randomness is ever used to pick a prize — the wheel only visualizes the prize
  the server already returned.
- Admin credentials and the MongoDB URI are read from `.env.local` only; nothing is exposed to
  client-side JavaScript.
