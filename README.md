# POAP Platform on Stacks Blockchain

A decentralized community engagement platform built on the Stacks blockchain featuring POAP (Proof of Attendance Protocol) NFTs, on-chain governance voting, community posts, and milestone tracking.

## Features

- **POAP NFT Minting**: Mint unique Proof of Attendance Protocol NFTs for events and achievements
- **On-Chain Voting**: Create and participate in multiple-choice governance proposals (POAP-gated)
- **Community Posts**: Share updates and engage with the community (POAP-gated)
- **Milestone Tracking**: Track individual achievements and earn reward points
- **Stacks Wallet Integration**: Connect with Hiro Wallet or Leather Wallet
- **Real-time Updates**: Live data synchronization with Supabase

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Blockchain**: Stacks (Bitcoin Layer 2), Clarity Smart Contracts
- **Database**: Supabase (PostgreSQL)
- **Wallet**: Stacks Connect (@stacks/connect)
- **Styling**: shadcn/ui components

## Prerequisites

- Node.js 18+ or Bun
- A Stacks wallet (Hiro Wallet or Leather)
- Supabase account (for database)
- STX tokens for testnet (get from [Stacks Testnet Faucet](https://explorer.hiro.so/sandbox/faucet?chain=testnet))

## Getting Started

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd poap-platform

# Install dependencies
npm install
# or
bun install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the database setup script in the Supabase SQL Editor:

```bash
# The script is located at /scripts/setup-database.sql
# Copy and paste its contents into Supabase SQL Editor and run
```

This creates the following tables:
- `users` - User profiles linked to Stacks addresses
- `poaps` - Minted POAP records
- `posts` - Community posts
- `proposals` - Voting proposals
- `votes` - Vote records
- `milestones` - Achievement definitions
- `user_milestones` - User achievement progress
- `user_stats` - Aggregated user statistics

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional: Stacks Network Configuration
NEXT_PUBLIC_STACKS_NETWORK=testnet # or mainnet
```

Get your Supabase credentials from your project settings.

### 4. Deploy Smart Contracts

The platform uses two main Clarity smart contracts:

#### POAP Contract (`/contracts/poap.clar`)

Features:
- NFT minting with event metadata
- Admin role management
- Balance and ownership queries
- Transfer functionality

#### Voting Contract (`/contracts/voting.clar`)

Features:
- Create multiple-choice proposals
- POAP-gated voting
- Vote tracking and winner determination
- Time-based voting periods (block height)

**Deployment Options:**

**Option A: Using Clarinet (Recommended for Development)**

```bash
# Install Clarinet
curl -L https://github.com/hirosystems/clarinet/releases/download/v1.7.0/clarinet-linux-x64.tar.gz | tar xz

# Create a new Clarinet project
clarinet new my-poap-project
cd my-poap-project

# Copy contracts
cp ../contracts/poap.clar contracts/
cp ../contracts/voting.clar contracts/

# Test contracts
clarinet test

# Deploy to testnet
clarinet deploy --testnet
```

**Option B: Using Hiro Platform**

1. Go to [Hiro Platform](https://platform.hiro.so/)
2. Create a new project
3. Copy and paste contract code
4. Deploy to testnet or mainnet

**Option C: Manual Deployment with @stacks/transactions**

```typescript
import { makeContractDeploy, broadcastTransaction } from '@stacks/transactions';

// See Stacks documentation for detailed deployment scripts
```

### 5. Update Contract Addresses

After deploying contracts, update the contract addresses in `/lib/stacks.ts`:

```typescript
// Replace with your deployed contract addresses
const POAP_CONTRACT = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.poap';
const VOTING_CONTRACT = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.voting';
```

### 6. Run the Development Server

```bash
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage Guide

### Connecting Your Wallet

1. Click "Connect Wallet" in the navigation
2. Choose Hiro Wallet or Leather
3. Approve the connection request
4. Your Stacks address will be displayed

### Minting a POAP

1. Navigate to `/mint`
2. Connect your wallet
3. Fill in event details:
   - Event Name (max 50 characters)
   - Event Date (Unix timestamp)
   - Image URI (IPFS or HTTP URL)
4. Click "Mint POAP"
5. Approve the transaction in your wallet
6. Wait for blockchain confirmation (~10 minutes on mainnet, ~30 seconds on testnet)

### Creating a Proposal

1. Navigate to `/vote`
2. Ensure you own at least one POAP
3. Click "Create Proposal"
4. Fill in proposal details:
   - Title
   - Description
   - Duration (in blocks, ~10 min per block)
   - Options (2-10 choices)
5. Submit and approve transaction
6. Your proposal will appear in the list once confirmed

### Voting on Proposals

1. Browse active proposals at `/vote`
2. Click on a proposal to view details
3. Select your preferred option
4. Click "Cast Vote"
5. Approve the transaction
6. Your vote is recorded on-chain

### Creating Posts

1. Navigate to `/posts`
2. Ensure you own at least one POAP
3. Click "Create Post"
4. Write your post content
5. Submit to store in Supabase database
6. Posts appear in real-time for all users

### Tracking Milestones

1. Visit `/milestones` to view your achievements
2. Milestones track:
   - POAPs minted
   - Proposals created
   - Votes cast
   - Posts created
   - Likes received
3. Earn reward points for each achievement
4. Progress bars show completion status

## Project Structure

```
/
├── app/
│   ├── page.tsx              # Dashboard homepage
│   ├── mint/page.tsx         # POAP minting interface
│   ├── vote/page.tsx         # Voting and proposals
│   ├── posts/page.tsx        # Community posts
│   ├── milestones/page.tsx   # Achievement tracker
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles and theme
├── contracts/
│   ├── poap.clar            # POAP NFT contract
│   └── voting.clar          # Voting contract
├── lib/
│   ├── stacks.ts            # Stacks blockchain utilities
│   └── supabase/
│       └── client.ts        # Supabase client
├── scripts/
│   └── setup-database.sql   # Database schema
├── components/
│   └── ui/                  # shadcn/ui components
└── next.config.mjs          # Next.js configuration
```

## Smart Contract Functions

### POAP Contract

**Read-Only Functions:**
- `get-last-token-id` - Get total POAPs minted
- `get-token-uri` - Get token metadata URI
- `get-owner` - Get token owner
- `has-poap` - Check if user owns any POAP
- `get-balance` - Get user's POAP count

**Public Functions:**
- `mint-poap` - Mint new POAP (admin only)
- `set-admin` - Grant/revoke admin privileges (owner only)
- `transfer` - Transfer POAP to another user

### Voting Contract

**Read-Only Functions:**
- `get-proposal` - Get proposal details
- `get-proposal-option` - Get option details
- `has-voted` - Check if user voted
- `get-winning-option` - Get current leading option

**Public Functions:**
- `create-proposal` - Create new proposal (POAP holders only)
- `cast-vote` - Vote on proposal (POAP holders only)

## Database Schema

### Key Tables

**users**
- `id`, `stacks_address`, `username`, `avatar_url`, `created_at`

**poaps**
- `id`, `token_id`, `owner_address`, `event_name`, `event_date`, `image_uri`, `minted_at`

**proposals**
- `id`, `proposal_id`, `title`, `description`, `creator_address`, `start_block`, `end_block`, `total_votes`, `created_at`

**posts**
- `id`, `author_address`, `content`, `likes`, `created_at`, `updated_at`

**milestones**
- `id`, `name`, `description`, `target_value`, `reward_points`, `category`

**user_stats**
- `stacks_address`, `poaps_minted`, `proposals_created`, `votes_cast`, `posts_created`, `total_reward_points`

## Troubleshooting

### Wallet Connection Issues

- Ensure you have a Stacks wallet installed
- Try refreshing the page
- Check browser console for errors
- Verify you're on the correct network (testnet vs mainnet)

### Transaction Failures

- Ensure you have sufficient STX for gas fees
- Check that POAPs are minted before voting/posting
- Verify contract addresses are correct
- Wait for previous transactions to confirm

### Build Errors

- The project uses Next.js 16 with Turbopack
- Stacks packages are marked as external to avoid SSR bundling issues
- Run `npm run build` to test production build locally

### Database Connection

- Verify Supabase environment variables are set
- Check RLS policies if queries fail
- Ensure database schema is properly initialized

## Security Considerations

- Smart contracts are immutable once deployed - audit thoroughly
- Row Level Security (RLS) policies protect database access
- POAP ownership is verified on-chain before gated actions
- Private keys never leave your wallet
- Use testnet for development and testing

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Resources

- [Stacks Documentation](https://docs.stacks.co/)
- [Clarity Language Reference](https://docs.stacks.co/clarity/)
- [Stacks.js Documentation](https://stacks.js.org/)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)

## License

MIT License - feel free to use this project for your own purposes.

## Support

For issues and questions:
- Open a GitHub issue
- Join the Stacks Discord
- Check the Stacks Forum

---

Built with ❤️ on Stacks blockchain
