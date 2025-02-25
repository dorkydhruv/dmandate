import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Dmandate } from "../target/types/dmandate";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { delay } from "./utils";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

describe("dmandate", () => {
  // Setup provider and program
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.Dmandate as Program<Dmandate>;
  const connection = provider.connection;
  const wallet = provider.wallet as NodeWallet;

  // Generate keypairs for our test
  const mintKeypair = anchor.web3.Keypair.generate();
  const payerKeypair = wallet.payer; // Use the wallet keypair for payer
  const payeeKeypair = anchor.web3.Keypair.generate();
  const unauthorizedKeypair = anchor.web3.Keypair.generate();

  // Store public keys for token and accountsPartial
  let token: anchor.web3.PublicKey;
  let payerAta: anchor.web3.PublicKey;
  let payeeAta: anchor.web3.PublicKey;

  // For mandate
  const amount = 10;
  const frequency = 1; // 1 second for testing
  const name = "Netflix Subscription";
  const description = "Monthly payment for Netflix premium plan";

  // For updated mandate
  const updatedAmount = 15;

  // PDA addresses
  let mandatePda: anchor.web3.PublicKey;
  let mandateBump: number;
  let payerUserPda: anchor.web3.PublicKey;
  let payerUserBump: number;
  let payeeUserPda: anchor.web3.PublicKey;
  let payeeUserBump: number;
  let paymentHistoryPda: anchor.web3.PublicKey;
  let paymentHistoryBump: number;

  before(async () => {
    // Airdrop SOL to payee and unauthorized keypair for testing
    const airdropSig1 = await connection.requestAirdrop(
      payeeKeypair.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropSig1);

    const airdropSig2 = await connection.requestAirdrop(
      unauthorizedKeypair.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropSig2);

    // Find PDAs
    [payerUserPda, payerUserBump] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("user"), payerKeypair.publicKey.toBuffer()],
        program.programId
      );

    [payeeUserPda, payeeUserBump] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("user"), payeeKeypair.publicKey.toBuffer()],
        program.programId
      );

    [mandatePda, mandateBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("dmandate"),
        payerKeypair.publicKey.toBuffer(),
        payeeKeypair.publicKey.toBuffer(),
      ],
      program.programId
    );
  });

  // Test 1: Create SPL token
  it("creates an SPL token for testing", async () => {
    token = await createMint(
      connection,
      payerKeypair,
      payerKeypair.publicKey,
      null,
      0,
      mintKeypair,
      null,
      TOKEN_PROGRAM_ID
    );

    // Create ATAs for payer and payee
    payerAta = await createAssociatedTokenAccount(
      connection,
      payerKeypair,
      token,
      payerKeypair.publicKey,
      {},
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    payeeAta = await createAssociatedTokenAccount(
      connection,
      payerKeypair,
      token,
      payeeKeypair.publicKey,
      {},
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Mint 1000 tokens to payer
    await mintTo(
      connection,
      payerKeypair,
      token,
      payerAta,
      payerKeypair.publicKey,
      1000,
      [],
      null,
      TOKEN_PROGRAM_ID
    );

    // Verify balance
    const payerAccount = await getAccount(
      connection,
      payerAta,
      null,
      TOKEN_PROGRAM_ID
    );
    expect(Number(payerAccount.amount)).to.equal(1000);
  });

  // Test 2: Register users
  it("registers the payer user", async () => {
    const tx = await program.methods
      .registerUser("John Doe")
      .accountsPartial({
        user: payerUserPda,
        authority: payerKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Fetch and verify user account
    const userAccount = await program.account.user.fetch(payerUserPda);
    expect(userAccount.name).to.equal("John Doe");
    expect(userAccount.incomingSubscriptionsCount).to.equal(0);
    expect(userAccount.outgoingSubscriptionsCount).to.equal(0);
    expect(userAccount.authority.toString()).to.equal(
      payerKeypair.publicKey.toString()
    );
  });

  it("registers the payee user", async () => {
    const tx = await program.methods
      .registerUser("Netflix Inc")
      .accountsPartial({
        user: payeeUserPda,
        authority: payeeKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([payeeKeypair])
      .rpc();

    // Fetch and verify user account
    const userAccount = await program.account.user.fetch(payeeUserPda);
    expect(userAccount.name).to.equal("Netflix Inc");
    expect(userAccount.incomingSubscriptionsCount).to.equal(0);
    expect(userAccount.outgoingSubscriptionsCount).to.equal(0);
    expect(userAccount.authority.toString()).to.equal(
      payeeKeypair.publicKey.toString()
    );
  });

  it("fails to register a user twice", async () => {
    try {
      await program.methods
        .registerUser("John Doe Again")
        .accountsPartial({
          user: payerUserPda,
          authority: payerKeypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (e) {
      // Expected error for duplicate account
      expect(e).to.be.instanceOf(Error);
    }
  });

  // Test 3: Create Mandate
  it("creates a mandate", async () => {
    const tx = await program.methods
      .createMandate(
        new anchor.BN(amount),
        new anchor.BN(frequency),
        name,
        description
      )
      .accountsPartial({
        payer: payerKeypair.publicKey,
        payee: payeeKeypair.publicKey,
        token: token,
        payerAta: payerAta,
        mandate: mandatePda,
        payerUser: payerUserPda,
        payeeUser: payeeUserPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Fetch and verify mandate account
    const mandateAccount = await program.account.mandate.fetch(mandatePda);
    expect(mandateAccount.payer.toString()).to.equal(
      payerKeypair.publicKey.toString()
    );
    expect(mandateAccount.payee.toString()).to.equal(
      payeeKeypair.publicKey.toString()
    );
    expect(mandateAccount.amount.toNumber()).to.equal(amount);
    expect(mandateAccount.name).to.equal(name);
    expect(mandateAccount.description).to.equal(description);
    expect(mandateAccount.active).to.be.true;
    expect(mandateAccount.paymentCount).to.equal(0);

    // Verify subscription counts were incremented
    const payerUser = await program.account.user.fetch(payerUserPda);
    const payeeUser = await program.account.user.fetch(payeeUserPda);
    expect(payerUser.outgoingSubscriptionsCount).to.equal(1);
    expect(payeeUser.incomingSubscriptionsCount).to.equal(1);

    // Verify token delegation
    const payerAccountInfo = await getAccount(
      connection,
      payerAta,
      null,
      TOKEN_PROGRAM_ID
    );
    expect(payerAccountInfo.delegate?.toString()).to.equal(
      mandatePda.toString()
    );
    expect(Number(payerAccountInfo.delegatedAmount)).to.equal(amount * 3); // 3x the amount for 3 terms
  });

  it("fails to create duplicate mandate", async () => {
    try {
      await program.methods
        .createMandate(
          new anchor.BN(amount),
          new anchor.BN(frequency),
          name,
          description
        )
        .accountsPartial({
          payer: payerKeypair.publicKey,
          payee: payeeKeypair.publicKey,
          token: token,
          payerAta: payerAta,
          mandate: mandatePda,
          payerUser: payerUserPda,
          payeeUser: payeeUserPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (e) {
      // Expected error for duplicate account
      expect(e).to.be.instanceOf(Error);
    }
  });

  // Test 4: Execute Payment
  it("fails to execute payment too early", async () => {
    // Find payment history PDA for payment #0
    [paymentHistoryPda, paymentHistoryBump] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_history"),
          mandatePda.toBuffer(),
          new anchor.BN(0).toBuffer("le", 4),
        ],
        program.programId
      );

    try {
      await program.methods
        .executePayment()
        .accountsPartial({
          signer: payerKeypair.publicKey,
          payer: payerKeypair.publicKey,
          payerAta: payerAta,
          payee: payeeKeypair.publicKey,
          mandate: mandatePda,
          paymentHistory: paymentHistoryPda,
          token: token,
          payeeAta: payeeAta,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (e) {
      // Expected error for executing too early
      expect(e).to.be.instanceOf(Error);
    }
  });

  it("successfully executes payment after waiting", async () => {
    // Wait for the frequency period
    await delay(frequency * 1000 + 200); // Adding 200ms buffer

    await program.methods
      .executePayment()
      .accountsPartial({
        signer: payerKeypair.publicKey,
        payer: payerKeypair.publicKey,
        payerAta: payerAta,
        payee: payeeKeypair.publicKey,
        mandate: mandatePda,
        paymentHistory: paymentHistoryPda,
        token: token,
        payeeAta: payeeAta,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Verify payment was successful
    const payeeAccount = await getAccount(
      connection,
      payeeAta,
      null,
      TOKEN_PROGRAM_ID
    );
    expect(Number(payeeAccount.amount)).to.equal(amount);

    // Verify mandate was updated
    const mandateAccount = await program.account.mandate.fetch(mandatePda);
    expect(mandateAccount.paymentCount).to.equal(1);

    // Verify payment history was created
    const paymentHistory = await program.account.paymentHistory.fetch(
      paymentHistoryPda
    );
    expect(paymentHistory.mandate.toString()).to.equal(mandatePda.toString());
    expect(paymentHistory.amount.toNumber()).to.equal(amount);
    expect(paymentHistory.paymentNumber).to.equal(0);
  });

  it("executes second payment after frequency passes", async () => {
    // Find payment history PDA for payment #1
    const [paymentHistory2Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("payment_history"),
        mandatePda.toBuffer(),
        new anchor.BN(1).toBuffer("le", 4),
      ],
      program.programId
    );
    // Wait for the frequency period again
    await delay(frequency * 1000 + 200);

    await program.methods
      .executePayment()
      .accountsPartial({
        signer: payerKeypair.publicKey,
        payer: payerKeypair.publicKey,
        payerAta: payerAta,
        payee: payeeKeypair.publicKey,
        mandate: mandatePda,
        paymentHistory: paymentHistory2Pda,
        token: token,
        payeeAta: payeeAta,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Verify payment was successful
    const payeeAccount = await getAccount(
      connection,
      payeeAta,
      null,
      TOKEN_PROGRAM_ID
    );
    expect(Number(payeeAccount.amount)).to.equal(amount * 2); // Now has 2 payments

    // Verify mandate was updated
    const mandateAccount = await program.account.mandate.fetch(mandatePda);
    expect(mandateAccount.paymentCount).to.equal(2);
  });

  // Test 5: Reapprove Mandate (e.g., if user wants to increase delegation)
  it("reapproves mandate with increased amount", async () => {
    await program.methods
      .reapproveMandate(new anchor.BN(updatedAmount * 3)) // Approving 3x the new amount
      .accountsPartial({
        payer: payerKeypair.publicKey,
        token: token,
        payerAta: payerAta,
        mandate: mandatePda,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    // Verify delegation amount changed
    const payerAccount = await getAccount(
      connection,
      payerAta,
      null,
      TOKEN_PROGRAM_ID
    );
    expect(Number(payerAccount.delegatedAmount)).to.equal(updatedAmount * 3);
  });

  // Test 6: Get User Subscriptions (view function)
  it("gets user subscriptions", async () => {
    await program.methods
      .getUserSubscriptions()
      .accountsPartial({
        user: payerUserPda,
        authority: payerKeypair.publicKey,
      })
      .rpc();

    // We're just verifying it doesn't fail, as it's a view function
    const payerUser = await program.account.user.fetch(payerUserPda);
    expect(payerUser.outgoingSubscriptionsCount).to.equal(1);
  });

  // Test 7: Close Payment History
  it("closes first payment history", async () => {
    // Get balance before
    const balanceBefore = await connection.getBalance(payerKeypair.publicKey);

    await program.methods
      .closePaymentHistory()
      .accountsPartial({
        authority: payerKeypair.publicKey,
        mandate: mandatePda,
        paymentHistory: paymentHistoryPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Verify account closed (rent returned)
    try {
      await program.account.paymentHistory.fetch(paymentHistoryPda);
      expect.fail("Payment history should be closed");
    } catch (e) {
      // Expected error for closed account
      expect(e).to.be.instanceOf(Error);
    }

    // Verify rent was returned
    const balanceAfter = await connection.getBalance(payerKeypair.publicKey);
    expect(balanceAfter).to.be.greaterThan(balanceBefore);
  });

  it("fails when unauthorized user tries to close payment history", async () => {
    const [paymentHistory2Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("payment_history"),
        mandatePda.toBuffer(),
        new anchor.BN(1).toBuffer("le", 4),
      ],
      program.programId
    );

    try {
      await program.methods
        .closePaymentHistory()
        .accountsPartial({
          authority: unauthorizedKeypair.publicKey,
          mandate: mandatePda,
          paymentHistory: paymentHistory2Pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([unauthorizedKeypair])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (e) {
      // Expected error for unauthorized access
      expect(e).to.be.instanceOf(Error);
    }
  });

  // Test 8: Cancel Mandate
  it("cancels the mandate", async () => {
    await program.methods
      .cancelMandate()
      .accountsPartial({
        payer: payerKeypair.publicKey,
        token: token,
        payerAta: payerAta,
        mandate: mandatePda,
        payerUser: payerUserPda,
        payeeUser: payeeUserPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Verify mandate is closed
    try {
      await program.account.mandate.fetch(mandatePda);
      expect.fail("Mandate should be closed");
    } catch (e) {
      // Expected error for closed account
      expect(e).to.be.instanceOf(Error);
    }

    // Verify delegation revoked
    const payerAccount = await getAccount(
      connection,
      payerAta,
      null,
      TOKEN_PROGRAM_ID
    );
    expect(payerAccount.delegate).to.be.null;

    // Verify subscription counts were decremented
    const payerUser = await program.account.user.fetch(payerUserPda);
    const payeeUser = await program.account.user.fetch(payeeUserPda);
    expect(payerUser.outgoingSubscriptionsCount).to.equal(0);
    expect(payeeUser.incomingSubscriptionsCount).to.equal(0);
  });

  it("fails to create mandate with insufficient balance", async () => {
    // Create another keypair with just enough SOL for rent but not enough tokens
    const poorPayer = anchor.web3.Keypair.generate();
    const airdropSig = await connection.requestAirdrop(
      poorPayer.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropSig);

    // Create ATA for poor payer but don't fund it with many tokens
    const poorPayerAta = await createAssociatedTokenAccount(
      connection,
      payerKeypair,
      token,
      poorPayer.publicKey,
      {},
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Mint just 1 token (less than needed for subscriptions)
    await mintTo(
      connection,
      payerKeypair,
      token,
      poorPayerAta,
      payerKeypair.publicKey,
      1,
      [],
      null,
      TOKEN_PROGRAM_ID
    );

    // Register poor payer user
    const [poorPayerUserPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user"), poorPayer.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .registerUser("Poor Payer")
      .accountsPartial({
        user: poorPayerUserPda,
        authority: poorPayer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([poorPayer])
      .rpc();

    // Find mandate PDA
    const [poorMandatePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("dmandate"),
        poorPayer.publicKey.toBuffer(),
        payeeKeypair.publicKey.toBuffer(),
      ],
      program.programId
    );

    // Create mandate - should work because it only delegates
    await program.methods
      .createMandate(
        new anchor.BN(amount),
        new anchor.BN(frequency),
        "Poor Mandate",
        "Not enough funds for this"
      )
      .accountsPartial({
        payer: poorPayer.publicKey,
        payee: payeeKeypair.publicKey,
        token: token,
        payerAta: poorPayerAta,
        mandate: poorMandatePda,
        payerUser: poorPayerUserPda,
        payeeUser: payeeUserPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([poorPayer])
      .rpc();

    // Find payment history PDA
    const [poorPaymentHistoryPda] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_history"),
          poorMandatePda.toBuffer(),
          new anchor.BN(0).toBuffer("le", 4),
        ],
        program.programId
      );

    // Wait for frequency to pass
    await delay(frequency * 1000 + 200);

    // Try to execute payment - should fail due to insufficient funds
    try {
      await program.methods
        .executePayment()
        .accountsPartial({
          signer: payerKeypair.publicKey,
          payer: poorPayer.publicKey,
          payerAta: poorPayerAta,
          payee: payeeKeypair.publicKey,
          mandate: poorMandatePda,
          paymentHistory: poorPaymentHistoryPda,
          token: token,
          payeeAta: payeeAta,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      expect.fail("Should have thrown insufficient funds error");
    } catch (e) {
      // Expected error for insufficient funds
      expect(e).to.be.instanceOf(Error);
    }
  });
});
