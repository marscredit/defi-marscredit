use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, MintTo, Burn};

declare_id!("MarsB1dg3K8GzRTaY3PdJwEYy2HjnxCEwUXXUyZvvQUz");

#[program]
pub mod mars_bridge {
    use super::*;

    /// Initialize the Mars Bridge program
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let bridge_state = &mut ctx.accounts.bridge_state;
        bridge_state.authority = ctx.accounts.authority.key();
        bridge_state.mars_mint = ctx.accounts.mars_mint.key();
        bridge_state.total_minted = 0;
        bridge_state.total_burned = 0;
        bridge_state.paused = false;
        bridge_state.bump = *ctx.bumps.get("bridge_state").unwrap();
        
        msg!("Mars Bridge initialized successfully");
        Ok(())
    }

    /// Mint MARS tokens when bridging from L1
    pub fn mint_mars(
        ctx: Context<MintMars>,
        amount: u64,
        l1_tx_id: [u8; 32],
    ) -> Result<()> {
        let bridge_state = &mut ctx.accounts.bridge_state;
        
        // Check if bridge is paused
        require!(!bridge_state.paused, BridgeError::BridgePaused);
        
        // Check if L1 transaction already processed
        require!(
            !bridge_state.processed_l1_txs.contains(&l1_tx_id),
            BridgeError::TransactionAlreadyProcessed
        );
        
        // Add transaction to processed list
        bridge_state.processed_l1_txs.push(l1_tx_id);
        
        // Mint MARS tokens to user
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mars_mint.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.bridge_state.to_account_info(),
        };
        
        let authority_key = bridge_state.authority;
        let seeds = &[
            b"bridge_state",
            authority_key.as_ref(),
            &[bridge_state.bump],
        ];
        let signer_seeds = &[&seeds[..]];
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        
        token::mint_to(cpi_ctx, amount)?;
        
        // Update stats
        bridge_state.total_minted += amount;
        
        emit!(MarsMinted {
            recipient: ctx.accounts.user_token_account.owner,
            amount,
            l1_tx_id,
        });
        
        Ok(())
    }

    /// Burn MARS tokens when bridging to L1
    pub fn burn_mars(
        ctx: Context<BurnMars>,
        amount: u64,
        l1_recipient: String,
    ) -> Result<()> {
        let bridge_state = &mut ctx.accounts.bridge_state;
        
        // Check if bridge is paused
        require!(!bridge_state.paused, BridgeError::BridgePaused);
        
        // Burn MARS tokens from user
        let cpi_accounts = Burn {
            mint: ctx.accounts.mars_mint.to_account_info(),
            from: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::burn(cpi_ctx, amount)?;
        
        // Update stats
        bridge_state.total_burned += amount;
        
        emit!(MarsBurned {
            user: ctx.accounts.user.key(),
            amount,
            l1_recipient,
        });
        
        Ok(())
    }

    /// Pause bridge operations (authority only)
    pub fn pause_bridge(ctx: Context<PauseBridge>) -> Result<()> {
        let bridge_state = &mut ctx.accounts.bridge_state;
        bridge_state.paused = true;
        
        emit!(BridgePaused {});
        Ok(())
    }

    /// Unpause bridge operations (authority only)
    pub fn unpause_bridge(ctx: Context<UnpauseBridge>) -> Result<()> {
        let bridge_state = &mut ctx.accounts.bridge_state;
        bridge_state.paused = false;
        
        emit!(BridgeUnpaused {});
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + BridgeState::LEN,
        seeds = [b"bridge_state", authority.key().as_ref()],
        bump
    )]
    pub bridge_state: Account<'info, BridgeState>,
    
    pub mars_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintMars<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"bridge_state", authority.key().as_ref()],
        bump = bridge_state.bump,
        has_one = authority,
        has_one = mars_mint
    )]
    pub bridge_state: Account<'info, BridgeState>,
    
    #[account(mut)]
    pub mars_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BurnMars<'info> {
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"bridge_state", bridge_state.authority.as_ref()],
        bump = bridge_state.bump,
        has_one = mars_mint
    )]
    pub bridge_state: Account<'info, BridgeState>,
    
    #[account(mut)]
    pub mars_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        has_one = user,
        constraint = user_token_account.mint == mars_mint.key()
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct PauseBridge<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"bridge_state", authority.key().as_ref()],
        bump = bridge_state.bump,
        has_one = authority
    )]
    pub bridge_state: Account<'info, BridgeState>,
}

#[derive(Accounts)]
pub struct UnpauseBridge<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"bridge_state", authority.key().as_ref()],
        bump = bridge_state.bump,
        has_one = authority
    )]
    pub bridge_state: Account<'info, BridgeState>,
}

#[account]
pub struct BridgeState {
    pub authority: Pubkey,
    pub mars_mint: Pubkey,
    pub total_minted: u64,
    pub total_burned: u64,
    pub paused: bool,
    pub bump: u8,
    pub processed_l1_txs: Vec<[u8; 32]>,
}

impl BridgeState {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 1 + 1 + 4 + (32 * 1000); // Support up to 1000 processed txs
}

#[event]
pub struct MarsMinted {
    pub recipient: Pubkey,
    pub amount: u64,
    pub l1_tx_id: [u8; 32],
}

#[event]
pub struct MarsBurned {
    pub user: Pubkey,
    pub amount: u64,
    pub l1_recipient: String,
}

#[event]
pub struct BridgePaused {}

#[event]
pub struct BridgeUnpaused {}

#[error_code]
pub enum BridgeError {
    #[msg("Bridge is currently paused")]
    BridgePaused,
    #[msg("Transaction already processed")]
    TransactionAlreadyProcessed,
} 