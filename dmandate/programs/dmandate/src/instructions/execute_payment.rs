use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{ Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked },
};

use crate::state::{ Mandate, PaymentHistory };

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
    #[account(
        init,
        payer = signer,
        space = 8 + PaymentHistory::INIT_SPACE,
        seeds = [b"payment_history", mandate.key().as_ref(), &mandate.payment_count.to_le_bytes()],
        bump
    )]
    pub payment_history: Account<'info, PaymentHistory>,
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
    pub fn execute_payment(&mut self, bumps: &ExecutePaymentBumps) -> Result<()> {
        // Check if enough time has passed
        let now = Clock::get()?.unix_timestamp;
        require!(now >= self.mandate.next_payout, crate::error::Error::PaymentTooEarly);

        // Perform the token transfer
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = TransferChecked {
            from: self.payer_ata.to_account_info(),
            to: self.payee_ata.to_account_info(),
            authority: self.mandate.to_account_info(),
            mint: self.token.to_account_info(),
        };
        let signer_seeds: &[&[&[u8]]] = &[
            &[
                b"dmandate",
                self.mandate.payer.as_ref(),
                self.mandate.payee.as_ref(),
                &[self.mandate.bump],
            ],
        ];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        transfer_checked(cpi_ctx, self.mandate.amount, self.token.decimals)?;

        // Record payment history
        self.payment_history.set_inner(PaymentHistory {
            mandate: self.mandate.key(),
            amount: self.mandate.amount,
            timestamp: now,
            payment_number: self.mandate.payment_count,
            bump: bumps.payment_history,
        });

        // Update mandate
        self.mandate.next_payout = now.wrapping_add(self.mandate.frequency);
        self.mandate.payment_count += 1;

        Ok(())
    }
}
