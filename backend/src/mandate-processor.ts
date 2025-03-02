import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import { Dmandate } from "./types/dmandate";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import * as fs from "fs";
import IDL from "../idl/dmandate.json";
import { MandateProcessorConfig } from "./config";
import logger from "./utils/logger";

export class MandateProcessor {
  private provider: AnchorProvider | null = null;
  private program: Program<Dmandate> | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private config: MandateProcessorConfig;

  constructor(config: MandateProcessorConfig) {
    this.config = config;
  }

  // Initialize Anchor and setup provider and program
  private initializeAnchor(): {
    provider: AnchorProvider;
    program: Program<Dmandate>;
  } {
    // Load the keypair for transaction signing
    const keyPairBuffer = JSON.parse(
      fs.readFileSync(this.config.keypairPath, "utf-8")
    );
    const keypair = web3.Keypair.fromSecretKey(Buffer.from(keyPairBuffer));

    // Set up the connection
    const connection = new web3.Connection(this.config.rpcUrl, "confirmed");

    // Create provider with wallet
    const wallet = new anchor.Wallet(keypair);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });

    const program = new Program<Dmandate>(IDL as Dmandate, provider);

    return { provider, program };
  }

  // Fetch all active mandates from the blockchain
  private async fetchMandates(program: Program<Dmandate>): Promise<any[]> {
    try {
      logger.info("Fetching mandates...");

      // Get all mandate accounts
      const mandates = await program.account.mandate.all();
      logger.info(`Found ${mandates.length} mandates in total`);

      // Filter only active mandates
      const activeMandates = mandates.filter(
        (mandate) => mandate.account.active === true
      );
      logger.info(`${activeMandates.length} mandates are active`);

      return activeMandates;
    } catch (error) {
      logger.error("Error fetching mandates:", error);
      return [];
    }
  }

  // Check if a mandate is ready for payment execution
  private isMandatePayable(mandate: any): boolean {
    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
    const nextPayoutTime = mandate.account.nextPayout.toNumber();

    // A mandate is payable if the next payout time is in the past or within buffer time
    return (
      mandate.account.active &&
      currentTime + this.config.bufferTime >= nextPayoutTime
    );
  }

  // Get the payment history PDA for a mandate and payment number
  private async getPaymentHistoryPDA(
    program: Program<Dmandate>,
    mandatePDA: web3.PublicKey,
    paymentCount: number
  ): Promise<[web3.PublicKey, number]> {
    return web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("payment_history"),
        mandatePDA.toBuffer(),
        new anchor.BN(paymentCount).toBuffer("le", 4),
      ],
      program.programId
    );
  }

  // Execute payment for a mandate
  private async executePayment(
    program: Program<Dmandate>,
    provider: AnchorProvider,
    mandate: any
  ): Promise<boolean> {
    try {
      const payer = mandate.account.payer;
      const payee = mandate.account.payee;
      const token = mandate.account.token;
      const mandatePDA = mandate.publicKey;

      // Get token accounts
      const payerATA = await getAssociatedTokenAddress(token, payer);
      const payeeATA = await getAssociatedTokenAddress(token, payee);

      // Get payment history PDA
      const [paymentHistoryPDA] = await this.getPaymentHistoryPDA(
        program,
        mandatePDA,
        mandate.account.paymentCount
      );

      logger.info(
        `Executing payment #${
          mandate.account.paymentCount
        } for mandate: ${mandatePDA.toString()}`
      );
      logger.info(`- From: ${payer.toString()}`);
      logger.info(`- To: ${payee.toString()}`);
      logger.info(`- Amount: ${mandate.account.amount.toString()}`);

      // Execute the payment transaction
      const tx = await program.methods
        .executePayment()
        .accountsPartial({
          signer: provider.wallet.publicKey,
          payer: payer,
          payerAta: payerATA,
          payee: payee,
          mandate: mandatePDA,
          paymentHistory: paymentHistoryPDA,
          token: token,
          payeeAta: payeeATA,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      logger.info(`Payment executed successfully! Transaction: ${tx}`);

      // Send notification if enabled
      if (this.config.enableNotifications) {
        this.sendNotification(mandate, tx);
      }

      return true;
    } catch (error: any) {
      // Different error handling based on error type
      if (error.message && error.message.includes("PaymentTooEarly")) {
        logger.debug(
          `Payment for mandate ${mandate.publicKey.toString()} not yet due`
        );
      } else if (
        error.message &&
        error.message.includes("InsufficientBalance")
      ) {
        logger.error(
          `Insufficient balance for mandate ${mandate.publicKey.toString()}`
        );
      } else {
        logger.error(
          `Error executing payment for mandate ${mandate.publicKey.toString()}:`,
          error
        );
      }
      return false;
    }
  }

  // Optional notification method for successful payments
  private sendNotification(mandate: any, txId: string): void {
    // This is a placeholder for integration with notification services
    // You could integrate with email, webhooks, or other notification systems
    logger.info(
      `Notification: Payment executed for mandate ${mandate.publicKey.toString()}`
    );
  }

  // Main process function
  private async processMandates() {
    if (!this.provider || !this.program) {
      const { provider, program } = this.initializeAnchor();
      this.provider = provider;
      this.program = program;
    }

    logger.info("Processing mandates...");
    logger.info(`Wallet address: ${this.provider.wallet.publicKey.toString()}`);

    try {
      // Fetch all mandates
      const mandates = await this.fetchMandates(this.program);

      // Filter for payable mandates
      const payableMandates = mandates.filter((mandate) =>
        this.isMandatePayable(mandate)
      );
      logger.info(
        `Found ${payableMandates.length} mandates ready for payment execution`
      );

      // Process mandates up to batch size limit
      const mandatesToProcess = payableMandates.slice(0, this.config.batchSize);

      // Execute payments
      let successCount = 0;
      for (const mandate of mandatesToProcess) {
        const success = await this.executePayment(
          this.program,
          this.provider,
          mandate
        );
        if (success) successCount++;

        // Small delay between transactions to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      logger.info(
        `Successfully processed ${successCount} out of ${mandatesToProcess.length} mandates`
      );
    } catch (error) {
      logger.error("Error in mandate processing:", error);
    }
  }

  // Public method to start the processor
  public async start(): Promise<void> {
    logger.info(
      `Starting mandate processor with ${this.config.checkInterval}ms interval`
    );

    // Initialize connection
    const { provider, program } = this.initializeAnchor();
    this.provider = provider;
    this.program = program;

    logger.info(`Connected to ${this.config.rpcUrl}`);

    // Run immediately on start
    await this.processMandates();

    // Then schedule periodic runs
    this.intervalId = setInterval(
      () => this.processMandates(),
      this.config.checkInterval
    );
  }

  // Public method to stop the processor
  public async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info("Mandate processor stopped");
    }
  }
}
