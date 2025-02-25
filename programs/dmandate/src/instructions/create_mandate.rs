use std::ops::Mul;

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{ Mint, TokenAccount, TokenInterface, Approve, approve };

use crate::state::{ Mandate, User, MANDATE_SIZE };

#[derive(Accounts)]
pub struct CreateMandate<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub payee: SystemAccount<'info>,
    pub token: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = token,
        associated_token::authority = payer,
    )]
    pub payer_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = payer,
        seeds = [b"dmandate", payer.key().as_ref(), payee.key().as_ref()],
        bump,
        space = MANDATE_SIZE
    )]
    pub mandate: Account<'info, Mandate>,
    #[account(
        mut,
        seeds = [b"user", payer.key().as_ref()],
        bump,
    )]
    pub payer_user: Account<'info, User>,

    #[account(
        mut,
        seeds = [b"user", payee.key().as_ref()],
        bump,
    )]
    pub payee_user: Account<'info, User>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> CreateMandate<'info> {
    pub fn init_mandate(
        &mut self,
        amount: u64,
        frequency: i64,
        name: String,
        description: String,
        bumps: &CreateMandateBumps
    ) -> Result<()> {
        self.mandate.set_inner(Mandate {
            payer: self.payer.key(),
            payee: self.payee.key(),
            amount: amount,
            token: self.token.key(),
            frequency,
            active: true,
            next_payout: Clock::get()?.unix_timestamp.wrapping_add(frequency),
            bump: bumps.mandate,
            name,
            description,
            payment_count: 0,
        });
        Ok(())
    }

    pub fn approve_delegate_authority(&mut self) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = Approve {
            authority: self.payer.to_account_info(),
            delegate: self.mandate.to_account_info(),
            to: self.payer_ata.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        // future fix: should approve the amount based on holder's balance
        // Approve mandate to spend 3x the amount for three terms
        approve(cpi_ctx, self.mandate.amount.mul(3))
    }

    pub fn update_subscription_counts(&mut self) -> Result<()> {
        self.payer_user.outgoing_subscriptions_count += 1;
        self.payee_user.incoming_subscriptions_count += 1;
        Ok(())
    }

    pub fn process(
        &mut self,
        amount: u64,
        frequency: i64,
        name: String,
        description: String,
        bumps: &CreateMandateBumps
    ) -> Result<()> {
        self.init_mandate(amount, frequency, name, description, bumps)?;
        self.approve_delegate_authority()?;
        self.update_subscription_counts()?;
        Ok(())
    }
}
