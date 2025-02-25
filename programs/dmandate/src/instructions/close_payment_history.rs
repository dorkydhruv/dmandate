use anchor_lang::prelude::*;
use crate::state::{ Mandate, PaymentHistory };

#[derive(Accounts)]
pub struct ClosePaymentHistory<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [b"dmandate", mandate.payer.as_ref(), mandate.payee.as_ref()],
        bump = mandate.bump,
        constraint = mandate.payer == authority.key() || mandate.payee == authority.key() @ crate::error::Error::Unauthorized
    )]
    pub mandate: Account<'info, Mandate>,
    #[account(
        mut,
        close = authority,
        seeds = [
            b"payment_history",
            mandate.key().as_ref(),
            &payment_history.payment_number.to_le_bytes()
        ],
        bump = payment_history.bump,
        constraint = payment_history.mandate == mandate.key() @ crate::error::Error::InvalidPaymentHistory
    )]
    pub payment_history: Account<'info, PaymentHistory>,
    pub system_program: Program<'info, System>,
}

impl<'info> ClosePaymentHistory<'info> {
    pub fn process(&mut self) -> Result<()> {
        // The account will be automatically closed and rent returned to authority
        // due to the "close = authority" constraint above
        Ok(())
    }
}
