# Aura Chatting Pro

![License](https://img.shields.io/badge/license-Non-Commercial%20%2B%20Commercial%20Available-orange)

Important: Aura Chatting Pro is provided under a non-commercial source-available license. Modifications and redistribution are allowed for strictly non-commercial purposes. Commercial use requires a paid commercial license. For licensing inquiries contact: redpixel.games@gmail.com

---

## Project Overview

Aura Chatting Pro is a modern, modular chat application scaffold built primarily in TypeScript. It provides a polished UI, chat flows, and a starting point for building real-time messaging experiences for web and mobile platforms. The repository contains client and server components, utilities, and example code to accelerate development.

This project is intended to be used, studied, and modified for non-commercial purposes (personal use, learning, research, demos). If you plan to use the Software commercially (including embedding it into a paid product, providing it as a service, or otherwise monetizing it), you must obtain a commercial license as described in the LICENSE file.

---

## Key Features

- TypeScript-first codebase with strong typing and modern build tooling.
- Modular UI components for profiles, swipes, matches, and chat conversations.
- Example real-time chat workflows (socket and/or polling ready).
- Subscription/paywall UI sketches and sample subscription flows.
- Server-side utilities: tRPC API examples, database schema (Drizzle), storage helpers, and LLM/AI integration helpers.
- Mobile-ready: React Native + Expo scaffolding included in the template.

---

## Tech Stack

- TypeScript
- React Native / Expo (client)
- tRPC (api layer)
- Drizzle ORM (schema examples)
- Node.js (server-side examples)
- Optional: Socket.IO or WebSocket for real-time features

---

## Installation (Development)

```bash
# Clone the repository
git clone https://github.com/proyecto1095si1-boop/aura-chatting-pro.git
cd aura-chatting-pro

# Install dependencies (choose pnpm / npm / yarn)
pnpm install

# Start dev server
pnpm dev

# Run on device (Expo)
pnpm ios
pnpm android
```

---

## Configuration

- Copy `.env.example` to `.env` and set the required variables (DATABASE_URL, JWT_SECRET, API keys, etc.).
- Server configuration lives in `server/` and shared client utilities live in `lib/` and `shared/`.

---

## Usage

- Development: `pnpm dev` (or `npm run dev` / `yarn dev`)
- Build production bundles: `pnpm build`
- Run tests (if configured): `pnpm test`

Include any project-specific commands, Docker steps, or CI/CD notes here as needed.

---

## Project Structure (high-level)

```
aura/
├── app/                # App routes & screens
├── components/         # Reusable UI components
├── lib/                # Shared libraries & clients
├── server/             # Server-side code, API, db helpers
├── assets/             # Images, icons, fonts
└── scripts/            # Utility scripts
```

---

## Contributing (Non-Commercial)

Contributions that improve the project for non-commercial use are welcome. By contributing, you agree that your contributions will be licensed under the same license as this repository (non-commercial license). To contribute:

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add feature"
4. Push and open a Pull Request

If you intend to contribute work that will be used in a commercial product, contact the maintainers to discuss commercial licensing and contributor agreements.

---

## License Summary (short)

- Non-commercial: Free to use, modify, and redistribute for non-commercial purposes with attribution and inclusion of this license.
- Commercial: Requires a paid commercial license. Standard fee: USD 2,000 (negotiable). Contact: redpixel.games@gmail.com
- Unauthorized commercial use: The license includes a contractual liquidated damages clause of USD 50,000 for unauthorized commercial exploitation, plus unpaid license fees and recovery costs. Enforcement depends on applicable law.

See the full LICENSE file in this repository for complete terms: https://github.com/proyecto1095si1-boop/aura-chatting-pro/blob/main/LICENSE

---

## FAQ

Q: Can I use this in a side project that earns ad revenue?  
A: No. Any monetization (including ads) is considered Commercial Use and requires a commercial license.

Q: Can I fork and modify the project for learning or demos?  
A: Yes — for Non-Commercial Use. Keep the copyright and license notices intact.

Q: How do I buy a commercial license?  
A: Email redpixel.games@gmail.com with details about your intended use and scale.

---

## Enforcement & Compliance

The copyright holder reserves the right to investigate suspected unauthorized commercial use and to seek remedies including negotiated settlements, unpaid license fees, injunctive relief, and where applicable, liquidated damages as specified in the LICENSE file. Please contact redpixel.games@gmail.com to discuss licensing before deploying any commercial product that incorporates this Software.

---

## Contact

- Licensing & Business: redpixel.games@gmail.com
- Issues & Technical Questions: open an issue on GitHub

---

## Legal Notice

This repository's license and any contractual remedies (including liquidated damages) are templates and do not substitute for legal advice. The ability to enforce certain clauses varies by jurisdiction. Consult an attorney for a binding commercial license or enforcement strategy.
