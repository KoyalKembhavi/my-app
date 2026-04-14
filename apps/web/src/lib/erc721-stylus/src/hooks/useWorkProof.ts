'use client';

/**
 * React hook for interacting with Work Proof NFT contracts using wagmi
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAccount, useWalletClient, usePublicClient, useSwitchChain } from 'wagmi';
import { arbitrum, arbitrumSepolia } from 'viem/chains';
import type { Address, Chain } from 'viem';
import { WORK_PROOF_ABI } from '../constants';
import type {
  WorkProofInfo,
  FreelancerReputation,
  MintWorkProofParams,
  UpdateWorkProofParams,
  AsyncState,
  TransactionState,
} from '../types';

// Define custom Superposition chains
const superposition: Chain = {
  id: 55244,
  name: 'Superposition',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://rpc.superposition.so'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.superposition.so' },
  },
};

const superpositionTestnet: Chain = {
  id: 98985,
  name: 'Superposition Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'SPN',
    symbol: 'SPN',
  },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.superposition.so'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://testnet-explorer.superposition.so' },
  },
  testnet: true,
};

const robinhoodTestnet: Chain = {
  id: 46630,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.chain.robinhood.com'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.testnet.chain.robinhood.com' },
  },
  testnet: true,
};

// Network configurations
const NETWORKS = {
  'arbitrum-sepolia': {
    name: 'Arbitrum Sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorerUrl: 'https://sepolia.arbiscan.io',
    chainId: arbitrumSepolia.id,
    chain: arbitrumSepolia,
  },
  'arbitrum': {
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    chainId: arbitrum.id,
    chain: arbitrum,
  },
  'superposition': {
    name: 'Superposition',
    rpcUrl: 'https://rpc.superposition.so',
    explorerUrl: 'https://explorer.superposition.so',
    chainId: 55244,
    chain: superposition,
  },
  'superposition-testnet': {
    name: 'Superposition Testnet',
    rpcUrl: 'https://testnet-rpc.superposition.so',
    explorerUrl: 'https://testnet-explorer.superposition.so',
    chainId: 98985,
    chain: superpositionTestnet,
  },
  'robinhood-testnet': {
    name: 'Robinhood Chain Testnet',
    rpcUrl: 'https://rpc.testnet.chain.robinhood.com',
    explorerUrl: 'https://explorer.testnet.chain.robinhood.com',
    chainId: 46630,
    chain: robinhoodTestnet,
  },
};

export type SupportedNetwork = keyof typeof NETWORKS;

export interface UseWorkProofOptions {
  contractAddress: string;
  network?: SupportedNetwork;
}

export interface UseWorkProofReturn {
  // Freelancer reputation
  freelancerReputation: AsyncState<FreelancerReputation>;
  refetchReputation: (freelancerAddress: string) => Promise<void>;

  // Work Proof info
  workProofInfo: AsyncState<WorkProofInfo>;
  refetchWorkProof: (tokenId: bigint) => Promise<void>;

  // Stats
  totalWorkProofs: AsyncState<bigint>;
  averageRating: AsyncState<number>;

  // Mint Work Proof (client action)
  mintWorkProof: (params: MintWorkProofParams) => Promise<{ hash: string; tokenId: bigint }>;

  // Update Work Proof
  updateWorkProof: (params: UpdateWorkProofParams) => Promise<string>;

  // Transaction state
  txState: TransactionState;
  isLoading: boolean;
  error: Error | null;

  // Network info
  explorerUrl: string;

  /** Whether this address implements the Work Proof extension (mint_work_proof, getFreelancerTokens, …). */
  workProofSupportStatus: 'unknown' | 'yes' | 'no';
}

export function useWorkProof(options: UseWorkProofOptions): UseWorkProofReturn {
  const {
    contractAddress,
    network = 'arbitrum-sepolia',
  } = options;

  const networkConfig = NETWORKS[network];

  const { address: userAddress, isConnected: walletConnected } = useAccount();
  const { data: walletClient } = useWalletClient({ chainId: networkConfig.chainId });
  const publicClient = usePublicClient({ chainId: networkConfig.chainId });
  const { switchChainAsync } = useSwitchChain();

  // State
  const [freelancerReputation, setFreelancerReputation] = useState<AsyncState<FreelancerReputation>>({ status: 'idle' });
  const [workProofInfo, setWorkProofInfo] = useState<AsyncState<WorkProofInfo>>({ status: 'idle' });
  const [totalWorkProofs, setTotalWorkProofs] = useState<AsyncState<bigint>>({ status: 'idle' });
  const [averageRating, setAverageRating] = useState<AsyncState<number>>({ status: 'idle' });
  const [txState, setTxState] = useState<TransactionState>({ status: 'idle' });
  const [error, setError] = useState<Error | null>(null);
  const [workProofSupportStatus, setWorkProofSupportStatus] = useState<'unknown' | 'yes' | 'no'>('unknown');
  const workProofSupportRef = useRef(workProofSupportStatus);
  workProofSupportRef.current = workProofSupportStatus;

  // Helper to parse errors
  const parseError = useCallback((err: any): Error => {
    const message = err?.message || err?.reason || String(err);
    return new Error(message);
  }, []);

  const emptyFreelancerReputation = useCallback(
    (addr: string): FreelancerReputation => ({
      address: addr as Address,
      totalWorkProofs: 0,
      averageRating: 0,
      workProofs: [],
      skillCloud: {},
    }),
    [],
  );

  // Fetch freelancer reputation
  const refetchReputation = useCallback(async (freelancerAddress: string) => {
    if (!publicClient) return;

    if (workProofSupportRef.current === 'no') {
      setFreelancerReputation({
        status: 'success',
        data: emptyFreelancerReputation(freelancerAddress),
      });
      return;
    }

    setFreelancerReputation({ status: 'loading' });
    try {
      // Get token IDs
      const tokenIds = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: WORK_PROOF_ABI,
        functionName: 'get_freelancer_tokens',
        args: [freelancerAddress as `0x${string}`],
      }) as bigint[];

      // Fetch each Work Proof
      const workProofs: WorkProofInfo[] = [];
      const skillCloud: Record<string, number> = {};

      for (const tokenId of tokenIds) {
        const [projectType, rating, skillTags, jobDescription, clientMemo, owner] =
          await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: WORK_PROOF_ABI,
            functionName: 'get_work_proof_info',
            args: [tokenId],
          }) as [string, number, string, string, string, `0x${string}`];

        const skills = skillTags.split(',').map(s => s.trim()).filter(Boolean);

        workProofs.push({
          tokenId,
          projectType,
          rating: Number(rating),
          skillTags: skills,
          jobDescription,
          clientMemo,
          owner,
        });

        // Build skill cloud
        for (const skill of skills) {
          skillCloud[skill] = (skillCloud[skill] || 0) + 1;
        }
      }

      // Get average rating
      const avgRating = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: WORK_PROOF_ABI,
        functionName: 'get_average_rating',
        args: [freelancerAddress as `0x${string}`],
      }) as number;

      setFreelancerReputation({
        status: 'success',
        data: {
          address: freelancerAddress as Address,
          totalWorkProofs: workProofs.length,
          averageRating: Number(avgRating),
          workProofs,
          skillCloud,
        },
      });
    } catch (err) {
      const msg = String((err as Error)?.message ?? err);
      if (msg.includes('reverted') || msg.includes('execution reverted')) {
        setWorkProofSupportStatus('no');
        setFreelancerReputation({
          status: 'success',
          data: emptyFreelancerReputation(freelancerAddress),
        });
        return;
      }
      setFreelancerReputation({ status: 'error', error: parseError(err) });
    }
  }, [publicClient, contractAddress, parseError, emptyFreelancerReputation]);

  // Fetch Work Proof info
  const refetchWorkProof = useCallback(async (tokenId: bigint) => {
    if (!publicClient) return;

    if (workProofSupportRef.current === 'no') {
      setWorkProofInfo({
        status: 'error',
        error: new Error(
          'This NFT contract does not implement Work Proof (getWorkProofInfo).',
        ),
      });
      return;
    }

    setWorkProofInfo({ status: 'loading' });
    try {
      const [projectType, rating, skillTags, jobDescription, clientMemo, owner] =
        await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: WORK_PROOF_ABI,
          functionName: 'get_work_proof_info',
          args: [tokenId],
        }) as [string, number, string, string, string, `0x${string}`];

      setWorkProofInfo({
        status: 'success',
        data: {
          tokenId,
          projectType,
          rating: Number(rating),
          skillTags: skillTags.split(',').map(s => s.trim()).filter(Boolean),
          jobDescription,
          clientMemo,
          owner,
        },
      });
    } catch (err) {
      setWorkProofInfo({ status: 'error', error: parseError(err) });
    }
  }, [publicClient, contractAddress, parseError]);

  // Fetch total Work Proofs
  const refetchTotal = useCallback(async () => {
    if (!publicClient || !contractAddress) return;

    if (workProofSupportRef.current === 'no') {
      setTotalWorkProofs({ status: 'success', data: 0n });
      return;
    }

    setTotalWorkProofs({ status: 'loading' });
    try {
      const total = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: WORK_PROOF_ABI,
        functionName: 'get_total_work_proofs',
        args: [],
      }) as bigint;

      setWorkProofSupportStatus('yes');
      setTotalWorkProofs({ status: 'success', data: total });
    } catch (err) {
      const msg = String((err as Error)?.message ?? err);
      if (msg.includes('reverted') || msg.includes('execution reverted')) {
        setWorkProofSupportStatus('no');
        setTotalWorkProofs({ status: 'success', data: 0n });
        return;
      }
      setTotalWorkProofs({ status: 'error', error: parseError(err) });
    }
  }, [publicClient, contractAddress, parseError]);

  // Fetch average rating for current user
  const refetchAverageRating = useCallback(async () => {
    if (!publicClient || !contractAddress) {
      setAverageRating({ status: 'idle' });
      return;
    }

    if (workProofSupportRef.current === 'no') {
      setAverageRating({ status: 'success', data: 0 });
      return;
    }

    if (!userAddress) {
      setAverageRating({ status: 'idle' });
      return;
    }

    setAverageRating({ status: 'loading' });
    try {
      const rating = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: WORK_PROOF_ABI,
        functionName: 'get_average_rating',
        args: [userAddress as `0x${string}`],
      }) as number;

      setWorkProofSupportStatus('yes');
      setAverageRating({ status: 'success', data: Number(rating) });
    } catch (err) {
      const msg = String((err as Error)?.message ?? err);
      if (msg.includes('reverted') || msg.includes('execution reverted')) {
        setWorkProofSupportStatus('no');
        setAverageRating({ status: 'success', data: 0 });
        return;
      }
      setAverageRating({ status: 'error', error: parseError(err) });
    }
  }, [publicClient, contractAddress, userAddress, parseError]);

  // Reset probe when switching NFT contract
  useEffect(() => {
    setWorkProofSupportStatus('unknown');
  }, [contractAddress]);

  // Initial probe: standard ERC-721 deployments do not expose Work Proof methods; avoid repeated reverts.
  useEffect(() => {
    if (!publicClient || !contractAddress) {
      setWorkProofSupportStatus('unknown');
      setTotalWorkProofs({ status: 'idle' });
      setAverageRating({ status: 'idle' });
      return;
    }

    let cancelled = false;

    (async () => {
      setTotalWorkProofs({ status: 'loading' });
      setAverageRating({ status: userAddress ? 'loading' : 'idle' });
      try {
        const total = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: WORK_PROOF_ABI,
          functionName: 'get_total_work_proofs',
          args: [],
        }) as bigint;
        if (cancelled) return;
        setWorkProofSupportStatus('yes');
        setTotalWorkProofs({ status: 'success', data: total });

        if (userAddress) {
          const rating = await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: WORK_PROOF_ABI,
            functionName: 'get_average_rating',
            args: [userAddress as `0x${string}`],
          }) as number;
          if (!cancelled) {
            setAverageRating({ status: 'success', data: Number(rating) });
          }
        } else {
          setAverageRating({ status: 'idle' });
        }
      } catch {
        if (cancelled) return;
        setWorkProofSupportStatus('no');
        setTotalWorkProofs({ status: 'success', data: 0n });
        setAverageRating({ status: 'success', data: 0 });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient, contractAddress, userAddress]);

  // Helper to execute a write transaction
  const executeTransaction = useCallback(async (
    functionName: string,
    args: unknown[]
  ): Promise<string> => {
    if (!walletClient || !publicClient) {
      throw new Error('Wallet client is required for transactions');
    }

    if (workProofSupportRef.current !== 'yes') {
      throw new Error(
        'This contract is not a Work Proof NFT. Deploy the Work Proof Stylus contract and set NEXT_PUBLIC_WORK_PROOF_NFT_ADDRESS (or NEXT_PUBLIC_NFT_ADDRESS) to that address.',
      );
    }

    setError(null);
    setTxState({ status: 'pending' });

    try {
      const { request } = await publicClient.simulateContract({
        address: contractAddress as `0x${string}`,
        abi: WORK_PROOF_ABI,
        functionName: functionName as any,
        args: args as any,
        account: walletClient.account,
      } as any);

      const hash = await walletClient.writeContract(request as any);
      setTxState({ status: 'confirming', hash });

      await publicClient.waitForTransactionReceipt({ hash });
      setTxState({ status: 'success', hash });

      return hash;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setTxState({ status: 'error', error });
      throw error;
    }
  }, [walletClient, publicClient, contractAddress]);

  // Mint Work Proof
  const mintWorkProof = useCallback(async (params: MintWorkProofParams): Promise<{ hash: string; tokenId: bigint }> => {
    if (!publicClient) {
      throw new Error('Public client is required');
    }

    if (workProofSupportRef.current !== 'yes') {
      throw new Error(
        'This contract is not a Work Proof NFT. Deploy the Work Proof Stylus contract and set NEXT_PUBLIC_WORK_PROOF_NFT_ADDRESS (or NEXT_PUBLIC_NFT_ADDRESS) to that address.',
      );
    }

    // Get current total to estimate token ID
    const totalBefore = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: WORK_PROOF_ABI,
      functionName: 'get_total_work_proofs',
    }) as bigint;

    const hash = await executeTransaction('mint_work_proof', [
      params.freelancer,
      params.projectType,
      params.rating,
      params.skillTags,
      params.jobDescription,
      params.clientMemo,
    ]);

    // Refetch data
    refetchTotal();
    refetchReputation(params.freelancer);

    return {
      hash,
      tokenId: totalBefore,
    };
  }, [executeTransaction, publicClient, contractAddress, refetchTotal, refetchReputation]);

  // Update Work Proof
  const updateWorkProof = useCallback(async (params: UpdateWorkProofParams): Promise<string> => {
    const hash = await executeTransaction('update_work_proof', [
      params.tokenId,
      params.newRating,
      params.newSkillTags,
    ]);

    refetchWorkProof(params.tokenId);
    return hash;
  }, [executeTransaction, refetchWorkProof]);

  return {
    freelancerReputation,
    refetchReputation,
    workProofInfo,
    refetchWorkProof,
    totalWorkProofs,
    averageRating,
    mintWorkProof,
    updateWorkProof,
    txState,
    isLoading: txState.status === 'pending' || txState.status === 'confirming',
    error,
    explorerUrl: networkConfig.explorerUrl,
    workProofSupportStatus,
  };
}
