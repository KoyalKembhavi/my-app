'use client';

/**
 * FreelancerReputationPanel - Display a freelancer's reputation profile with skill cloud
 */

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import {
  User,
  Star,
  Award,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Loader2,
  FileText,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from './cn';
import { useWorkProof } from './hooks/useWorkProof';
import type { WorkProofInfo } from './types';
import { getWorkProofContractAddress } from './workProofEnv';

interface FreelancerReputationPanelProps {
  contractAddress?: string;
  freelancerAddress?: string; // Defaults to connected wallet
  network?: 'arbitrum' | 'arbitrum-sepolia' | 'superposition' | 'superposition-testnet' | 'robinhood-testnet';
}

export function FreelancerReputationPanel({
  contractAddress: initialAddress,
  freelancerAddress: initialFreelancer,
  network = 'arbitrum-sepolia',
}: FreelancerReputationPanelProps) {
  const contractAddress = getWorkProofContractAddress(initialAddress);
  const { address: connectedAddress } = useAccount();
  const freelancerAddress = initialFreelancer || connectedAddress || '';

  const {
    freelancerReputation,
    refetchReputation,
    workProofInfo,
    refetchWorkProof,
    averageRating,
    totalWorkProofs,
    explorerUrl,
    workProofSupportStatus,
  } = useWorkProof({
    contractAddress,
    network,
  });

  const [selectedTokenId, setSelectedTokenId] = useState<bigint | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const refetchReputationRef = useRef(refetchReputation);
  refetchReputationRef.current = refetchReputation;

  // Fixed-size dependency array avoids React dev "deps changed length" (e.g. Fast Refresh).
  // Latest refetch is always read from ref.
  useEffect(() => {
    if (!freelancerAddress || workProofSupportStatus === 'unknown') return;
    void refetchReputationRef.current(freelancerAddress);
  }, [freelancerAddress, workProofSupportStatus]);

  // Copy address to clipboard
  const copyAddress = async () => {
    if (!freelancerAddress) return;
    await navigator.clipboard.writeText(freelancerAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Get rating color
  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-emerald-400';
    if (rating >= 3.5) return 'text-amber-400';
    if (rating >= 2.5) return 'text-orange-400';
    return 'text-red-400';
  };

  const getRatingBg = (rating: number) => {
    if (rating >= 4.5) return 'bg-emerald-500';
    if (rating >= 3.5) return 'bg-amber-500';
    if (rating >= 2.5) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Get skill cloud sorted by frequency
  const skillCloud = freelancerReputation.status === 'success'
    ? Object.entries(freelancerReputation.data.skillCloud)
        .sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded-lg border border-violet-500/30 bg-gradient-to-r from-violet-500/10 to-transparent">
        <div className="flex items-center gap-2 mb-1">
          <Award className="w-5 h-5 text-violet-400" />
          <span className="text-lg font-medium text-white">
            Freelancer Reputation
          </span>
        </div>
        <p className="text-sm text-violet-200/70">
          On-chain verified work history and skills
        </p>
      </div>

      {workProofSupportStatus === 'no' && contractAddress && (
        <div className="p-4 rounded-lg border border-amber-500/40 bg-amber-500/10 text-left">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-100/90">
              <p className="font-medium text-amber-200 mb-1">Work Proof API not available on this contract</p>
              <p className="text-amber-100/80">
                This URL is not a Work Proof contract. Set <code className="text-xs">NEXT_PUBLIC_WORK_PROOF_NFT_ADDRESS</code>{' '}
                to your Work Proof deployment (or point <code className="text-xs">NEXT_PUBLIC_NFT_ADDRESS</code> at it if
                you only use one contract). The reputation panel needs{' '}
                <code className="text-xs">getFreelancerTokens</code> and related methods on-chain.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Freelancer Address */}
      {freelancerAddress && (
        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Freelancer:</span>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-violet-400">
                {freelancerAddress.slice(0, 6)}...{freelancerAddress.slice(-4)}
              </code>
              <button
                onClick={copyAddress}
                className="text-slate-400 hover:text-slate-300 transition-colors"
              >
                {copiedAddress ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {freelancerReputation.status === 'loading' && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        </div>
      )}

      {/* Error State */}
      {freelancerReputation.status === 'error' && (
        <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-sm text-red-300">
              {freelancerReputation.error?.message || 'Failed to load reputation'}
            </span>
          </div>
        </div>
      )}

      {/* No Data State (only when contract supports Work Proof) */}
      {freelancerReputation.status === 'success' &&
        freelancerReputation.data.totalWorkProofs === 0 &&
        workProofSupportStatus === 'yes' && (
        <div className="p-6 rounded-lg border border-slate-700 bg-slate-800/50 text-center">
          <User className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No Work Proofs minted yet</p>
          <p className="text-xs text-slate-500 mt-1">
            This freelancer hasn't received any reputation NFTs
          </p>
        </div>
      )}

      {/* Reputation Stats */}
      {freelancerReputation.status === 'success' && freelancerReputation.data.totalWorkProofs > 0 && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Total Work Proofs */}
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-violet-400" />
                <span className="text-xs text-slate-400">Completed Jobs</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {freelancerReputation.data.totalWorkProofs}
              </p>
            </div>

            {/* Average Rating */}
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-slate-400">Avg Rating</span>
              </div>
              <div className="flex items-center gap-2">
                <p className={cn('text-2xl font-bold', getRatingColor(freelancerReputation.data.averageRating))}>
                  {freelancerReputation.data.averageRating.toFixed(1)}
                </p>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        'w-3 h-3',
                        star <= Math.round(freelancerReputation.data.averageRating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-600'
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Skill Cloud */}
          {skillCloud.length > 0 && (
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-white">Skill Cloud</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {skillCloud.map(([skill, count]) => (
                  <span
                    key={skill}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                      count >= 5
                        ? 'bg-violet-500 text-white'
                        : count >= 3
                        ? 'bg-violet-500/70 text-white'
                        : 'bg-slate-700 text-slate-300'
                    )}
                  >
                    {skill} ×{count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Work Proofs List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">Work Proof NFTs</span>
              <button
                onClick={() => freelancerAddress && refetchReputation(freelancerAddress)}
                className="text-slate-400 hover:text-slate-300 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {freelancerReputation.data.workProofs.map((workProof) => (
              <div
                key={workProof.tokenId.toString()}
                className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-3"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className={cn('w-4 h-4', getRatingColor(workProof.rating))} />
                    <span className="text-sm font-medium text-white">
                      {workProof.projectType}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm font-bold', getRatingColor(workProof.rating))}>
                      ★ {workProof.rating}/5
                    </span>
                    <a
                      href={`${explorerUrl}/token/${contractAddress}?a=${workProof.tokenId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-400 hover:text-violet-300"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Skills */}
                <div className="flex flex-wrap gap-2">
                  {workProof.skillTags.map((skill, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Description */}
                {workProof.jobDescription && (
                  <p className="text-sm text-slate-400">
                    {workProof.jobDescription}
                  </p>
                )}

                {/* Client Memo */}
                {workProof.clientMemo && (
                  <div className="p-2 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MessageSquare className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-400">Client Memo</span>
                    </div>
                    <p className="text-sm text-slate-300 italic">
                      "{workProof.clientMemo}"
                    </p>
                  </div>
                )}

                {/* Token ID */}
                <div className="pt-2 border-t border-slate-700">
                  <span className="text-xs text-slate-500 font-mono">
                    Token ID: {workProof.tokenId.toString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
