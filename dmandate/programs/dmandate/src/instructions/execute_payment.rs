use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{ Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked },
};

use crate::state::Mandate;

#[derive(Accounts)]
pub struct ExecutePayment<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub payer: SystemAccount<'info>,
    #[account(
        mut,
        associated_token::mint=token,
        associated_token::authority=payer,
    )]
    pub payer_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub payee: SystemAccount<'info>,
    #[account(
        mut,
        seeds = [b"dmandate",mandate.payer.as_ref(),mandate.payee.as_ref()],
        bump = mandate.bump,
    )]
    pub mandate: Account<'info, Mandate>,
    pub token: InterfaceAccount<'info, Mint>,
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = token,
        associated_token::authority = payee
    )]
    pub payee_ata: InterfaceAccount<'info, TokenAccount>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> ExecutePayment<'info> {
    pub fn execute_payment(&mut self) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = TransferChecked {
            from: self.payer_ata.to_account_info(),
            to: self.payee_ata.to_account_info(),
            authority: self.mandate.to_account_info(),
            mint: self.token.to_account_info(),
        };
        let signer_seeds: &[&[&[u8]]] = &[
            &[
                b"mandate",
                self.mandate.payer.as_ref(),
                self.mandate.payee.as_ref(),
                &[self.mandate.bump],
            ],
        ];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        transfer_checked(cpi_ctx, self.mandate.amount, self.token.decimals)
    }
}
