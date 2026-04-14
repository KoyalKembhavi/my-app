/**
 * ERC-721 NFT Deployment Script
 *
 * Usage: ts-node scripts/deploy-erc721.ts
 *
 * This script deploys a Work Proof NFT contract to Arbitrum Sepolia using cargo-stylus.
 * It makes an HTTP request to a deployment backend service which handles the actual deployment.
 */

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  const apiUrl = process.env.ERC721_DEPLOYMENT_API_URL || 'http://localhost:4001';
  const rpcEndpoint = process.env.RPC_ENDPOINT || 'https://sepolia-rollup.arbitrum.io/rpc';

  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable is required');
  }

  console.log('Deploying ERC-721 NFT collection...');
  console.log('Name:', 'SuperPositionNFT');
  console.log('Symbol:', 'SPTNFT');
  console.log('Base URI:', 'https://api.example.com/metadata/');
  console.log('Network:', 'arbitrum-sepolia');
  console.log('Deployment API:', apiUrl);

  // Call the deployment backend service
  const response = await fetch(`${apiUrl}/deploy-nft`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'SuperPositionNFT',
      symbol: 'SPTNFT',
      baseUri: 'https://api.example.com/metadata/',
      privateKey,
      rpcEndpoint,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Deployment failed with status ${response.status}`);
  }

  const result = await response.json();

  console.log('\n✅ NFT collection deployed successfully!');
  console.log('Contract Address:', result.collectionAddress);
  console.log('Transaction Hash:', result.txHash);
  console.log('\nAdd this to your .env file:');
  console.log(`NEXT_PUBLIC_NFT_ADDRESS=${result.collectionAddress}`);
}

main().catch(console.error);
