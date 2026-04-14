'use client';

/**
 * WorkProofMintPanel - Component for clients to mint Work Proof NFTs to freelancers
 */

import { useState } from 'react';
import { useAccount } from 'wagmi';
import {
  Sparkles,
  Send,
  Star,
  Tags,
  FileText,
  MessageSquare,
  User,
  AlertCircle,
  Check,
  Loader2,
  ExternalLink,
  X,
} from 'lucide-react';
import { cn } from './cn';
import { getWorkProofContractAddress } from './workProofEnv';
import { useWorkProof } from './hooks/useWorkProof';
import type { Address } from 'viem';

interface WorkProofMintPanelProps {
  contractAddress?: string;
  network?: 'arbitrum' | 'arbitrum-sepolia' | 'superposition' | 'superposition-testnet' | 'robinhood-testnet';
  onSuccess?: (tokenId: bigint, hash: string) => void;
}

interface TxStatus {
  status: 'idle' | 'pending' | 'success' | 'error';
  message: string;
  hash?: string;
}

const PROJECT_TYPES = [
  'Web Development',
  'Mobile App Development',
  'Smart Contract Development',
  'UI/UX Design',
  'Graphic Design',
  'Content Writing',
  'Video Editing',
  'Data Analysis',
  'DevOps',
  'Security Audit',
  'Consulting',
  'Other',
];

const COMMON_SKILL_TAGS = [
  'React',
  'TypeScript',
  'JavaScript',
  'Node.js',
  'Python',
  'Solidity',
  'Rust',
  'Next.js',
  'TailwindCSS',
  'PostgreSQL',
  'MongoDB',
  'AWS',
  'Docker',
  'GraphQL',
  'Figma',
  'Photoshop',
];

export function WorkProofMintPanel({
  contractAddress: initialAddress,
  network = 'arbitrum-sepolia',
  onSuccess,
}: WorkProofMintPanelProps) {
  const contractAddress = getWorkProofContractAddress(initialAddress);

  const { isConnected: walletConnected, address: userAddress } = useAccount();
  const { mintWorkProof, txState, isLoading, error, explorerUrl, workProofSupportStatus } = useWorkProof({
    contractAddress,
    network,
  });

  // Form state
  const [freelancerAddress, setFreelancerAddress] = useState('');
  const [projectType, setProjectType] = useState('');
  const [customProjectType, setCustomProjectType] = useState('');
  const [rating, setRating] = useState(5);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkills, setCustomSkills] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [clientMemo, setClientMemo] = useState('');

  // Toggle skill tag
  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  // Add custom skill
  const handleAddCustomSkills = () => {
    const skills = customSkills.split(',').map(s => s.trim()).filter(Boolean);
    setSelectedSkills(prev => [...prev, ...skills]);
    setCustomSkills('');
  };

  // Remove skill
  const removeSkill = (skill: string) => {
    setSelectedSkills(prev => prev.filter(s => s !== skill));
  };

  // Get effective project type
  const effectiveProjectType = projectType === 'Other' ? customProjectType : projectType;

  // Build skill tags string
  const skillTagsString = selectedSkills.join(',');

  // Validate form
  const isValid =
    walletConnected &&
    workProofSupportStatus === 'yes' &&
    freelancerAddress.startsWith('0x') &&
    freelancerAddress.length === 42 &&
    effectiveProjectType &&
    rating >= 1 &&
    rating <= 5 &&
    selectedSkills.length > 0 &&
    jobDescription.trim().length > 0;

  // Handle mint
  const handleMint = async () => {
    if (!isValid) return;

    try {
      const result = await mintWorkProof({
        freelancer: freelancerAddress as Address,
        projectType: effectiveProjectType,
        rating,
        skillTags: skillTagsString,
        jobDescription,
        clientMemo,
      });

      if (onSuccess) {
        onSuccess(result.tokenId, result.hash);
      }

      // Reset form
      setFreelancerAddress('');
      setProjectType('');
      setCustomProjectType('');
      setRating(5);
      setSelectedSkills([]);
      setCustomSkills('');
      setJobDescription('');
      setClientMemo('');
    } catch (err) {
      // Error handled by hook
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span className="text-base font-medium text-white">
            Mint Work Proof NFT
          </span>
        </div>
        <p className="text-sm text-amber-200/70">
          Issue a reputation NFT to a freelancer upon job completion
        </p>
      </div>

      {/* Wallet Status */}
      {!walletConnected && (
        <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-200">
              Please connect your wallet to mint Work Proofs
            </span>
          </div>
        </div>
      )}

      {contractAddress && workProofSupportStatus === 'no' && (
        <div className="p-4 rounded-lg border border-amber-500/40 bg-amber-500/10 text-left">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-100/90">
              <p className="font-medium text-amber-200 mb-1">Minting is disabled for this contract</p>
              <p className="text-amber-100/80">
                This address does not expose Work Proof minting. Set{' '}
                <code className="text-xs">NEXT_PUBLIC_WORK_PROOF_NFT_ADDRESS</code> to your Work Proof Stylus deployment,
                or set <code className="text-xs">NEXT_PUBLIC_NFT_ADDRESS</code> to that contract if you use a single NFT
                app.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contract Address */}
      {contractAddress && (
        <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Contract:</span>
            <a
              href={`${explorerUrl}/address/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-amber-400 hover:underline flex items-center gap-1"
            >
              {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Transaction Status */}
      {txState.status !== 'idle' && (
        <div className={cn(
          'rounded-lg p-3 border flex items-start gap-2',
          txState.status === 'pending' && 'bg-blue-500/10 border-blue-500/30',
          txState.status === 'success' && 'bg-emerald-500/10 border-emerald-500/30',
          txState.status === 'error' && 'bg-red-500/10 border-red-500/30'
        )}>
          {txState.status === 'pending' && <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" />}
          {txState.status === 'success' && <Check className="w-5 h-5 text-emerald-400 shrink-0" />}
          {txState.status === 'error' && <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm font-medium',
              txState.status === 'pending' && 'text-blue-300',
              txState.status === 'success' && 'text-emerald-300',
              txState.status === 'error' && 'text-red-300'
            )}>
              {txState.status === 'pending' && 'Confirming transaction...'}
              {txState.status === 'confirming' && 'Waiting for confirmation...'}
              {txState.status === 'success' && 'Work Proof minted successfully!'}
              {txState.status === 'error' && (error?.message || 'Failed to mint')}
            </p>
            {(txState.status === 'success' || txState.status === 'confirming') && txState.hash && (
              <a
                href={`${explorerUrl}/tx/${txState.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-400 hover:text-slate-300 flex items-center gap-1 mt-1"
              >
                View on Explorer <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          {txState.status === 'success' && (
            <button
              onClick={() => {}}
              className="text-slate-400 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        {/* Freelancer Address */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <User className="w-4 h-4" />
            Freelancer Address
          </label>
          <input
            type="text"
            value={freelancerAddress}
            onChange={(e) => setFreelancerAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Project Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Project Type
          </label>
          <select
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
          >
            <option value="">Select project type...</option>
            {PROJECT_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          {projectType === 'Other' && (
            <input
              type="text"
              value={customProjectType}
              onChange={(e) => setCustomProjectType(e.target.value)}
              placeholder="Enter custom project type"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          )}
        </div>

        {/* Rating */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Star className="w-4 h-4" />
            Rating
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={cn(
                  'w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold transition-all',
                  rating >= star
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-800 text-slate-600 hover:bg-slate-700'
                )}
              >
                {star}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            {rating === 1 && 'Poor - Did not meet expectations'}
            {rating === 2 && 'Below Average - Some issues'}
            {rating === 3 && 'Good - Met expectations'}
            {rating === 4 && 'Very Good - Exceeded expectations'}
            {rating === 5 && 'Excellent - Outstanding work'}
          </p>
        </div>

        {/* Skill Tags */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Tags className="w-4 h-4" />
            Skills Demonstrated
          </label>
          <div className="flex flex-wrap gap-2">
            {COMMON_SKILL_TAGS.map(skill => (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  selectedSkills.includes(skill)
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                )}
              >
                {skill}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customSkills}
              onChange={(e) => setCustomSkills(e.target.value)}
              placeholder="Add custom skills (comma-separated)"
              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={handleAddCustomSkills}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Add
            </button>
          </div>
          {selectedSkills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedSkills.map(skill => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-full text-xs"
                >
                  {skill}
                  <button
                    onClick={() => removeSkill(skill)}
                    className="hover:text-amber-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Job Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Job Description
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Describe the work completed..."
            rows={4}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>

        {/* Client Memo (Optional) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Client Memo <span className="text-slate-500 text-xs">(Optional)</span>
          </label>
          <textarea
            value={clientMemo}
            onChange={(e) => setClientMemo(e.target.value)}
            placeholder="Add a personal note or feedback..."
            rows={2}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleMint}
          disabled={!isValid || isLoading || workProofSupportStatus !== 'yes'}
          className={cn(
            'w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2',
            isValid && !isLoading
              ? 'bg-amber-500 hover:bg-amber-400 text-white'
              : 'bg-slate-700 text-slate-400 cursor-not-allowed'
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Minting...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Mint Work Proof NFT
            </>
          )}
        </button>
      </div>
    </div>
  );
}
