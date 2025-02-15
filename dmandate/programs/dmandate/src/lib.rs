#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;

declare_id!("B2aPkqbx99PCMPY9uPEzCjewhv7MVHUHsCcFn5viPbjk");
pub mod instructions;
pub mod state;
pub mod error;
use crate::instructions::*;
#[program]
pub mod dmandate {
    use super::*;

    pub fn create_mandate(ctx: Context<CreateMandate>, amount: u64, frequency: i64) -> Result<()> {
        ctx.accounts.init_mandate(amount, frequency, &ctx.bumps)?;
        ctx.accounts.approve_delegate_authority()
    }

    pub fn cancel_mandate(ctx: Context<CancelMandate>) -> Result<()> {
        ctx.accounts.revoke_delegate_authority()
    }

    pub fn execute_payment(ctx: Context<ExecutePayment>) -> Result<()> {
        ctx.accounts.execute_payment()
    }

    pub fn topup_allowance(ctx: Context<TopupAllowance>) -> Result<()> {
        ctx.accounts.topup_allowance()
    }
}
