'use client';

import dynamic from 'next/dynamic';

/**
 * Radix + form controls are sensitive to extension-injected DOM attrs (e.g. fdprocessedid).
 * next/dynamic with ssr: false must live in a Client Component (Next.js 16+).
 */
const WorkProofMintPanel = dynamic(
  () =>
    import('@/lib/erc721-stylus/src').then((m) => ({
      default: m.WorkProofMintPanel,
    })),
  { ssr: false, loading: () => <PanelPlaceholder /> },
);

const FreelancerReputationPanel = dynamic(
  () =>
    import('@/lib/erc721-stylus/src').then((m) => ({
      default: m.FreelancerReputationPanel,
    })),
  { ssr: false, loading: () => <PanelPlaceholder /> },
);

function PanelPlaceholder() {
  return (
    <div
      className="animate-pulse rounded-lg bg-slate-800/40 min-h-[12rem] w-full"
      aria-hidden
    />
  );
}

export function HomePanelsClient() {
  return (
    <>
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <WorkProofMintPanel />
        <FreelancerReputationPanel />
      </div>
    </>
  );
}
