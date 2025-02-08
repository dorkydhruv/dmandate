use anchor_lang::prelude::*;
use anchor_spl::token_interface::{ Mint, TokenAccount, TokenInterface, Approve, approve };

use crate::state::Mandate;

#[derive(Accounts)]
pub struct TopupAllowance<'info> {
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

impl<'info> TopupAllowance<'info> {
    pub fn topup_allowance(&mut self) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = Approve {
            authority: self.payer.to_account_info(),
            delegate: self.mandate.to_account_info(),
            to: self.payer_ata.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        // future fix: should approve the amount based on holder's balance
        approve(cpi_ctx, self.mandate.amount)
    }
}
