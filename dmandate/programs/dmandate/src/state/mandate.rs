use anchor_lang::prelude::*;

// Manually compute size required by Mandate
pub const MANDATE_SIZE: usize =
    8 + // Anchor discriminator
    32 + // payer
    32 + // payee
    8 + // amount
    32 + // token
    8 + // frequency
    1 + // active
    8 + // next_payout
    1 + // bump
    4 +
    20 + // name (max_len 20)
    4 +
    50 + // description (max_len 50)
    4; // payment_count

#[account]
#[derive(InitSpace)]
pub struct Mandate {
    pub payer: Pubkey,
    pub payee: Pubkey,
    pub amount: u64,
    pub token: Pubkey,
    pub frequency: i64,
    pub active: bool,
    pub next_payout: i64,
    pub bump: u8,
    #[max_len(20)]
    pub name: String,
    #[max_len(50)]
    pub description: String,
    // Track number of payments for payment history
    pub payment_count: u32,
}
