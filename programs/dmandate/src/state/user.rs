use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct User {
    /// The owner/authority of this user account
    pub authority: Pubkey,
    /// Total number of active outgoing subscriptions (as payer)
    pub outgoing_subscriptions_count: u32,
    /// Total number of active incoming subscriptions (as payee)
    pub incoming_subscriptions_count: u32,
    /// Optional name for the user
    #[max_len(32)]
    pub name: String,
    /// Bump seed for PDA derivation
    pub bump: u8,
}
