/**
 * @cradle/erc721-stylus
 *
 * ERC-721 NFT interaction utilities for Arbitrum Stylus
 *
 * @example
 * ```tsx
 * import { useERC721Interactions, CHAIN_IDS } from '@cradle/erc721-stylus';
 *
 * function NFTPanel() {
 *   const nft = useERC721Interactions({
 *     contractAddress: '0x...',
 *     network: 'arbitrum-sepolia',
 *   });
 *
 *   return (
 *     <div>
 *       <p>Name: {nft.collectionInfo.data?.name}</p>
 *       <p>Balance: {nft.balance.data?.balance.toString()}</p>
 *     </div>
 *   );
 * }
 * ```
 */

// Constants
export {
  CHAIN_IDS,
  RPC_ENDPOINTS,
  FACTORY_ADDRESSES,
  ERC721_ABI,
  NFT_FACTORY_ABI,
  WORK_PROOF_ABI,
  type SupportedNetwork,
} from './constants';

// Types
export type {
  CollectionInfo,
  NFTInfo,
  BalanceInfo,
  TransactionState,
  AsyncState,
  UseERC721InteractionsOptions,
  UseERC721InteractionsReturn,
  // Work Proof types
  WorkProofInfo,
  FreelancerReputation,
  MintWorkProofParams,
  UpdateWorkProofParams,
} from './types';

// Interaction functions
export {
  getCollectionInfo,
  getBalance,
  getNFTInfo,
  mint,
  transferFrom,
  safeTransferFrom,
  approve,
  setApprovalForAll,
  burn,
  setBaseUri,
  pause,
  unpause,
  transferOwnership,
  // Work Proof functions
  mintWorkProof,
  getFreelancerTokens,
  getFreelancerTokenCount,
  getWorkProofInfo,
  getAverageRating,
  getTotalWorkProofs,
  getFreelancerReputation,
  updateWorkProof,
} from './interactions';

// React Hooks
export {
  useERC721Interactions,
} from './hooks';

// Interaction Panel Component
export { ERC721InteractionPanel } from './ERC721InteractionPanel';

// Work Proof Components
export { WorkProofMintPanel } from './WorkProofMintPanel';
export { FreelancerReputationPanel } from './FreelancerReputationPanel';

// Utilities
export { cn } from './cn';
export { getWorkProofContractAddress } from './workProofEnv';
