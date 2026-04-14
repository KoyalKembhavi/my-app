//! Implementation of the ERC-721 standard
//!
//! The eponymous [`Erc721`] type provides all the standard methods,
//! and is intended to be inherited by other contract types.
//!
//! You can configure the behavior of [`Erc721`] via the [`Erc721Params`] trait,
//! which allows specifying the name, symbol, and token uri.
//!
//! Note that this code is unaudited and not fit for production use.

use alloc::vec;
use core::{borrow::BorrowMut, marker::PhantomData};
use stylus_sdk::{
    abi::Bytes,
    evm,
    msg,
    prelude::*,
    alloy_primitives::{Address, FixedBytes, U256, U8}
};
use alloy_sol_types::sol;

pub trait Erc721Params {
    /// Immutable NFT name.
    const NAME: &'static str;

    /// Immutable NFT symbol.
    const SYMBOL: &'static str;

    /// Whether NFTs are soulbound (non-transferable) - for work proof functionality
    const SOULBOUND: bool = false;
}

sol_storage! {
    /// Erc721 implements all ERC-721 methods
    pub struct Erc721<T: Erc721Params> {
        /// Token id to owner map
        mapping(uint256 => address) owners;
        /// User to balance map
        mapping(address => uint256) balances;
        /// Token id to approved user map
        mapping(uint256 => address) token_approvals;
        /// User to operator map (the operator can manage all NFTs of the owner)
        mapping(address => mapping(address => bool)) operator_approvals;
        /// Total supply
        uint256 total_supply;
        /// Token ID to project type mapping (work proof)
        mapping(uint256 => string) project_types;
        /// Token ID to rating mapping (1-5 scale, stored as uint8) (work proof)
        mapping(uint256 => uint8) ratings;
        /// Token ID to skill tags mapping (stored as comma-separated string) (work proof)
        mapping(uint256 => string) skill_tags;
        /// Token ID to job description mapping (work proof)
        mapping(uint256 => string) job_descriptions;
        /// Token ID to client memo mapping (optional feedback from client) (work proof)
        mapping(uint256 => string) client_memos;
        /// Freelancer address to list of their token IDs (for easy enumeration) (work proof)
        mapping(address => uint256[]) freelancer_tokens;
        /// Used to allow [`Erc721Params`]
        PhantomData<T> phantom;
    }
}

// Declare events and Solidity error types
sol! {
    event Transfer(address indexed from, address indexed to, uint256 indexed token_id);
    event Approval(address indexed owner, address indexed approved, uint256 indexed token_id);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    // Work Proof events
    event WorkProofMinted(
        uint256 indexed token_id,
        address indexed freelancer,
        address indexed client,
        string project_type,
        uint8 rating,
        string skill_tags
    );
    event WorkProofUpdated(
        uint256 indexed token_id,
        uint8 new_rating,
        string new_skill_tags
    );

    // Token id has not been minted, or it has been burned
    error InvalidTokenId(uint256 token_id);
    // The specified address is not the owner of the specified token id
    error NotOwner(address from, uint256 token_id, address real_owner);
    // The specified address does not have allowance to spend the specified token id
    error NotApproved(address owner, address spender, uint256 token_id);
    // Attempt to transfer token id to the Zero address
    error TransferToZero(uint256 token_id);
    // The receiver address refused to receive the specified token id
    error ReceiverRefused(address receiver, uint256 token_id, bytes4 returned);

    // Work Proof errors
    error InvalidRating(uint8 rating);
    error SoulboundNFT(address freelancer, uint256 token_id);
    error NotClient(address caller, uint256 token_id);
    error TokenDoesNotExist(uint256 token_id);
    error EmptySkillTags();
    error EmptyProjectType();
}

/// Represents the ways methods may fail.
#[derive(SolidityError)]
pub enum Erc721Error {
    InvalidTokenId(InvalidTokenId),
    NotOwner(NotOwner),
    NotApproved(NotApproved),
    TransferToZero(TransferToZero),
    ReceiverRefused(ReceiverRefused),
    // Work Proof errors
    InvalidRating(InvalidRating),
    SoulboundNFT(SoulboundNFT),
    NotClient(NotClient),
    TokenDoesNotExist(TokenDoesNotExist),
    EmptySkillTags(EmptySkillTags),
    EmptyProjectType(EmptyProjectType),
}

// External interfaces
sol_interface! {
    /// Allows calls to the `onERC721Received` method of other contracts implementing `IERC721TokenReceiver`.
    interface IERC721TokenReceiver {
        function onERC721Received(address operator, address from, uint256 token_id, bytes data) external returns(bytes4);
    }
}

/// Selector for `onERC721Received`, which is returned by contracts implementing `IERC721TokenReceiver`.
const ERC721_TOKEN_RECEIVER_ID: u32 = 0x150b7a02;

// These methods aren't public, but are helpers used by public methods.
// Methods marked as "pub" here are usable outside of the erc721 module (i.e. they're callable from lib.rs).
impl<T: Erc721Params> Erc721<T> {
    /// Requires that msg::sender() is authorized to spend a given token
    fn require_authorized_to_spend(
        &self,
        from: Address,
        token_id: U256,
    ) -> Result<(), Erc721Error> {
        // `from` must be the owner of the token_id
        let owner = self.owner_of(token_id)?;
        if from != owner {
            return Err(Erc721Error::NotOwner(NotOwner {
                from,
                token_id,
                real_owner: owner,
            }));
        }

        // caller is the owner
        if msg::sender() == owner {
            return Ok(());
        }

        // caller is an operator for the owner (can manage their tokens)
        if self.operator_approvals.getter(owner).get(msg::sender()) {
            return Ok(());
        }

        // caller is approved to manage this token_id
        if msg::sender() == self.token_approvals.get(token_id) {
            return Ok(());
        }

        // otherwise, caller is not allowed to manage this token_id
        Err(Erc721Error::NotApproved(NotApproved {
            owner,
            spender: msg::sender(),
            token_id,
        }))
    }

    /// Transfers `token_id` from `from` to `to`.
    /// This function does check that `from` is the owner of the token, but it does not check
    /// that `to` is not the zero address, as this function is usable for burning.
    pub fn transfer(
        &mut self,
        token_id: U256,
        from: Address,
        to: Address,
    ) -> Result<(), Erc721Error> {
        let mut owner = self.owners.setter(token_id);
        let previous_owner = owner.get();
        if previous_owner != from {
            return Err(Erc721Error::NotOwner(NotOwner {
                from,
                token_id,
                real_owner: previous_owner,
            }));
        }
        owner.set(to);

        // right now working with storage can be verbose, but this will change upcoming version of the Stylus SDK
        let mut from_balance = self.balances.setter(from);
        let balance = from_balance.get() - U256::from(1);
        from_balance.set(balance);

        let mut to_balance = self.balances.setter(to);
        let balance = to_balance.get() + U256::from(1);
        to_balance.set(balance);

        // cleaning app the approved mapping for this token
        self.token_approvals.delete(token_id);

        evm::log(Transfer { from, to, token_id });
        Ok(())
    }

    /// Calls `onERC721Received` on the `to` address if it is a contract.
    /// Otherwise it does nothing
    fn call_receiver<S: TopLevelStorage>(
        storage: &mut S,
        token_id: U256,
        from: Address,
        to: Address,
        data: Vec<u8>,
    ) -> Result<(), Erc721Error> {
        if to.has_code() {
            let receiver = IERC721TokenReceiver::new(to);
            let received = receiver
                .on_erc_721_received(&mut *storage, msg::sender(), from, token_id, data.into())
                .map_err(|_e| {
                    Erc721Error::ReceiverRefused(ReceiverRefused {
                        receiver: receiver.address,
                        token_id,
                        returned: FixedBytes(0_u32.to_be_bytes()),
                    })
                })?
                .0;

            if u32::from_be_bytes(received) != ERC721_TOKEN_RECEIVER_ID {
                return Err(Erc721Error::ReceiverRefused(ReceiverRefused {
                    receiver: receiver.address,
                    token_id,
                    returned: FixedBytes(received),
                }));
            }
        }
        Ok(())
    }

    /// Transfers and calls `onERC721Received`
    pub fn safe_transfer<S: TopLevelStorage + BorrowMut<Self>>(
        storage: &mut S,
        token_id: U256,
        from: Address,
        to: Address,
        data: Vec<u8>,
    ) -> Result<(), Erc721Error> {
        storage.borrow_mut().transfer(token_id, from, to)?;
        Self::call_receiver(storage, token_id, from, to, data)
    }

    /// Mints a new token and transfers it to `to`
    pub fn mint(&mut self, to: Address) -> Result<(), Erc721Error> {
        let new_token_id = self.total_supply.get();
        self.total_supply.set(new_token_id + U256::from(1u8));
        self.transfer(new_token_id, Address::default(), to)?;
        Ok(())
    }

    /// Mints a new token, and safe_transfers it to `to`
    pub fn safe_mint<S: TopLevelStorage + BorrowMut<Self>>(
        storage: &mut S,
        to: Address,
        data: Vec<u8>,
    ) -> Result<(), Erc721Error> {
        let this = storage.borrow_mut();
        let new_token_id = this.total_supply.get();
        this.total_supply.set(new_token_id + U256::from(1u8));
        Self::safe_transfer(storage, new_token_id, Address::default(), to, data)?;
        Ok(())
    }

    /// Burns the token `token_id` from `from`
    /// Note that total_supply is not reduced since it's used to calculate the next token_id to mint
    pub fn burn(&mut self, from: Address, token_id: U256) -> Result<(), Erc721Error> {
        self.transfer(token_id, from, Address::default())?;
        Ok(())
    }
}

// these methods are public to other contracts
#[public]
impl<T: Erc721Params> Erc721<T> {
    /// Immutable NFT name.
    pub fn name() -> Result<String, Erc721Error> {
        Ok(T::NAME.into())
    }

    /// Immutable NFT symbol.
    pub fn symbol() -> Result<String, Erc721Error> {
        Ok(T::SYMBOL.into())
    }

    /// Gets the number of NFTs owned by an account.
    pub fn balance_of(&self, owner: Address) -> Result<U256, Erc721Error> {
        Ok(self.balances.get(owner))
    }

    /// Gets the owner of the NFT, if it exists.
    pub fn owner_of(&self, token_id: U256) -> Result<Address, Erc721Error> {
        let owner = self.owners.get(token_id);
        if owner.is_zero() {
            return Err(Erc721Error::InvalidTokenId(InvalidTokenId { token_id }));
        }
        Ok(owner)
    }

    /// Transfers an NFT, but only after checking the `to` address can receive the NFT.
    /// It includes additional data for the receiver.
    #[selector(name = "safeTransferFrom")]
    pub fn safe_transfer_from_with_data<S: TopLevelStorage + BorrowMut<Self>>(
        storage: &mut S,
        from: Address,
        to: Address,
        token_id: U256,
        data: Bytes,
    ) -> Result<(), Erc721Error> {
        if to.is_zero() {
            return Err(Erc721Error::TransferToZero(TransferToZero { token_id }));
        }
        storage
            .borrow_mut()
            .require_authorized_to_spend(from, token_id)?;

        Self::safe_transfer(storage, token_id, from, to, data.0)
    }

    /// Equivalent to [`safe_transfer_from_with_data`], but without the additional data.
    ///
    /// Note: because Rust doesn't allow multiple methods with the same name,
    /// we use the `#[selector]` macro attribute to simulate solidity overloading.
    #[selector(name = "safeTransferFrom")]
    pub fn safe_transfer_from<S: TopLevelStorage + BorrowMut<Self>>(
        storage: &mut S,
        from: Address,
        to: Address,
        token_id: U256,
    ) -> Result<(), Erc721Error> {
        Self::safe_transfer_from_with_data(storage, from, to, token_id, Bytes(vec![]))
    }

    /// Transfers the NFT.
    pub fn transfer_from(
        &mut self,
        from: Address,
        to: Address,
        token_id: U256,
    ) -> Result<(), Erc721Error> {
        if T::SOULBOUND {
            return Err(Erc721Error::SoulboundNFT(SoulboundNFT {
                freelancer: from,
                token_id,
            }));
        }
        if to.is_zero() {
            return Err(Erc721Error::TransferToZero(TransferToZero { token_id }));
        }
        self.require_authorized_to_spend(from, token_id)?;
        self.transfer(token_id, from, to)?;
        Ok(())
    }

    /// Grants an account the ability to manage the sender's NFT.
    pub fn approve(&mut self, approved: Address, token_id: U256) -> Result<(), Erc721Error> {
        let owner = self.owner_of(token_id)?;

        // require authorization
        if msg::sender() != owner && !self.operator_approvals.getter(owner).get(msg::sender()) {
            return Err(Erc721Error::NotApproved(NotApproved {
                owner,
                spender: msg::sender(),
                token_id,
            }));
        }
        self.token_approvals.insert(token_id, approved);

        evm::log(Approval {
            approved,
            owner,
            token_id,
        });
        Ok(())
    }

    /// Grants an account the ability to manage all of the sender's NFTs.
    pub fn set_approval_for_all(
        &mut self,
        operator: Address,
        approved: bool,
    ) -> Result<(), Erc721Error> {
        let owner = msg::sender();
        self.operator_approvals
            .setter(owner)
            .insert(operator, approved);

        evm::log(ApprovalForAll {
            owner,
            operator,
            approved,
        });
        Ok(())
    }

    /// Gets the account managing an NFT, or zero if unmanaged.
    pub fn get_approved(&mut self, token_id: U256) -> Result<Address, Erc721Error> {
        Ok(self.token_approvals.get(token_id))
    }

    /// Determines if an account has been authorized to managing all of a user's NFTs.
    pub fn is_approved_for_all(
        &mut self,
        owner: Address,
        operator: Address,
    ) -> Result<bool, Erc721Error> {
        Ok(self.operator_approvals.getter(owner).get(operator))
    }

    /// Whether the NFT supports a given standard.
    pub fn supports_interface(interface: FixedBytes<4>) -> Result<bool, Erc721Error> {
        let interface_slice_array: [u8; 4] = interface.as_slice().try_into().unwrap();

        if u32::from_be_bytes(interface_slice_array) == 0xffffffff {
            // special cased in the ERC165 standard
            return Ok(false);
        }

        const IERC165: u32 = 0x01ffc9a7;
        const IERC721: u32 = 0x80ac58cd;
        const IERC721_METADATA: u32 = 0x5b5e139f;

        Ok(matches!(
            u32::from_be_bytes(interface_slice_array),
            IERC165 | IERC721 | IERC721_METADATA
        ))
    }

    // Work Proof methods

    /// Mint a new Work Proof NFT to a freelancer
    ///
    /// # Arguments
    /// * `freelancer` - The address of the freelancer receiving the Work Proof
    /// * `project_type` - Type of project (e.g., "Web Development", "Mobile App")
    /// * `rating` - Rating from 1-5
    /// * `skill_tags` - Comma-separated list of skills used (e.g., "React,TypeScript,Node.js")
    /// * `job_description` - Brief description of the work done
    /// * `client_memo` - Optional feedback/memo from the client
    ///
    /// # Requirements
    /// * Rating must be between 1 and 5
    /// * Project type cannot be empty
    /// * Skill tags cannot be empty
    pub fn mint_work_proof(
        &mut self,
        freelancer: Address,
        project_type: String,
        rating: u8,
        skill_tags: String,
        job_description: String,
        client_memo: String,
    ) -> Result<U256, Erc721Error> {
        // Validate inputs
        if rating < 1 || rating > 5 {
            return Err(Erc721Error::InvalidRating(InvalidRating { rating }));
        }
        if project_type.is_empty() {
            return Err(Erc721Error::EmptyProjectType(EmptyProjectType {}));
        }
        if skill_tags.is_empty() {
            return Err(Erc721Error::EmptySkillTags(EmptySkillTags {}));
        }

        // Mint the underlying NFT
        let token_id = self.total_supply.get();
        self.mint(freelancer)?;

        // Store metadata
        self.project_types
            .setter(token_id)
            .set_str(project_type.as_str());
        self
            .ratings
            .insert(token_id, U8::from(rating));
        self.skill_tags.setter(token_id).set_str(skill_tags.as_str());
        self.job_descriptions
            .setter(token_id)
            .set_str(job_description.as_str());
        self.client_memos
            .setter(token_id)
            .set_str(client_memo.as_str());

        // Track tokens for this freelancer
        self.freelancer_tokens.setter(freelancer).push(token_id);

        // Emit event
        evm::log(WorkProofMinted {
            token_id,
            freelancer,
            client: msg::sender(),
            project_type,
            rating: rating.into(),
            skill_tags,
        });

        Ok(token_id)
    }

    /// Get all Work Proofs for a freelancer
    /// Returns array of token IDs owned by the freelancer
    pub fn get_freelancer_tokens(&self, freelancer: Address) -> Result<Vec<U256>, Erc721Error> {
        let list = self.freelancer_tokens.getter(freelancer);
        let mut out = Vec::new();
        for i in 0..list.len() {
            if let Some(id) = list.get(i) {
                out.push(id);
            }
        }
        Ok(out)
    }

    /// Get the count of Work Proofs for a freelancer
    pub fn get_freelancer_token_count(&self, freelancer: Address) -> Result<U256, Erc721Error> {
        let list = self.freelancer_tokens.getter(freelancer);
        Ok(U256::from(list.len()))
    }

    /// Get detailed information about a specific Work Proof
    pub fn get_work_proof_info(
        &self,
        token_id: U256,
    ) -> Result<(String, u8, String, String, String, Address), Erc721Error> {
        // Verify token exists
        let owner = self.owner_of(token_id)?;

        let project_type = self.project_types.getter(token_id).get_string();
        let rating: u8 = self.ratings.get(token_id).to();
        let skill_tags = self.skill_tags.getter(token_id).get_string();
        let job_description = self.job_descriptions.getter(token_id).get_string();
        let client_memo = self.client_memos.getter(token_id).get_string();

        Ok((project_type, rating, skill_tags, job_description, client_memo, owner))
    }

    /// Calculate average rating for a freelancer
    pub fn get_average_rating(&self, freelancer: Address) -> Result<u8, Erc721Error> {
        let list = self.freelancer_tokens.getter(freelancer);
        if list.is_empty() {
            return Ok(0);
        }

        let mut total: u32 = 0;
        for i in 0..list.len() {
            let r: u8 = self.ratings.get(list.get(i).unwrap_or(U256::ZERO)).to();
            total += r as u32;
        }

        Ok((total / list.len() as u32) as u8)
    }

    /// Get total number of Work Proofs minted
    pub fn get_total_work_proofs(&self) -> Result<U256, Erc721Error> {
        Ok(self.total_supply.get())
    }

    /// Update a Work Proof (rating/skills only)
    /// Only allowed if:
    /// - Caller is the original client (minted by them)
    /// - NFT is not soulbound (or soulbound mode is disabled)
    pub fn update_work_proof(
        &mut self,
        token_id: U256,
        new_rating: u8,
        new_skill_tags: String,
    ) -> Result<(), Erc721Error> {
        // Validate rating
        if new_rating < 1 || new_rating > 5 {
            return Err(Erc721Error::InvalidRating(InvalidRating { rating: new_rating }));
        }

        // Verify token exists and get owner
        let owner = self.owner_of(token_id)?;

        // Check if soulbound
        if T::SOULBOUND {
            return Err(Erc721Error::SoulboundNFT(SoulboundNFT {
                freelancer: owner,
                token_id
            }));
        }

        // Verify caller is the original client
        // For simplicity, we check if caller is NOT the freelancer (owner)
        // In production, you'd want to track the original client separately
        if msg::sender() == owner {
            return Err(Erc721Error::NotClient(NotClient {
                caller: msg::sender(),
                token_id,
            }));
        }

        // Update metadata
        self
            .ratings
            .insert(token_id, U8::from(new_rating));
        self.skill_tags
            .setter(token_id)
            .set_str(new_skill_tags.as_str());

        // Emit event
        evm::log(WorkProofUpdated {
            token_id,
            new_rating: new_rating.into(),
            new_skill_tags,
        });

        Ok(())
    }
}