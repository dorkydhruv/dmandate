use anchor_lang::prelude::*;

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
}
