use anchor_lang::prelude::*;
use crate::state::User;

#[derive(Accounts)]
pub struct RegisterUser<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + User::INIT_SPACE,
        seeds = [b"user", authority.key().as_ref()],
        bump
    )]
    pub user: Account<'info, User>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> RegisterUser<'info> {
    pub fn process(&mut self, name: String, bumps: &RegisterUserBumps) -> Result<()> {
        self.user.set_inner(User {
            name,
            incoming_subscriptions_count: 0,
            outgoing_subscriptions_count: 0,
            bump: bumps.user,
            authority: self.authority.key(),
        });
        Ok(())
    }
}
