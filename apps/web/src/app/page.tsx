import { WalletButton } from '@/components/wallet-button';
import { HomePanelsClient } from '@/components/home-panels-client';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-6xl w-full text-center">
        <h1 className="text-4xl font-bold mb-2">
          Work Proof NFT
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Portable reputation for freelancers — on-chain verified work history
        </p>

        <div className="flex justify-center mb-8">
          <WalletButton />
        </div>

        <HomePanelsClient />
      </div>
    </main>
  );
}
