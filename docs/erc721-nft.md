# Work Proof NFT Contract

# RobinhoodNFT (RHNFT)

An ERC-721 based reputation system for freelancers using Arbitrum Stylus, featuring soulbound NFTs with work history and ratings.

## Collection Details

- **Name:** RobinhoodNFT
- **Symbol:** RHNFT
- **Network:** arbitrum-sepolia
- **Features:** soulbound, reputation tracking, client-verified minting
- **Soulbound:** Yes (non-transferable reputation tokens)

## Contract Architecture

The Work Proof contract extends ERC-721 with additional functionality:

### Storage
- **Project Types**: Maps token IDs to project categories
- **Ratings**: 1-5 scale client ratings per work proof
- **Skill Tags**: Comma-separated technology skills
- **Job Descriptions**: Detailed work descriptions
- **Client Memos**: Optional feedback from clients
- **Freelancer Tokens**: Indexed list of work proofs per freelancer

### Key Methods
- `mint_work_proof()`: Client mints work proof for freelancer
- `get_work_proof_info()`: Retrieve complete work proof metadata
- `get_freelancer_tokens()`: List all work proofs for a freelancer
- `get_average_rating()`: Calculate freelancer's reputation score
- `update_work_proof()`: Client updates rating/skills (pre-soulbound only)

## Deployment

```bash
cd contracts/erc721
cargo build --release
cargo stylus deploy --private-key $PRIVATE_KEY
```

**Network**: Arbitrum Sepolia (Chain ID: 421614)

## Usage

### Mint Work Proof (Client Only)

```typescript
import { mintWorkProof } from '@/lib/erc721-stylus';

const result = await mintWorkProof({
  freelancer: '0x...freelancer',
  projectType: 'Web Development',
  rating: 5,
  skillTags: 'React,TypeScript,Node.js',
  jobDescription: 'Built a full-stack e-commerce platform',
  clientMemo: 'Excellent work, delivered ahead of schedule'
});

console.log('Minted Work Proof #' + result.tokenId);
```

### Get Freelancer Reputation

```typescript
import { getFreelancerReputation } from '@/lib/erc721-stylus';

const reputation = await getFreelancerReputation('0x...freelancer');
console.log('Average Rating:', reputation.averageRating);
console.log('Total Work Proofs:', reputation.totalWorkProofs);
```

### Get Work Proof Details

```typescript
import { getWorkProofInfo } from '@/lib/erc721-stylus';

const workProof = await getWorkProofInfo(1n);
console.log('Project:', workProof.projectType);
console.log('Rating:', workProof.rating);
console.log('Skills:', workProof.skillTags);
console.log('Freelancer:', workProof.freelancer);
```

### Update Work Proof (Client Only)

```typescript
import { updateWorkProof } from '@/lib/erc721-stylus';

await updateWorkProof(1n, {
  newRating: 4,
  newSkillTags: 'React,TypeScript,Node.js,GraphQL'
});
```

## Security Features

- **Soulbound Enforcement**: Transfers are blocked to prevent reputation trading
- **Client Verification**: Only original minter can update work proofs
- **Input Validation**: Rating bounds (1-5), required project type and skills
- **Access Control**: Prevents self-minting of reputation

## Integration with Frontend

The contract integrates with the Next.js frontend through wagmi hooks:

```tsx
import { useContractRead, useContractWrite } from 'wagmi';

const { data: rating } = useContractRead({
  address: WORK_PROOF_ADDRESS,
  abi: WORK_PROOF_ABI,
  functionName: 'get_average_rating',
  args: [freelancerAddress]
});

const { write: mintWorkProof } = useContractWrite({
  address: WORK_PROOF_ADDRESS,
  abi: WORK_PROOF_ABI,
  functionName: 'mint_work_proof'
});
```

## API Reference

### Write Functions
- `mint_work_proof(address freelancer, string project_type, uint8 rating, string skill_tags, string job_description, string client_memo)` → `uint256 token_id`
- `update_work_proof(uint256 token_id, uint8 new_rating, string new_skill_tags)` → `void`

### Read Functions
- `get_work_proof_info(uint256 token_id)` → `(string project_type, uint8 rating, string skill_tags, string job_description, string client_memo, address freelancer)`
- `get_freelancer_tokens(address freelancer)` → `uint256[] token_ids`
- `get_average_rating(address freelancer)` → `uint8 average_rating`
- `get_total_work_proofs()` → `uint256 total_supply`

### ERC-721 Standard
- `balance_of(address owner)` → `uint256 balance`
- `owner_of(uint256 token_id)` → `address owner`
- `name()` → `string`
- `symbol()` → `string`
- `supports_interface(bytes4 interface_id)` → `bool`

## Contract Features

- **ownable**: Enabled
- **mintable**: Enabled
- **burnable**: Enabled
- **pausable**: Enabled
