# Multisender Mini App

A Farcaster Mini App for secure multi-token sending on Base and Optimism networks.

## Features

- 🌙 **Dark/Light Mode** - Toggle between themes
- 🔗 **Multi-Chain Support** - Base and Optimism mainnets
- 💰 **Token Management** - Send ETH and ERC20 tokens
- 📱 **Mobile Optimized** - Compact design for mobile devices
- 🔒 **Secure** - Smart contract based multi-sending
- 🎯 **User Friendly** - Simple step-by-step interface

## Setup

### 1. Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Alchemy API Key (required for token data)
ALCHEMY_API_KEY=your_alchemy_api_key_here

# Contract Addresses (optional - fallback addresses are provided)
NEXT_PUBLIC_BASE_MULTISENDER_ADDRESS=0x...
NEXT_PUBLIC_OPTIMISM_MULTISENDER_ADDRESS=0x...
```

### 2. Get Alchemy API Key

1. Go to [Alchemy](https://www.alchemy.com/)
2. Create an account and new app
3. Select "Base" and "Optimism" networks
4. Copy your API key to `.env.local`

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

## Usage

1. **Connect Wallet** - Connect your Farcaster wallet
2. **Select Chain** - Choose Base or Optimism
3. **Select Token** - Choose ETH or any ERC20 token
4. **Add Recipients** - Upload CSV or add manually
5. **Configure Amounts** - Set fixed or variable amounts
6. **Review & Send** - Confirm and execute transaction

## Chain Management

All chain information is centralized in `lib/chains.ts`. To add new chains:

1. Add chain info to `SUPPORTED_CHAINS` array
2. Update `wagmi-config.ts` to include the new chain
3. Add Alchemy network mapping if needed

## Architecture

- **Frontend**: Next.js 14 with Tailwind CSS
- **Wallet**: Wagmi with Farcaster Mini App connector
- **Blockchain**: Viem for contract interactions
- **API**: Alchemy for token data and balances
- **Theme**: Dark/Light mode with system preference detection

## File Structure

```
├── app/                    # Next.js app directory
├── components/             # React components
│   ├── steps/             # Step components
│   └── ui/                # UI components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and configurations
│   ├── chains.ts          # Centralized chain management
│   ├── alchemy-api.ts     # Alchemy API integration
│   └── contracts.ts       # Contract ABI and helpers
└── types/                 # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License