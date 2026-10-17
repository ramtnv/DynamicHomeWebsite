# Atelier & Co. — Dynamic Business Website

A responsive React website with a protected administration area. The Express API persists its published/draft content, theme settings, products, admin sessions, and contact messages in SQLite. Images uploaded in the admin are stored on disk.

## Requirements

- Node.js 20.19+ or 22.12+ (Node 25 also works)
- npm

## Run locally

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Copy `.env.example` to `.env` and set `ADMIN_EMAIL` plus a unique `ADMIN_PASSWORD` of at least 12 characters. The initial Super Admin account is created on the first server start. Credentials are hashed with bcrypt and are never sent to the browser.

3. Start the API and Vite development server:

   ```powershell
   npm run dev
   ```

4. Open the Vite URL shown in the terminal (normally `http://localhost:5173`) and visit `/admin` to sign in.

The development server proxies API and uploaded-image requests to Express on port 3001. SQLite creates `data/site.sqlite` automatically. After the first admin has been created, changing `ADMIN_PASSWORD` will not reset it. To reset a local admin, stop the server, back up the database, remove the `admins` and `sessions` rows from that local database, and restart with the new environment credentials.

## Build and run

```powershell
npm run typecheck
npm run build
npm start
```

Set `NODE_ENV=production` and configure HTTPS at the hosting platform or reverse proxy before deployment. The Express server serves the Vite build and API from the same origin. Set `DATABASE_PATH` and `UPLOAD_DIRECTORY` to durable mounted storage; SQLite and local uploads require persistent volumes and are not suitable for ephemeral serverless filesystems. For horizontal scaling, move SQLite, uploads, and rate-limit/session storage to shared managed services.

## What is included

- Public Home, Products, About Us, and Contact Us pages with mobile navigation, responsive product cards, search, category filtering, sorting, detail pages, accessible forms, and useful loading/error/empty states.
- Compact product and cart grids with quantity controls, an iframe image preview, a checkout payment-preference dropdown (Cash, UPI, or Card; no payment is processed), and an order confirmation page with a downloadable PDF summary.
- `/admin` dashboard with a separately routed login, environment-seeded Super Admin, bcrypt password hashes, opaque expiring HttpOnly/SameSite cookies, server-side session records, CSRF tokens, login/contact rate limits, and protected management routes.
- General branding and SEO fields, logo/favicon upload and preview, draft/publish settings, live draft preview, five theme presets and custom colors, typography, button/card shape, shadows, spacing, and container width.
- Editable, reorderable, and hideable homepage/About sections; configurable contact details and form success message.
- Product create/edit/delete, publication/visibility, image upload, price/discount validation, search, category filter, pagination, and manual ordering.
- Contact form messages validated by both the browser and API, stored in SQLite, and protected by a honeypot and rate limit. Add an email provider if inbox notifications are required.
- Server validation rejects unsafe theme contrast (WCAG AA 4.5:1 for configured text/button pairs), unsafe link schemes, unsupported image types, oversized uploads, and image content that does not match its declared format.

## Data and deployment notes

The database schema is initialized and migrated at server startup in `server/db.ts`; back up `data/site.sqlite` and `data/uploads/` together. Public endpoints only read published website settings and active published products. Admin settings can be saved as a draft and explicitly published. Product visibility/publication changes apply immediately when saved. Orders retain the selected payment preference for identification only; payment processing is intentionally not included. Customers can download their order list as a PDF from the confirmation page.

This project does not send contact messages by email, include cloud media storage, or configure a hosted database, CDN, or mail provider. Configure those external services before using the site at production scale. Keep `.env`, the SQLite database, and uploaded media out of source control and provide HTTPS in production.
