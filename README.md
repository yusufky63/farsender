# FarSender

![Category](https://img.shields.io/badge/Category-Farcaster%20Mini%20App%20%2F%20Multisender-1f1f1f?style=flat-square&labelColor=141414&color=2b2b2b) ![Status](https://img.shields.io/badge/Status-public-1f1f1f?style=flat-square&labelColor=141414&color=2b2b2b)

Farcaster Mini App for sending ETH and ERC-20 tokens to multiple recipients across Base and Optimism.

## Links

- Live: https://farsender.vercel.app
- Repository: https://github.com/yusufky63/farsender
- Portfolio: https://codexsha.dev

## Overview

FarSender is part of the Codexsha product portfolio. The project is focused on shipping a compact, usable product surface rather than a demo-only prototype. This README is written to make the repository easier to understand, run, and evaluate.

## Key Features

- Multi-recipient ETH sending
- ERC-20 multisend flow
- Base and Optimism network support
- Mobile-first Farcaster UX
- Wallet-safe transaction preparation

## Stack

- Next.js
- Farcaster Mini App SDK
- Neynar
- Wagmi
- Viem
- React Query
- Tailwind CSS

## Role / Ownership

Built the mini app flow, wallet integration, token action UI, and deployment.

## Getting Started

```bash
npm install
npm run dev
npm run build
```

## Environment

Create a local environment file from the project conventions and configure only the values needed for the flow you are running. Do not commit secrets.

Typical values used by this project include:

- Farcaster/Neynar keys where enabled
- wallet connector configuration
- supported chain RPC URLs

## Project Notes

- Status: Public repository and live deployment.
- Private or sensitive implementation details are intentionally not documented in public-facing copy.
- The README should stay aligned with the live product and the Codexsha portfolio page.

## Maintainer

Built by Yusuf / Codexsha.

- GitHub: https://github.com/yusufky63
- X: https://x.com/codexsha
- Telegram: https://t.me/codexsha
