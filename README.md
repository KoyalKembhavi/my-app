# Freelance Reputation Platform

A Web3 dApp for building verifiable professional reputation through Work Proof NFTs, composed with [[N]skills](https://www.nskills.xyz).

## Blueprint: selected nodes

These components were included in this generation:

- **Work Proof NFT** — ERC-721 based reputation system for freelancers with soulbound NFTs, ratings, and skill tracking
- **Frontend Scaffold** — Generate a Next.js Web3 application with wagmi, RainbowKit, and smart contract integration
- **Wallet Authentication** — Wallet connection with RainbowKit and WalletConnect

## Project structure

```
my-app/
├── apps/
│   └── web/                    # Next.js app (install dependencies here)
│       ├── src/
│       ├── package.json
│       └── ...
├── contracts/                  # Rust/Stylus smart contracts
│   └── erc721/                 # Work Proof NFT contract (ERC-721 based)
├── docs/                       # Documentation
├── scripts/                     # Deploy / utility scripts (if generated)
├── .gitignore
└── README.md
```

## Quick start

### Prerequisites

- **Node.js** 18+ and **npm** (comes with Node.js)
- **Rust** toolchain and **cargo-stylus** for building/deploying Stylus contracts (see `docs/` and [Stylus SDK](https://github.com/OffchainLabs/stylus-sdk-rs))

### Step-by-step

1. **Clone and enter the project**

   ```bash
   git clone <your-repo-url>
   cd <your-repo-name>
   ```

   ![Clone and enter the project](https://raw.githubusercontent.com/Cradle-app/NSkills/main/apps/web/public/clone-and-enter.png)

2. **Install dependencies** for the Next.js app (this project has no root `package.json`; dependencies live under `apps/web`):

   ```bash
   cd apps/web
   npm install
   ```

   ![Install dependencies](https://raw.githubusercontent.com/Cradle-app/NSkills/main/apps/web/public/install-dep.png)

3. **Environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:

   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: WalletConnect Cloud project ID for wallet connections

   ![Environment variables](https://raw.githubusercontent.com/Cradle-app/NSkills/main/apps/web/public/env-var.png)

### Work Proof Integration

Add the `WorkProofInteractionPanel` to `apps/web/src/app/page.tsx`:

```tsx
import { WalletButton } from '@/components/wallet-button';
import { WorkProofInteractionPanel } from '@/lib/erc721-stylus/src';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full text-center">
        <h1 className="text-4xl font-bold mb-8">
          Freelance Reputation Platform
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-12">
          Build your professional reputation with verifiable work proofs
        </p>

        <div className="flex justify-center">
          <WalletButton />
        </div>

        <WorkProofInteractionPanel />
      </div>
    </main>
  );
}
```

### Run the web app

```bash
cd apps/web && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Work Proof NFT Contract

This project includes an enhanced ERC-721 contract that implements a **Work Proof NFT system** - a portable reputation system for freelancers on the blockchain.

### What is Work Proof?

Work Proof NFTs are soulbound tokens that represent completed freelance work. Each NFT contains:
- **Project Type**: Type of work (e.g., "Web Development", "Graphic Design")
- **Rating**: Client rating (1-5 scale)
- **Skill Tags**: Technologies/skills used (e.g., "React,TypeScript,Node.js")
- **Job Description**: Brief description of the work
- **Client Memo**: Optional feedback from the client

### Key Features

- ✅ **Soulbound NFTs**: Non-transferable reputation tokens (prevents trading)
- ✅ **Client-Only Minting**: Only clients can mint Work Proofs for freelancers
- ✅ **On-Chain Reputation**: Verifiable work history and ratings
- ✅ **ERC-721 Compliant**: Standard NFT interface for wallet/marketplace compatibility
- ✅ **Freelancer Dashboard**: Easy enumeration of all work proofs per freelancer
- ✅ **Average Rating Calculation**: Automated reputation scoring

### Contract Architecture

The Work Proof system is built on an enhanced ERC-721 base contract:

```
ERC-721 Base Contract
├── Standard NFT Operations (balanceOf, ownerOf, etc.)
├── Work Proof Storage (project types, ratings, skills, etc.)
├── Work Proof Methods (mint_work_proof, get_work_proof_info, etc.)
└── Soulbound Enforcement (blocks transfers when enabled)
```

### Contract Details

- **Name:** RobinhoodNFT
- **Symbol:** RHNFT
- **Network:** arbitrum-sepolia
- **Features:** soulbound, reputation tracking, client-verified minting
- **Soulbound:** Yes (non-transferable reputation tokens)

### Contract Methods

#### Work Proof Specific
- `mint_work_proof(freelancer, project_type, rating, skill_tags, job_description, client_memo)` - Mint new work proof
- `get_work_proof_info(token_id)` - Get detailed work proof metadata
- `get_freelancer_tokens(freelancer)` - List all work proofs for a freelancer
- `get_average_rating(freelancer)` - Calculate average rating across all work
- `update_work_proof(token_id, new_rating, new_skill_tags)` - Update work proof (client only)

#### Standard ERC-721 (Soulbound Restricted)
- `balance_of(owner)` - Get work proof count for freelancer
- `owner_of(token_id)` - Verify work proof ownership
- `transfer_from()` - **BLOCKED** (soulbound)
- `approve()` - **BLOCKED** (soulbound)

### Deployment

The contract is built with **Arbitrum Stylus** for efficient execution:

```bash
# Build the contract
cd contracts/erc721
cargo build --release

# Deploy to Arbitrum Sepolia
cargo stylus deploy --private-key $PRIVATE_KEY
```

**Network**: Arbitrum Sepolia (Chain ID: 421614)

### Frontend Integration

Add the Work Proof interaction panel to your Next.js app:

```tsx
import { WalletButton } from '@/components/wallet-button';
import { WorkProofInteractionPanel } from '@/lib/erc721-stylus/src';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full text-center">
        <h1 className="text-4xl font-bold mb-8">
          Freelance Reputation Platform
        </h1>

        <div className="flex justify-center mb-8">
          <WalletButton />
        </div>

        <WorkProofInteractionPanel />
      </div>
    </main>
  );
}
```

### Environment Variables

Add to your `.env` file:

```bash
NEXT_PUBLIC_NFT_ADDRESS=0x... # Deployed Work Proof contract address
ERC721_DEPLOYMENT_API_URL=http://localhost:4001 # For deployment API
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_id
NEXT_PUBLIC_APP_NAME=FreelanceReputation
```

### Usage Examples

#### Minting a Work Proof (Client)
```javascript
// Client mints work proof for freelancer
await contract.mint_work_proof(
  freelancerAddress,
  "Web Development",
  5, // Rating
  "React,TypeScript,Node.js",
  "Built a full-stack e-commerce platform",
  "Excellent work, delivered on time!"
);
```

#### Checking Freelancer Reputation (Anyone)
```javascript
// Get freelancer's average rating
const avgRating = await contract.get_average_rating(freelancerAddress);

// Get all work proofs for freelancer
const tokenIds = await contract.get_freelancer_tokens(freelancerAddress);

// Get detailed info about specific work
const workInfo = await contract.get_work_proof_info(tokenId);
```

### Security Features

- **Soulbound**: Prevents reputation token trading
- **Client Verification**: Only original clients can update work proofs
- **Input Validation**: Rating bounds (1-5), required fields
- **Access Control**: Minting restricted to prevent self-claiming

### Future Enhancements

- Token URI metadata for rich displays
- Batch minting for multiple projects
- Dispute resolution mechanism
- Integration with decentralized job platforms

## Documentation

Check the `docs/` folder for guides that match your blueprint (e.g. frontend setup, contract deployment, API routes).

## License

MIT

---

Generated with [[N]skills](https://www.nskills.xyz)
