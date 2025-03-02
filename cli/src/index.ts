import { program } from "commander";
import * as anchor from "@coral-xyz/anchor";
import { Dmandate } from "./types/dmandate";
import IDL from "../idl/dmandate.json";
import {
  PublicKey,
  Connection,
  Keypair,
  SystemProgram,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import fs from "fs";
import os from "os";
import path from "path";
import BN from "bn.js";
import { ConfigManager } from "./config";

// Initialize config manager
const configManager = new ConfigManager();

program
  .version("1.0.0")
  .description("Command-line interface for dmandate program");

program
  .command("config")
  .description("Display current configuration")
  .action(async () => {
    const config = configManager.getConfig();
    console.log("Current Configuration:");
    console.log(JSON.stringify(config, null, 2));
  });

program
  .command("set-network")
  .description("Set the Solana network to use")
  .argument("<network>", "Network name (mainnet, testnet, devnet, localnet)")
  .action(async (network: string) => {
    // Validate network name
    const validNetworks = ["mainnet", "testnet", "devnet", "localnet"];
    if (!validNetworks.includes(network)) {
      console.error(
        `Invalid network. Choose from: ${validNetworks.join(", ")}`
      );
      return;
    }

    // Save network to config
    configManager.updateConfig({ network });
    console.log(`Network set to ${network}`);
  });

program
  .command("set-keypair")
  .description("Set the keypair file path")
  .argument("<path>", "Path to keypair file")
  .action(async (keypairPath: string) => {
    try {
      // Validate that keypair file exists and can be loaded
      const expanded = keypairPath.startsWith("~")
        ? path.join(os.homedir(), keypairPath.slice(1))
        : keypairPath;

      if (!fs.existsSync(expanded)) {
        console.error(`Keypair file not found at: ${expanded}`);
        return;
      }

      try {
        const secretKey = Uint8Array.from(
          JSON.parse(fs.readFileSync(expanded, "utf-8"))
        );
        Keypair.fromSecretKey(secretKey);
      } catch (err) {
        console.error("Invalid keypair file format");
        return;
      }

      // Save keypair path to config
      configManager.updateConfig({ keypairPath });
      console.log(`Keypair set to ${keypairPath}`);
    } catch (error) {
      console.error("Failed to set keypair:", error);
    }
  });

/**
 * Initialize the Anchor provider and program based on current config
 * @returns Object containing connection, wallet, provider, and program
 */
async function initializeProgramFromConfig() {
  const config = configManager.getConfig();

  if (!config.keypairPath) {
    throw new Error("Keypair not set. Use 'set-keypair' command first.");
  }

  // Set up connection based on network setting
  let endpoint: string;
  switch (config.network) {
    case "mainnet":
      endpoint = clusterApiUrl("mainnet-beta");
      break;
    case "testnet":
      endpoint = clusterApiUrl("testnet");
      break;
    case "devnet":
      endpoint = clusterApiUrl("devnet");
      break;
    case "localnet":
    default:
      endpoint = "http://localhost:8899";
  }

  const connection = new Connection(endpoint, "confirmed");

  // Load wallet from keypair file
  const expanded = config.keypairPath.startsWith("~")
    ? path.join(os.homedir(), config.keypairPath.slice(1))
    : config.keypairPath;

  const secretKey = Uint8Array.from(
    JSON.parse(fs.readFileSync(expanded, "utf-8"))
  );
  const keypair = Keypair.fromSecretKey(secretKey);
  const wallet = new anchor.Wallet(keypair);

  // Create provider and initialize program
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);
  const program = new anchor.Program<Dmandate>(IDL as Dmandate, provider);

  return { connection, wallet, provider, program };
}

program
  .command("register-user")
  .description("Register a new user in the dmandate program")
  .argument("<name>", "User name")
  .option(
    "-s, --save",
    "Save this user as the default user for future operations"
  )
  .action(async (name: string, options: { save?: boolean }) => {
    try {
      const { wallet, program } = await initializeProgramFromConfig();

      console.log(`Registering user "${name}"...`);

      // Find user PDA
      const [userPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), wallet.publicKey.toBuffer()],
        program.programId
      );

      const tx = await program.methods
        .registerUser(name)
        .accountsPartial({
          user: userPda,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log(`User registered successfully! Transaction: ${tx}`);
      console.log(`User PDA: ${userPda.toString()}`);

      // If --save flag is set, save user details to config
      if (options.save) {
        configManager.updateConfig({
          currentUser: {
            name,
            publicKey: wallet.publicKey.toString(),
            userPda: userPda.toString(),
          },
        });
        console.log(`User "${name}" saved as default user`);
      }
    } catch (error: any) {
      if (error.message?.includes("Error Code: AccountCollision")) {
        console.error(
          "User already registered. Use a different wallet or name."
        );
      } else {
        console.error("Failed to register user:", error);
      }
    }
  });

program
  .command("create-mandate")
  .description("Create a new payment mandate")
  .argument("<payee>", "Payee public key")
  .argument("<token>", "Token mint address")
  .argument("<amount>", "Payment amount")
  .argument("<frequency>", "Payment frequency in seconds")
  .argument("<name>", "Mandate name")
  .argument("<description>", "Mandate description")
  .action(
    async (
      payeeAddress: string,
      tokenAddress: string,
      amount: string,
      frequency: string,
      name: string,
      description: string
    ) => {
      try {
        const { wallet, program } = await initializeProgramFromConfig();
        console.log(`Creating mandate to ${payeeAddress}...`);

        const payee = new PublicKey(payeeAddress);
        const token = new PublicKey(tokenAddress);

        // Find mandate PDA
        const [mandatePda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("dmandate"),
            wallet.publicKey.toBuffer(),
            payee.toBuffer(),
          ],
          program.programId
        );

        // Find user PDAs
        const [payerUserPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("user"), wallet.publicKey.toBuffer()],
          program.programId
        );

        const [payeeUserPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("user"), payee.toBuffer()],
          program.programId
        );

        // Get associated token accounts
        const payerAta = await getAssociatedTokenAddress(
          token,
          wallet.publicKey
        );

        const tx = await program.methods
          .createMandate(new BN(amount), new BN(frequency), name, description)
          .accountsPartial({
            payer: wallet.publicKey,
            payee: payee,
            token: token,
            payerAta: payerAta,
            mandate: mandatePda,
            payerUser: payerUserPda,
            payeeUser: payeeUserPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log(`Mandate created successfully! Transaction: ${tx}`);
        console.log(`Mandate PDA: ${mandatePda.toString()}`);

        // Save mandate info in config for easier reference
        const mandates = configManager.getConfig().mandates || [];
        mandates.push({
          pda: mandatePda.toString(),
          payee: payeeAddress,
          token: tokenAddress,
          amount,
          name,
        });
        configManager.updateConfig({ mandates });
      } catch (error) {
        console.error("Failed to create mandate:", error);
      }
    }
  );

program
  .command("execute-payment")
  .description("Execute a payment for a mandate")
  .argument("<mandate>", "Mandate PDA address")
  .action(async (mandateAddress: string) => {
    try {
      const { wallet, connection, program } =
        await initializeProgramFromConfig();

      const mandate = new PublicKey(mandateAddress);

      // Fetch mandate account to get necessary info
      const mandateAccount = await program.account.mandate.fetch(mandate);

      const payer = mandateAccount.payer;
      const payee = mandateAccount.payee;
      const token = mandateAccount.token;
      const paymentCount = mandateAccount.paymentCount;

      // Get token accounts
      const payerAta = await getAssociatedTokenAddress(token, payer);
      const payeeAta = await getAssociatedTokenAddress(token, payee);

      // Calculate payment history PDA
      const [paymentHistoryPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_history"),
          mandate.toBuffer(),
          new BN(paymentCount).toBuffer("le", 4),
        ],
        program.programId
      );

      console.log(
        `Executing payment #${paymentCount} for mandate ${mandateAddress}...`
      );

      const tx = await program.methods
        .executePayment()
        .accountsPartial({
          signer: wallet.publicKey,
          payer: payer,
          payerAta: payerAta,
          payee: payee,
          mandate: mandate,
          paymentHistory: paymentHistoryPda,
          token: token,
          payeeAta: payeeAta,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log(`Payment executed successfully! Transaction: ${tx}`);
      console.log(`Payment amount: ${mandateAccount.amount.toString()}`);
      console.log(`Payment history PDA: ${paymentHistoryPda.toString()}`);
    } catch (error: any) {
      if (error.message?.includes("Error Code: InvalidPaymentTime")) {
        console.error(
          "Cannot execute payment yet - frequency period has not elapsed"
        );
      } else {
        console.error("Failed to execute payment:", error);
      }
    }
  });

program
  .command("reapprove-mandate")
  .description("Reapprove a mandate with a new delegation amount")
  .argument("<mandate>", "Mandate PDA address")
  .argument("<new-amount>", "New delegation amount")
  .action(async (mandateAddress: string, newAmount: string) => {
    try {
      const { wallet, program } = await initializeProgramFromConfig();

      const mandate = new PublicKey(mandateAddress);

      // Fetch mandate account to get necessary info
      const mandateAccount = await program.account.mandate.fetch(mandate);
      const token = mandateAccount.token;

      // Get token account
      const payerAta = await getAssociatedTokenAddress(token, wallet.publicKey);

      console.log(
        `Reapproving mandate ${mandateAddress} with new amount ${newAmount}...`
      );

      const tx = await program.methods
        .reapproveMandate(new BN(newAmount))
        .accountsPartial({
          payer: wallet.publicKey,
          token: token,
          payerAta: payerAta,
          mandate: mandate,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      console.log(`Mandate reapproved successfully! Transaction: ${tx}`);

      // Update mandate info in config
      const mandates = configManager.getConfig().mandates || [];
      const updatedMandates = mandates.map((m) => {
        if (m.pda === mandateAddress) {
          return { ...m, amount: newAmount };
        }
        return m;
      });
      configManager.updateConfig({ mandates: updatedMandates });
    } catch (error) {
      console.error("Failed to reapprove mandate:", error);
    }
  });

program
  .command("cancel-mandate")
  .description("Cancel an active mandate")
  .argument("<mandate>", "Mandate PDA address")
  .action(async (mandateAddress: string) => {
    try {
      const { wallet, program } = await initializeProgramFromConfig();

      const mandate = new PublicKey(mandateAddress);

      // Fetch mandate account to get necessary info
      const mandateAccount = await program.account.mandate.fetch(mandate);
      const token = mandateAccount.token;
      const payee = mandateAccount.payee;

      // Calculate user PDAs
      const [payerUserPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), wallet.publicKey.toBuffer()],
        program.programId
      );

      const [payeeUserPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), payee.toBuffer()],
        program.programId
      );

      // Get token account
      const payerAta = await getAssociatedTokenAddress(token, wallet.publicKey);

      console.log(`Cancelling mandate ${mandateAddress}...`);

      const tx = await program.methods
        .cancelMandate()
        .accountsPartial({
          payer: wallet.publicKey,
          token: token,
          payerAta: payerAta,
          mandate: mandate,
          payerUser: payerUserPda,
          payeeUser: payeeUserPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log(`Mandate cancelled successfully! Transaction: ${tx}`);

      // Remove mandate from config
      const mandates = configManager.getConfig().mandates || [];
      const updatedMandates = mandates.filter((m) => m.pda !== mandateAddress);
      configManager.updateConfig({ mandates: updatedMandates });
    } catch (error) {
      console.error("Failed to cancel mandate:", error);
    }
  });

program
  .command("close-payment-history")
  .description("Close a payment history record to reclaim rent")
  .argument("<mandate>", "Mandate PDA address")
  .argument("<payment-number>", "Payment number")
  .action(async (mandateAddress: string, paymentNumber: string) => {
    try {
      const { wallet, program } = await initializeProgramFromConfig();

      const mandate = new PublicKey(mandateAddress);

      // Calculate payment history PDA
      const [paymentHistoryPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_history"),
          mandate.toBuffer(),
          new BN(parseInt(paymentNumber)).toBuffer("le", 4),
        ],
        program.programId
      );

      console.log(
        `Closing payment history for mandate ${mandateAddress}, payment #${paymentNumber}...`
      );

      const tx = await program.methods
        .closePaymentHistory()
        .accountsPartial({
          authority: wallet.publicKey,
          mandate: mandate,
          paymentHistory: paymentHistoryPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log(`Payment history closed successfully! Transaction: ${tx}`);
    } catch (error) {
      console.error("Failed to close payment history:", error);
    }
  });

program
  .command("get-user-subscriptions")
  .description("Get all subscriptions for the current user")
  .action(async () => {
    try {
      const { wallet, program } = await initializeProgramFromConfig();

      // Find user PDA
      const [userPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), wallet.publicKey.toBuffer()],
        program.programId
      );

      console.log(
        `Getting subscriptions for ${wallet.publicKey.toString()}...`
      );

      // This is a view instruction, fetch the user data directly
      try {
        const userAccount = await program.account.user.fetch(userPda);
        console.log("User Information:");
        console.log(`Name: ${userAccount.name}`);
        console.log(
          `Outgoing subscriptions: ${userAccount.outgoingSubscriptionsCount}`
        );
        console.log(
          `Incoming subscriptions: ${userAccount.incomingSubscriptionsCount}`
        );

        // Also fetch all mandates where this user is payer
        const mandates = await program.account.mandate.all([
          {
            memcmp: {
              offset: 8, // after discriminator
              bytes: wallet.publicKey.toBase58(),
            },
          },
        ]);

        if (mandates.length > 0) {
          console.log("\nOutgoing Mandates:");
          mandates.forEach((m, i) => {
            console.log(`\nMandate #${i + 1}:`);
            console.log(`  PDA: ${m.publicKey.toString()}`);
            console.log(`  Payee: ${m.account.payee.toString()}`);
            console.log(`  Token: ${m.account.token.toString()}`);
            console.log(`  Amount: ${m.account.amount.toString()}`);
            console.log(`  Name: ${m.account.name}`);
            console.log(`  Description: ${m.account.description}`);
            console.log(`  Active: ${m.account.active}`);
            console.log(`  Payment Count: ${m.account.paymentCount}`);
          });
        } else {
          console.log("\nNo outgoing mandates found");
        }

        // Fetch incoming mandates (where user is payee)
        const incomingMandates = await program.account.mandate.all([
          {
            memcmp: {
              offset: 8 + 32, // after discriminator + payer pubkey
              bytes: wallet.publicKey.toBase58(),
            },
          },
        ]);

        if (incomingMandates.length > 0) {
          console.log("\nIncoming Mandates:");
          incomingMandates.forEach((m, i) => {
            console.log(`\nMandate #${i + 1}:`);
            console.log(`  PDA: ${m.publicKey.toString()}`);
            console.log(`  Payer: ${m.account.payer.toString()}`);
            console.log(`  Token: ${m.account.token.toString()}`);
            console.log(`  Amount: ${m.account.amount.toString()}`);
            console.log(`  Name: ${m.account.name}`);
            console.log(`  Description: ${m.account.description}`);
            console.log(`  Active: ${m.account.active}`);
            console.log(`  Payment Count: ${m.account.paymentCount}`);
          });
        } else {
          console.log("\nNo incoming mandates found");
        }
      } catch (error) {
        console.error(
          "User not found. Register a user first using register-user command."
        );
      }
    } catch (error) {
      console.error("Failed to get user subscriptions:", error);
    }
  });

program
  .command("get-mandate")
  .description("Get details of a specific mandate")
  .argument("<mandate>", "Mandate PDA address")
  .action(async (mandateAddress: string) => {
    try {
      const { program } = await initializeProgramFromConfig();

      const mandate = new PublicKey(mandateAddress);

      console.log(`Fetching mandate ${mandateAddress}...`);

      // Fetch mandate account
      try {
        const mandateAccount = await program.account.mandate.fetch(mandate);

        console.log("\nMandate Details:");
        console.log(`Payer: ${mandateAccount.payer.toString()}`);
        console.log(`Payee: ${mandateAccount.payee.toString()}`);
        console.log(`Token: ${mandateAccount.token.toString()}`);
        console.log(`Amount: ${mandateAccount.amount.toString()}`);
        console.log(
          `Frequency: ${mandateAccount.frequency.toString()} seconds`
        );
        console.log(`Name: ${mandateAccount.name}`);
        console.log(`Description: ${mandateAccount.description}`);
        console.log(
          `Last Payment Timestamp: ${mandateAccount.nextPayout.toString()}`
        );
        console.log(`Payment Count: ${mandateAccount.paymentCount}`);
        console.log(`Active: ${mandateAccount.active}`);

        // Calculate next payment time
        if (mandateAccount.nextPayout.toNumber() > 0) {
          const nextPaymentTime = new Date(
            (mandateAccount.nextPayout.toNumber() +
              mandateAccount.frequency.toNumber()) *
              1000
          );
          console.log(`Next Payment Due: ${nextPaymentTime.toLocaleString()}`);
        }

        // Fetch payment histories
        const paymentHistories = [];
        for (let i = 0; i < mandateAccount.paymentCount; i++) {
          const [paymentHistoryPda] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("payment_history"),
              mandate.toBuffer(),
              new BN(i).toBuffer("le", 4),
            ],
            program.programId
          );

          try {
            const paymentHistory = await program.account.paymentHistory.fetch(
              paymentHistoryPda
            );
            paymentHistories.push({
              pda: paymentHistoryPda.toString(),
              paymentNumber: i,
              amount: paymentHistory.amount.toString(),
              timestamp: new Date(
                paymentHistory.timestamp.toNumber() * 1000
              ).toLocaleString(),
            });
          } catch (e) {
            // Payment history may have been closed, skip
          }
        }

        if (paymentHistories.length > 0) {
          console.log("\nPayment History:");
          paymentHistories.forEach((ph, i) => {
            console.log(`\nPayment #${ph.paymentNumber}:`);
            console.log(`  PDA: ${ph.pda}`);
            console.log(`  Amount: ${ph.amount}`);
            console.log(`  Timestamp: ${ph.timestamp}`);
          });
        } else {
          console.log("\nNo payment history found");
        }
      } catch (error) {
        console.error("Mandate not found or has been cancelled.");
      }
    } catch (error) {
      console.error("Failed to get mandate:", error);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// If no arguments, show help
if (process.argv.length < 3) {
  program.help();
}
