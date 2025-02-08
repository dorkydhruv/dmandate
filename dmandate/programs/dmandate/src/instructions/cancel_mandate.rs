use anchor_lang::prelude::*;
use anchor_spl::token_interface::{ Mint, TokenAccount, TokenInterface, Revoke, revoke };

use crate::state::Mandate;

#[derive(Accounts)]
pub struct CancelMandate<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub token: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = token,
        associated_token::authority = payer,
    )]
    pub payer_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"dmandate", payer.key().as_ref(), mandate.payee.as_ref()],
        bump= mandate.bump,
        close = payer,
    )]
    pub mandate: Account<'info, Mandate>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> CancelMandate<'info> {
    pub fn revoke_delegate_authority(&mut self) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = Revoke {
            authority: self.payer.to_account_info(),
            source: self.mandate.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        revoke(cpi_ctx)
    }
}
