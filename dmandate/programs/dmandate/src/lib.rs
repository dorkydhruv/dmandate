#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;

declare_id!("87v5rtrAA9gVGDmaBMfCF9JWLZo3rtSVomtxLbUCNH79");
pub mod instructions;
pub mod state;
pub mod error;
use crate::instructions::*;

#[program]
pub mod dmandate {
    use super::*;

    pub fn create_mandate(
        ctx: Context<CreateMandate>,
        amount: u64,
        frequency: i64,
        name: String,
        description: String
    ) -> Result<()> {
        ctx.accounts.process(amount, frequency, name, description, &ctx.bumps)
    }

    pub fn cancel_mandate(ctx: Context<CancelMandate>) -> Result<()> {
        ctx.accounts.process()
    }

    pub fn execute_payment(ctx: Context<ExecutePayment>) -> Result<()> {
        ctx.accounts.execute_payment(&ctx.bumps)
    }

    pub fn register_user(ctx: Context<RegisterUser>, name: String) -> Result<()> {
        ctx.accounts.process(name, &ctx.bumps)
    }

    pub fn get_user_subscriptions(ctx: Context<GetUserSubscriptions>) -> Result<()> {
        ctx.accounts.process()
    }

    pub fn reapprove_mandate(ctx: Context<ReapproveMandate>, amount: u64) -> Result<()> {
        ctx.accounts.process(amount)
    }

    pub fn close_payment_history(ctx: Context<ClosePaymentHistory>) -> Result<()> {
        ctx.accounts.process()
    }
}
