use anyhow::{ Context, Result };
use log::{ info, error, debug }; // Removed unused 'warn' import
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_client::rpc_config::{ RpcAccountInfoConfig, RpcProgramAccountsConfig };
use solana_client::rpc_filter::{ RpcFilterType, Memcmp, MemcmpEncodedBytes };
use solana_sdk::{
    commitment_config::CommitmentConfig,
    pubkey::Pubkey,
    instruction::{ AccountMeta, Instruction },
    transaction::Transaction,
    signer::Signer,
    signature::Keypair,
    signature::read_keypair_file,
};
use solana_account_decoder::UiAccountEncoding;
use std::str::FromStr; // Added FromStr trait
use std::time::{ Duration, SystemTime, UNIX_EPOCH }; // Added time imports
use std::env;
use tokio::time;
use borsh::BorshDeserialize;

// Constants
const RPC_URL: &str = "http://localhost:8899";
const CHECK_INTERVAL: u64 = 60; // Check every minute

// Replace with your actual program ID
const PROGRAM_ID: &str = "BXXJENjyLn4ZGYfkDpSxZ6Vt7TcxW7BQJgWaGiQGbfed"; // Replace with your actual program ID

// Update this struct to match the exact layout from programs/dmandate/src/state/mandate.rs
#[derive(BorshDeserialize, Debug)]
pub struct Mandate {
    // Anchor discriminator (8 bytes)
    pub discriminator: [u8; 8],
    // Match the actual mandate structure
    pub payer: Pubkey,
    pub payee: Pubkey,
    pub amount: u64,
    pub token: Pubkey,
    pub frequency: i64,
    pub active: bool,
    pub next_payout: i64, // This was incorrectly named 'last_payment_ts'
    pub bump: u8, // This field was missing
    pub name: String,
    pub description: String,
    pub payment_count: u32,
}

pub async fn run_payment_processor() -> Result<()> {
    // Initialize logger
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));

    info!("Starting dMandate payment processor");

    // Connect to Solana
    let rpc = RpcClient::new(RPC_URL.to_string());

    // Load payer keypair (this will be your service account)
    let keypair_path = env
        ::var("KEYPAIR_PATH")
        .context("Missing KEYPAIR_PATH environment variable")?;

    // Fixed error handling for read_keypair_file
    let payer = read_keypair_file(&keypair_path).map_err(|e|
        anyhow::anyhow!("Failed to read keypair from {}: {}", keypair_path, e)
    )?;

    info!("Payment processor initialized with keypair: {}", payer.pubkey());

    // Main processing loop
    loop {
        match process_due_mandates(&rpc, &payer).await {
            Ok(processed_count) => {
                info!("Successfully processed {} due mandates", processed_count);
            }
            Err(e) => {
                error!("Error processing mandates: {}", e);
            }
        }

        // Wait for next check interval
        time::sleep(Duration::from_secs(CHECK_INTERVAL)).await;
    }
}

async fn process_due_mandates(rpc: &RpcClient, payer: &Keypair) -> Result<usize> {
    info!("Checking for due mandate payments...");

    // Get program ID from constant
    let program_id = Pubkey::from_str(PROGRAM_ID)?;

    // Configure account filters (active mandates only) - Fixed deprecated Memcmp usage
    let memcmp = Memcmp::new_base58_encoded(40, &[1]); // Using constructor method instead

    let config = RpcProgramAccountsConfig {
        filters: Some(vec![RpcFilterType::Memcmp(memcmp)]),
        account_config: RpcAccountInfoConfig {
            encoding: Some(UiAccountEncoding::Base64),
            data_slice: None,
            commitment: Some(CommitmentConfig::confirmed()),
            min_context_slot: None,
        },
        with_context: None,
    };

    // Fetch all mandate accounts
    let accounts = rpc.get_program_accounts_with_config(&program_id, config).await?;
    info!("Found {} total mandate accounts", accounts.len());

    let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs() as i64;

    let mut processed_count = 0;

    // Process each mandate
    for (pubkey, account) in accounts {
        // Deserialize account data
        match Mandate::try_from_slice(&account.data) {
            Ok(mandate) => {
                // Check if payment is due (current time > next_payout)
                if mandate.active && now >= mandate.next_payout {
                    info!(
                        "Payment due for mandate {} ({}): next payout: {}, frequency: {}",
                        pubkey,
                        mandate.name,
                        mandate.next_payout,
                        mandate.frequency
                    );

                    // Process payment
                    match execute_payment(rpc, payer, &pubkey, &mandate).await {
                        Ok(_) => {
                            info!("Successfully executed payment for mandate: {}", pubkey);
                            processed_count += 1;
                        }
                        Err(e) => {
                            error!("Failed to execute payment for mandate {}: {}", pubkey, e);
                        }
                    }
                } else {
                    debug!(
                        "Mandate {} not due yet. Next payout: {}, frequency: {}, now: {}",
                        pubkey,
                        mandate.next_payout,
                        mandate.frequency,
                        now
                    );
                }
            }
            Err(e) => {
                error!("Failed to deserialize mandate account {}: {}", pubkey, e);
            }
        }
    }

    Ok(processed_count)
}

async fn execute_payment(
    rpc: &RpcClient,
    payer: &Keypair,
    mandate_pubkey: &Pubkey,
    mandate: &Mandate
) -> Result<()> {
    // Get program ID
    let program_id = Pubkey::from_str(PROGRAM_ID)?;

    // Find the payment history PDA for this mandate and payment count
    let payment_count_bytes = mandate.payment_count.to_le_bytes();
    let seeds = &[b"payment_history", mandate_pubkey.as_ref(), &payment_count_bytes];

    let (payment_history_pda, _) = Pubkey::find_program_address(seeds, &program_id);

    // Construct the execute payment instruction
    let accounts = vec![
        AccountMeta::new_readonly(payer.pubkey(), true), // signer
        AccountMeta::new_readonly(mandate.payer, false), // payer
        AccountMeta::new(find_associated_token_account(&mandate.payer, &mandate.token), false), // payerAta
        AccountMeta::new_readonly(mandate.payee, false), // payee
        AccountMeta::new(*mandate_pubkey, false), // mandate
        AccountMeta::new(payment_history_pda, false), // paymentHistory
        AccountMeta::new_readonly(mandate.token, false), // token
        AccountMeta::new(find_associated_token_account(&mandate.payee, &mandate.token), false), // payeeAta
        AccountMeta::new_readonly(spl_associated_token_account::id(), false), // associatedTokenProgram
        AccountMeta::new_readonly(spl_token::id(), false), // tokenProgram
        AccountMeta::new_readonly(solana_sdk::system_program::id(), false) // systemProgram
    ];

    // Create instruction
    let instruction = Instruction {
        program_id,
        accounts,
        data: vec![0], // Assuming 0 is the discriminator for executePayment
    };

    // Create and send transaction
    let blockhash = rpc.get_latest_blockhash().await?;
    let transaction = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&payer.pubkey()),
        &[payer],
        blockhash
    );

    // Send and confirm transaction
    let signature = rpc.send_and_confirm_transaction(&transaction).await?;
    info!("Payment executed with signature: {}", signature);

    Ok(())
}

// Helper function to find associated token address
fn find_associated_token_account(wallet: &Pubkey, token: &Pubkey) -> Pubkey {
    spl_associated_token_account::get_associated_token_address(wallet, token)
}
