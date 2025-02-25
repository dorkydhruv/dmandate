use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PaymentHistory {
    /// The mandate this payment belongs to
    pub mandate: Pubkey,
    /// The payment amount
    pub amount: u64,
    /// The timestamp when payment was executed
    pub timestamp: i64,
    /// The payment sequence number
    pub payment_number: u32,
    /// The bump seed for this PDA
    pub bump: u8,
}
