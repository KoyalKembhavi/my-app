# Integration Map

How components connect and what data flows between them.

### Erc721-stylus --> Frontend-scaffold

- **Source**: Erc721-stylus (`2e71cf51`)
  - Output ports: NFT Contract (contract)
- **Target**: Frontend-scaffold (`74c20f50`)
  - Input ports: Contract ABI (contract), Network Config (config)

### Frontend-scaffold --> Wallet-auth

- **Source**: Frontend-scaffold (`74c20f50`)
  - Output ports: App Context (config)
- **Target**: Wallet-auth (`e641bde6`)
  
