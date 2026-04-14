/**
 * Work Proof UI reads/writes this address.
 * Defaults to `NEXT_PUBLIC_NFT_ADDRESS` (this app’s Stylus build is Work Proof–only).
 * Set `NEXT_PUBLIC_WORK_PROOF_NFT_ADDRESS` only if you split Work Proof from another NFT app.
 */
export function getWorkProofContractAddress(propOverride?: string): string {
  const fromProp = propOverride?.trim();
  if (fromProp) return fromProp;
  const dedicated = process.env.NEXT_PUBLIC_WORK_PROOF_NFT_ADDRESS?.trim();
  if (dedicated) return dedicated;
  return process.env.NEXT_PUBLIC_NFT_ADDRESS?.trim() || '';
}
