# Aura Chatting Pro

![License](https://img.shields.io/badge/license-Non-Commercial%20%2B%20Commercial%20Available-orange)
![Language](https://img.shields.io/badge/language-TypeScript-blue)
![Coverage](https://img.shields.io/badge/coverage-NA-lightgrey)


Table of contents
- About
- Why this project
- High-level architecture
- Features (detailed)
- Screenshots & assets
- Tech stack
- System requirements
- Quickstart — development
- Environment variables
- Scripts & npm tasks
- Database & migrations
- API / server notes (tRPC)
- Storage & media
- Real-time & scaling guidance
- Security & privacy
- Testing
- CI / CD suggestions
- Deployment guides (Web, Mobile, Server, Docker)
- Code style & linting
- Contributing (non-commercial rules, CLA)
- Commercial licensing & purchase flow
- Enforcement & detection playbook
- Legal & license summary
- Support & contact
- Roadmap & changelog
- Appendix: useful commands and references


About
-----
Aura Chatting Pro is a full-stack, TypeScript-first scaffold for building chat and matching experiences on web and mobile. It provides opinionated UI patterns (swipes, matches, chat lists), client-side architecture (Expo / React Native + web), a sample backend (tRPC + Node), storage helpers, database schema examples (Drizzle), and developer tooling so teams can prototype or ship a messaging product faster.

This repository is published under a source-available non-commercial license. Non-commercial use (personal, educational, research, demo) is allowed. Commercial use requires a paid commercial license — contact: redpixel.games@gmail.com. See LICENSE for full terms.

Why this project
----------------
- Speed: opinionated patterns, component library, and server examples accelerate development.
- Modularity: swap authentication, DB, or storage quickly.
- Developer experience: TypeScript strictness, tRPC type-safety, and example tests.
- Production-ready patterns: migration strategy, storage helpers, and LLM/AI integration examples.

High-level architecture
-----------------------
- Client: React Native (Expo) for mobile with web support. App routes live in `app/` and reusable components in `components/`.
- API: Node.js server exposing tRPC procedures. The server contains `server/routers.ts`, `server/db.ts`, and helpers under `server/_core/`.
- Database: example schema in `drizzle/` and migrations powered by `drizzle-kit` (or your preferred ORM/migration workflow).
- Storage: S3-compatible helpers in `server/storage.ts` for file uploads and retrieval.
- LLM/helpers: server-side utilities for image generation and transcription (do NOT call from client directly).

Features (detailed)
-------------------
The following is a deep list of features included or scaffolded in the repo. Some features are implemented as examples or mocks; adapt to your product needs.

1. Authentication & Users
- Phone number + OTP flow (example)
- Social logins (Google / Apple) hooks
- Token management (JWT / cookie examples)
- User model with profile fields, verification status, and roles

2. Onboarding & Profile
- Multi-step onboarding (name, gender, interests, photos, bio)
- Photo gallery upload with validation
- Interests selection UI with chips
- Privacy controls and settings

3. Discovery & Matching
- Card swipe UX (left/right/up) with animated overlays
- Match modal and match lifecycle (create match, open chat)
- Ranking basics & paywall hooks (boost / priority)

4. Chat & Conversations
- Matches list with unread badges
- Chat UI with message bubbles, typing indicator, delivery/read states
- Reactions, quick replies, attachments (images), and basic moderation flags

5. Subscriptions & Paywall (UI)
- Example plans: Free / Gold / Platinum
- Paywall screen and plan comparisons
- Placeholders for Stripe / IAP integration

6. Server & Platform helpers
- tRPC public and protected procedures
- Drizzle schema and example queries
- Storage helpers for S3 uploads and signed URLs
- LLM helpers for server-side AI features (image gen, transcription)

7. Developer utilities
- Scripts for local workflow (build, dev, db:push)
- Tests (Vitest) skeleton
- Add-license-headers script (dry run)

Screenshots & assets
--------------------
Place screenshots in `assets/screenshots/` and reference them in this README. Recommended set:
- /assets/screenshots/splash.png
- /assets/screenshots/onboarding.png
- /assets/screenshots/swipe.png
- /assets/screenshots/match.png
- /assets/screenshots/chat.png

Tech stack
----------
- TypeScript (primary language)
- React / React Native / Expo
- tRPC (API layer)
- Drizzle ORM
- Node.js
- Optional real-time: Socket.IO or raw WebSocket
- CI: GitHub Actions (recommended)

System requirements
-------------------
- Node.js >= 20
- pnpm (recommended) or npm / yarn
- Expo CLI for mobile development (Optional if working only on web)
- Local DB for server: MySQL / MariaDB / PostgreSQL depending on your drizzle config

Quickstart — development
------------------------
1. Clone

```
git clone https://github.com/proyecto1095si1-boop/aura-chatting-pro.git
cd aura-chatting-pro
```

2. Install
```
pnpm install
```

3. Environment
```
cp .env.example .env
# Edit .env with DATABASE_URL, JWT_SECRET, etc.
```

4. Start
```
pnpm dev
```
This runs the server and the Expo dev workflow. See `package.json` scripts for details.

Expo mobile
-----------
- Open the Metro/Expo server URL in Expo Go or run `pnpm ios` / `pnpm android` for simulators.

Environment variables
---------------------
The project expects certain environment variables. Adapt to your setup. Example list (check `server/_core/env` for specifics):

- DATABASE_URL — connection string for your DB
- JWT_SECRET — secret for signing tokens
- EXPO_PUBLIC_API_BASE_URL — API url for client
- S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY — for storage (or use your cloud provider equivalent)
- LLM_API_KEY — server-side LLM provider key
- OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET — for Google/Apple if used

Scripts & npm tasks
-------------------
- pnpm dev — run dev server + client
- pnpm dev:server — start server only
- pnpm dev:metro — start expo metro
- pnpm build — bundle server (esbuild)
- pnpm start — run production server
- pnpm test — run Vitest tests
- pnpm format — Prettier
- pnpm lint — lint with ESLint
- pnpm db:push — drizzle migrations (generate & migrate)

Database & migrations
---------------------
- Schema is in `drizzle/schema.ts`. Use `drizzle-kit` to generate and run migrations.
- Example: `pnpm db:push` will run drizzle-kit generate and migrate (ensure DATABASE_URL configured).

API / server notes (tRPC)
-------------------------
- `server/routers.ts` contains the main router. Use `publicProcedure` for open endpoints and `protectedProcedure` for ones requiring auth.
- To call server locally from client, set EXPO_PUBLIC_API_BASE_URL to `http://localhost:PORT` and ensure CORS and cookies are configured properly.
- For server-side LLM and image generation helpers, call from tRPC procedures to protect keys.

Storage & media
---------------
- `server/storage.ts` contains storage helpers that upload to a storage provider (S3 or compatible). The helpers return public URLs or signed download URLs depending on configuration.
- Best practice: upload from client to server (or generate client signed urls) to avoid exposing provider credentials.

Real-time & scaling guidance
----------------------------
- For small projects, Socket.IO with a single node is fine. For larger scale, use Redis adapter for socket clustering, sticky sessions/load balancer or a managed WebSocket infrastructure (e.g., Pusher, Ably).
- Use a message broker (Redis, Kafka) for background jobs and notifications.
- Use autoscaling and horizontal DB scaling (read replicas) when user base grows.

Security & privacy
------------------
- Never put API keys or secrets in client code. Put them in server env vars.
- Use HTTPS for all endpoints in production.
- Hash passwords (bcrypt) and use short-lived JWTs or session cookies.
- Validate file uploads and sanitize inputs.
- Follow responsible disclosure: see SECURITY.md for how to report vulnerabilities.

Testing
-------
- Unit tests: Vitest. Add tests under `tests/`.
- Integration tests: consider spinning a test DB using Docker and running migrations before tests.
- E2E: use Detox or Cypress for mobile/web flows.

CI / CD suggestions
-------------------
- Use GitHub Actions to run `pnpm install`, tests, lint, and build steps on PRs.
- On merge to main, run build and publish Docker image for the server and build static assets for web.
- For mobile, consider EAS or Expo builds executed by CI with secrets stored in the CI provider.

Deployment guides
-----------------
Web client
- Build static assets and host behind CDN (Vercel, Netlify, or S3 + CloudFront).
Mobile
- Use Expo EAS to build binaries or publish to app stores.
Server
- Dockerize server (create Dockerfile) and deploy to a host (AWS ECS, Google Cloud Run, DigitalOcean App Platform, or a VPS).
- Ensure env vars and secrets are configured per environment.

Docker example (simple)
```
# Dockerfile (example)
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
CMD ["node","dist/index.js"]
```

Code style & linting
--------------------
- TypeScript strict mode is recommended.
- ESLint + Prettier configured in devDependencies. Run `pnpm lint` and `pnpm format` before PRs.

Contributing (non-commercial rules)
-----------------------------------
Contributions are welcome for non-commercial use. Please read `CONTRIBUTING.md` and sign the Contributor License Agreement in `legal/contributor-license-agreement.md`.

Key points:
- Contributions are accepted under the repository's non-commercial license. If you intend to contribute for use in a commercial product, contact the maintainers first.
- Keep commits focused and add tests for behavior changes.

Commercial licensing & purchase flow
-----------------------------------
This project is licensed for Non-Commercial Use by default. For any Commercial Use — including embedding into a paid product, offering as a service, or using in a product that earns revenue — you must obtain a paid commercial license before deployment.

How to request a commercial license:
1. Email: redpixel.games@gmail.com
2. Provide: company/individual name, description of commercial use, estimated scale (users/instances), whether you will redistribute, desired timeline.
3. After negotiation you will receive a written license and an invoice. Payment methods accepted (after contact and private instructions): cryptocurrency (BTC/ETH/other agreed tokens), PayPal (business), or Stripe (card).

Do NOT attempt to pay before contacting the maintainer; no commercial use is permitted without a signed license and payment as agreed.

Enforcement & detection playbook
--------------------------------
- Monitor public code (GitHub search/Sourcegraph) for your project's unique strings.
- Use Google Alerts for product names, and periodically scan app stores for matching screenshots or product descriptions.
- Keep a license registry (CSV or database) listing sold licenses, buyer, commit id, and terms — essential for enforcement.
- Templates for C&D and DMCA takedown are in `legal/` to speed response when you detect violations.

Legal & license summary
-----------------------
- Repository uses a source-available, non-commercial license. See `LICENSE` for full terms.
- The license requires a paid commercial license (standard base fee: USD 2,000, negotiable) to use the Software commercially.
- The maintainer is located in Argentina; the license text references governing law and dispute venue as specified in LICENSE.

Support & contact
-----------------
- Licensing & Commercial inquiries: redpixel.games@gmail.com
- Bugs & feature requests: open an issue on GitHub
- Security reports: follow instructions in SECURITY.md (email redpixel.games@gmail.com)

Roadmap & changelog
-------------------
See `ROADMAP.md` (if present) or the project issues for planned features. Consider tagging releases and keeping a `CHANGELOG.md` for users.

Appendix: useful commands & references
-------------------------------------
- Install: `pnpm install`
- Dev: `pnpm dev`
- Test: `pnpm test`
- Build: `pnpm build`
- Lint & format: `pnpm lint` / `pnpm format`
- Migrate DB: `pnpm db:push`


---

If you want, I can now commit this README.md to the repository. I can also:
- Add example screenshots to `assets/screenshots/` and wire them into the README.
- Create a `docs/` folder with a longer developer guide and API reference generated from server files.
- Generate a shorter landing README for the repo front page and keep this long form in `docs/README-full.md` instead.

Tell me how you want me to proceed ("Commit README to main", "Add screenshots", or "Move long README to docs/").