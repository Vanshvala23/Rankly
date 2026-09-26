# Rankly SEO

Rankly is a responsive SEO marketing site and lightweight on-page content checker. It helps a writer review page titles, meta descriptions, target keyword placement, content length, headings, and secure URLs, then previews the Google search snippet. Checker content is analyzed in the browser and is not sent to the server.

## Features

- Responsive landing page, pricing, FAQ, rotating testimonials, mobile navigation, and account menu
- On-page SEO checklist and live search-result snippet preview
- Account registration, login, signed sessions, and audit-request capture through the API
- MongoDB persistence for accounts and audit leads
- Express server for local development and Netlify Functions deployment

## Run locally

1. Use Node.js 22.9 or newer and run `npm install`.
2. Copy `.env.example` to `.env`.
3. Set `SESSION_SECRET` to a long random value and `MONGODB_URI` to a MongoDB connection string in `.env.local` (the ignored private override) or in `.env`.
4. Run `npm start` and open `http://localhost:3000`.

The SEO content checker runs without an account or database. Registration, login, and audit requests need a reachable MongoDB database. In Netlify, configure `SESSION_SECRET` and `MONGODB_URI` as environment variables.

## On-page score

The checklist checks eight basics: title length, description length, target keyword in title and description, target keyword in body, a 300-word content baseline, heading structure, and an HTTPS page URL. It is an educational starting point, not a substitute for real search analytics or a technical crawl.
