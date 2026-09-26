# Rankly SEO

Rankly is a responsive SEO marketing site and lightweight on-page content checker. It helps a writer review page titles, meta descriptions, target keyword placement, content length, headings, and secure URLs, then previews the Google search snippet. Manually entered checker content is analyzed in the browser. Live URL analysis fetches public HTML through the server endpoint.

## Features

- Responsive landing page, pricing, FAQ, rotating testimonials, mobile navigation, and account menu
- On-page SEO checklist and live search-result snippet preview
- Live HTTPS page analysis that loads title, meta description, and readable page copy from public HTML pages
- Account registration, login, signed sessions, and audit-request capture through the API
- MongoDB persistence for accounts and audit leads
- Express server for local development and Netlify Functions deployment

## Run locally

1. Use Node.js 22.9 or newer and run `npm install`.
2. Copy `.env.example` to `.env`.
3. Set `SESSION_SECRET` to a long random value and `MONGODB_URI` to a MongoDB connection string in `.env.local` (the ignored private override) or in `.env`.
4. Run `npm start` and open `http://localhost:3000`.

The SEO checker runs without an account or database. Use **Analyze live page** with a public HTTPS page to fetch its title, description, and text, or paste details manually. Live analysis follows up to three redirects and only requests public hosts on HTTPS port 443. Registration, login, and lead capture need a reachable MongoDB database. In Netlify, configure `SESSION_SECRET` and `MONGODB_URI` as environment variables.

## On-page score

The checklist checks eight basics: title length, description length, target keyword in title and description, target keyword in body, a 300-word content baseline, heading structure, and an HTTPS page URL. It is an educational starting point, not a substitute for real search analytics or a technical crawl.
