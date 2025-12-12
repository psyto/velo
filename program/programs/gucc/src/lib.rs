use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("CqpC97ghGKUrTKQEmQ9JHrre6RrgBehytwb1MwPHwMLW");

#[program]
pub mod gucc {
    use super::*;


    pub fn initialize_event(
        ctx: Context<InitializeEvent>,
        event_id: String,
        description: String,
        settlement_time: i64,
        oracle: Pubkey,
    ) -> Result<()> {
        let event = &mut ctx.accounts.congestion_event;
        event.authority = ctx.accounts.authority.key();
        event.event_id = event_id;
        event.description = description;
        event.settlement_time = settlement_time;
        event.oracle = oracle;
        event.resolved = false;
        event.outcome = false;

        event.usdc_mint = ctx.accounts.usdc_mint.key();
        event.vault = ctx.accounts.vault.key();
        event.bump = ctx.bumps.congestion_event;
        msg!("Event Initialized: {}", event.event_id);
        Ok(())
    }

    pub fn mint_tokens(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
        let position = &mut ctx.accounts.user_position;
        if position.owner == Pubkey::default() {
            position.owner = ctx.accounts.user.key();
            position.event = ctx.accounts.congestion_event.key();
        }

        // Transfer USDC from user to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;


        // Mint internal tokens (accounting)
        position.yes_amount = position.yes_amount.checked_add(amount).unwrap();
        position.no_amount = position.no_amount.checked_add(amount).unwrap();

        Ok(())
    }

    pub fn resolve_event(ctx: Context<ResolveEvent>, outcome: bool) -> Result<()> {
        let event = &mut ctx.accounts.congestion_event;
        require!(!event.resolved, GuccError::AlreadyResolved);
        event.resolved = true;
        event.outcome = outcome;
        msg!("Event Resolved: {}", outcome);
        Ok(())
    }

    pub fn redeem(ctx: Context<Redeem>) -> Result<()> {
        let event = &ctx.accounts.congestion_event;
        let position = &mut ctx.accounts.user_position;
        require!(event.resolved, GuccError::NotResolved);

        let payout = if event.outcome {
             position.yes_amount
        } else {
             position.no_amount
        };

        if payout > 0 {
             let event_id_bytes = event.event_id.as_bytes();
             let seeds = &[
                b"event",
                event_id_bytes,
                &[event.bump]
             ];
             let signer = &[&seeds[..]];

             let cpi_accounts = Transfer {
                 from: ctx.accounts.vault.to_account_info(),
                 to: ctx.accounts.user_token_account.to_account_info(),
                 authority: ctx.accounts.congestion_event.to_account_info(),
             };
             let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                signer
             );
             token::transfer(cpi_ctx, payout)?;
        }
        
        position.yes_amount = 0;
        position.no_amount = 0;
        Ok(())
    }
}

#[error_code]
pub enum GuccError {
    #[msg("Event is already resolved")]
    AlreadyResolved,
    #[msg("Event is not resolved yet")]
    NotResolved,
}

#[derive(Accounts)]
#[instruction(event_id: String)]
pub struct InitializeEvent<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + (4 + 32) + (4 + 256) + 8 + 32 + 1 + 1 + 32 + 32 + 1 + 50,
        seeds = [b"event", event_id.as_bytes()],
        bump
    )]
    pub congestion_event: Account<'info, CongestionEvent>,
    
    pub usdc_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        token::mint = usdc_mint,
        token::authority = congestion_event,
        seeds = [b"vault", congestion_event.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(mut)]
    pub congestion_event: Account<'info, CongestionEvent>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 32 + 8 + 8 + 16,
        seeds = [b"position", congestion_event.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub user_position: Account<'info, UserPosition>,

    #[account(mut)] // User's USDC account
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        address = congestion_event.vault
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ResolveEvent<'info> {
    #[account(
        mut,
        has_one = oracle
    )]
    pub congestion_event: Account<'info, CongestionEvent>,
    pub oracle: Signer<'info>,
}

#[derive(Accounts)]
pub struct Redeem<'info> {
    #[account(mut)]
    pub congestion_event: Account<'info, CongestionEvent>,
    
    #[account(
        mut,
        seeds = [b"position", congestion_event.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub user_position: Account<'info, UserPosition>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        address = congestion_event.vault
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct UserPosition {
    pub owner: Pubkey,
    pub event: Pubkey,
    pub yes_amount: u64,
    pub no_amount: u64,
}

#[account]
pub struct CongestionEvent {
    pub authority: Pubkey,
    pub event_id: String,     // Max 32 bytes
    pub description: String,  // Max 256 bytes
    pub settlement_time: i64,
    pub oracle: Pubkey,
    pub resolved: bool,
    pub outcome: bool,
    pub usdc_mint: Pubkey, // Added
    pub vault: Pubkey,     // Added
    pub bump: u8,          // Added
}
