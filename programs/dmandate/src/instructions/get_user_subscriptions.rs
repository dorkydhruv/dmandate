use anchor_lang::prelude::*;
use crate::state::User;

#[derive(Accounts)]
pub struct GetUserSubscriptions<'info> {
    #[account(seeds = [b"user", authority.key().as_ref()], bump = user.bump, has_one = authority)]
    pub user: Account<'info, User>,
    pub authority: Signer<'info>,
}

impl<'info> GetUserSubscriptions<'info> {
    pub fn process(&mut self) -> Result<()> {
        // This is just a view function, we're not modifying any state
        // Can be used by frontend to query subscription counts
        Ok(())
    }
}
