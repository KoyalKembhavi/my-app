//! Work Proof NFT Contract
//!
//! This contract extends ERC-721 to create a portable reputation system for freelancers.
//! Each completed job mints a "Work Proof" NFT containing:
//! - Project type (e.g., "Web Development", "Graphic Design")
//! - Rating (1-5 scale)
//! - Skill tags (e.g., ["React", "TypeScript", "Node.js"])
//!
//! Key features:
//! - Only clients can mint Work Proofs to freelancers (not self-claimable)
//! - Optional soulbound mode (non-transferable) to prevent reputation trading
//! - On-chain verification of freelancer credentials

use alloc::vec::Vec;
use stylus_sdk::{
    prelude::*,
    alloy_primitives::{Address, U256},
    evm,
    msg,
};
use alloy_sol_types::sol;

use crate::erc721::{Erc721, Erc721Params, Erc721Error};

/// Parameters for Work Proof NFT collection
pub struct WorkProofNFTParams;

impl Erc721Params for WorkProofNFTParams {
    const NAME: &'static str = "RobinhoodNFT";
    const SYMBOL: &'static str = "RHNFT";
    const SOULBOUND: bool = true;
}

sol_storage! {
    /// Work Proof NFT — Stylus entrypoint (ERC-721 + reputation metadata).
    #[entrypoint]
    pub struct WorkProof {
        #[borrow]
        Erc721<WorkProofNFTParams> erc721;
        /// Whether the contract is initialized
        bool initialized;
    }
}

// Define errors
sol! {
    error AlreadyInitialized();
    error Erc721CallFailed();
}

#[derive(SolidityError)]
pub enum WorkProofError {
    AlreadyInitialized(AlreadyInitialized),
    Erc721CallFailed(Erc721CallFailed),
}

impl From<Erc721Error> for WorkProofError {
    fn from(_: Erc721Error) -> Self {
        WorkProofError::Erc721CallFailed(Erc721CallFailed {})
    }
}

#[public]
#[inherit(Erc721<WorkProofNFTParams>)]
impl WorkProof {
    /// Initialize the contract
    /// Can only be called once
    pub fn initialize(&mut self) -> Result<(), WorkProofError> {
        if self.initialized.get() {
            return Err(WorkProofError::AlreadyInitialized(AlreadyInitialized {}));
        }
        self.initialized.set(true);
        Ok(())
    }

    /// Mint a new Work Proof NFT to a freelancer
    ///
    /// # Arguments
    /// * `freelancer` - The address of the freelancer receiving the Work Proof
    /// * `project_type` - Type of project (e.g., "Web Development", "Mobile App")
    /// * `rating` - Rating from 1-5
    /// * `skill_tags` - Comma-separated list of skills used (e.g., "React,TypeScript,Node.js")
    /// * `job_description` - Brief description of the work done
    /// * `client_memo` - Optional feedback/memo from the client
    pub fn mint_work_proof(
        &mut self,
        freelancer: Address,
        project_type: String,
        rating: u8,
        skill_tags: String,
        job_description: String,
        client_memo: String,
    ) -> Result<U256, WorkProofError> {
        // Ensure contract is initialized
        if !self.initialized.get() {
            return Err(WorkProofError::AlreadyInitialized(AlreadyInitialized {}));
        }

        // Delegate to ERC721 implementation
        let token_id = self.erc721.mint_work_proof(
            freelancer,
            project_type,
            rating,
            skill_tags,
            job_description,
            client_memo,
        )?;

        Ok(token_id)
    }

    /// Get all Work Proofs for a freelancer
    pub fn get_freelancer_tokens(&self, freelancer: Address) -> Result<Vec<U256>, WorkProofError> {
        Ok(self.erc721.get_freelancer_tokens(freelancer)?)
    }

    /// Get the count of Work Proofs for a freelancer
    pub fn get_freelancer_token_count(&self, freelancer: Address) -> Result<U256, WorkProofError> {
        Ok(self.erc721.get_freelancer_token_count(freelancer)?)
    }

    /// Get detailed information about a specific Work Proof
    pub fn get_work_proof_info(
        &self,
        token_id: U256,
    ) -> Result<(String, u8, String, String, String, Address), WorkProofError> {
        Ok(self.erc721.get_work_proof_info(token_id)?)
    }

    /// Calculate average rating for a freelancer
    pub fn get_average_rating(&self, freelancer: Address) -> Result<u8, WorkProofError> {
        Ok(self.erc721.get_average_rating(freelancer)?)
    }

    /// Get total number of Work Proofs minted
    pub fn get_total_work_proofs(&self) -> Result<U256, WorkProofError> {
        Ok(self.erc721.get_total_work_proofs()?)
    }

    /// Update a Work Proof (rating/skills only)
    pub fn update_work_proof(
        &mut self,
        token_id: U256,
        new_rating: u8,
        new_skill_tags: String,
    ) -> Result<(), WorkProofError> {
        Ok(self.erc721.update_work_proof(token_id, new_rating, new_skill_tags)?)
    }
}
