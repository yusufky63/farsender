# FarSender

FarSender is a Farcaster Mini App for sending ETH and ERC-20 tokens to multiple recipients across Base and Optimism from a mobile-first wallet flow.

## Snapshot

- **Category:** Farcaster Mini App multisender
- **Status:** Public repository
- **Live:** https://farsender.vercel.app
- **Repository:** https://github.com/yusufky63/farsender
- **Portfolio:** https://codexsha.dev

## Product Scope

FarSender is documented here as a product repository, not just a code dump. The goal of this README is to make the product purpose, runtime surface, and development path clear for future review and maintenance.

## Core Capabilities

- Multi-recipient ETH transfer flow
- ERC-20 multisend support
- Base and Optimism network direction
- Farcaster Mini App context and mobile UX
- Neynar and wallet integration for social/on-chain flows

## Existing README Coverage Preserved

This refresh keeps the important project-specific areas from the previous documentation:

- README was missing before this documentation refresh

## Tech Stack

- Next.js
- Farcaster Mini App SDK
- Neynar
- Wagmi
- Viem
- React Query
- Tailwind CSS

## Repository Map

| Path | Purpose |
| --- | --- |
| src/app/ | Routes and app shell |
| src/components/ | Wallet/action UI components |
| src/lib/ | Chain, Farcaster, and utility helpers |
| public/ | Mini app assets and metadata |

## Local Development

| Command | Purpose |
| --- | --- |
| npm run dev | Run development server |
| npm run build | Build production app |
| npm run start | Start production server |
| npm run lint | Run lint checks |

## Environment Notes

Use local environment files for secrets and deployment-specific values. Do not commit real keys.

- ALCHEMY_API_KEY
- NEXT_PUBLIC_NEYNAR_API_KEY
- NEXT_PUBLIC_BASE_MULTISENDER_ADDRESS
- NEXT_PUBLIC_OPTIMISM_MULTISENDER_ADDRESS

## Operational Notes

- Keep this README aligned with the live product and portfolio copy.
- Prefer small, documented changes over large undocumented rewrites.
- Do not commit real RPC keys or deployment contract keys. Use .env.local for local development.

## Maintainer

Built by Yusuf / Codexsha.

- GitHub: https://github.com/yusufky63
- X: https://x.com/codexsha
- Telegram: https://t.me/codexsha
