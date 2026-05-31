# FarSender

FarSender is a Farcaster Mini App for sending ETH or ERC-20 tokens to multiple recipients from a compact mobile-first interface.

The app targets Base and Optimism flows, uses wallet tooling for transaction execution, and uses Neynar/Alchemy-backed data where token metadata or Farcaster context is needed.

## Features

- Multi-recipient ETH sending.
- Multi-recipient ERC-20 token sending.
- Base and Optimism chain management.
- Farcaster Mini App SDK integration.
- Wallet connection through Wagmi, Viem, and mini app connector packages.
- Token data lookup through Alchemy/Neynar-oriented configuration.

## Setup

```bash
npm install
cp env.example .env.local
npm run dev
```

## Environment

Copy `env.example` to `.env.local`. Contract address values can use the provided fallbacks while developing, but production deployments should use verified addresses.

- `ALCHEMY_API_KEY`
- `NEXT_PUBLIC_NEYNAR_API_KEY`
- `NEXT_PUBLIC_BASE_MULTISENDER_ADDRESS`
- `NEXT_PUBLIC_OPTIMISM_MULTISENDER_ADDRESS`

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Build the mini app. |
| `npm start` | Run the production server. |
| `npm run lint` | Run lint checks. |

| Layer | Tools |
| --- | --- |
| App | Next.js, React, TypeScript, Tailwind CSS, Geist |
| Farcaster | Farcaster Mini App SDK, Farcaster Mini App Wagmi Connector, Neynar SDK |
| Web3 | Wagmi, Viem, multisender contracts |
| UI | Lucide React, Tailwind Merge, custom components |

## Architecture

- `app/` - Next.js App Router routes and layout.
- `components/` - reusable UI and flow components.
- `contracts/` - contract ABIs/addresses and multisender-related definitions.
- `hooks/` - wallet, token, and chain hooks.
- `lib/` - Farcaster, Web3, and utility logic.
- `types/` - shared TypeScript types.

## Usage

1. Connect a wallet from the Farcaster/mobile context.
2. Select Base or Optimism.
3. Choose ETH or an ERC-20 token.
4. Add recipients and amounts.
5. Review and submit the multisend transaction.

## Status

- Repository: https://github.com/yusufky63/farsender
- Live app: https://farsender.vercel.app
