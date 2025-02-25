import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Dmandate } from "../target/types/dmandate";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createMint,
  mintTo,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { BN } from "bn.js";
import { assert } from "chai";
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
  const payeeKeypair = anchor.web3.Keypair.generate();

  // Store public keys for token and accounts
  let token: anchor.web3.PublicKey;
  let payerAta: anchor.web3.PublicKey;
  let payeeAta: anchor.web3.PublicKey;

  // For mandate
  const amount = 10;
  const frequency = 1; // 1 second for testing
  const name = "Netflix Subscription";
  const description = "Monthly payment for Netflix premium plan";

  // PDA addresses
  let mandatePda: anchor.web3.PublicKey;
  let mandateBump: number;
  let payerUserPda: anchor.web3.PublicKey;
  let payerUserBump: number;
  let payeeUserPda: anchor.web3.PublicKey;
  let payeeUserBump: number;

  before(async () => {
    // Fund the payee account
    const payeeAirdrop = await connection.requestAirdrop(
      payeeKeypair.publicKey,
      1 * anchor.web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(payeeAirdrop);

    // Find PDAs
    [mandatePda, mandateBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("dmandate"),
        wallet.publicKey.toBuffer(),
        payeeKeypair.publicKey.toBuffer(),
      ],
      program.programId
    );

    [payerUserPda, payerUserBump] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("user"), wallet.publicKey.toBuffer()],
        program.programId
      );

    [payeeUserPda, payeeUserBump] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("user"), payeeKeypair.publicKey.toBuffer()],
        program.programId
      );
  });

  // Test 1: Create SPL token
  it("creates an SPL token for testing", async () => {
    token = await createMint(
      connection,
      wallet.payer,
      wallet.publicKey,
      null,
      6,
      mintKeypair,
      undefined,
      TOKEN_PROGRAM_ID
    );

    // Create associated token accounts
    payerAta = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        token,
        wallet.publicKey
      )
    ).address;

    payeeAta = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        token,
        payeeKeypair.publicKey
      )
    ).address;

    // Mint some tokens to payer
    await mintTo(
      connection,
      wallet.payer,
      token,
      payerAta,
      wallet.payer,
      1000 * 10 ** 6
    );

    // Verify balance
    const balance = await connection.getTokenAccountBalance(payerAta);
    assert(balance.value.uiAmount === 1000, "Token balance should be 1000");
  });

  // Test 2: Register users
  it("registers the payer user", async () => {
    await program.methods
      .registerUser("Payer User")
      .accountsPartial({
        user: payerUserPda,
        authority: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Verify user account
    const payerUser = await program.account.user.fetch(payerUserPda);
    assert.equal(payerUser.name, "Payer User");
    assert.equal(payerUser.authority.toString(), wallet.publicKey.toString());
    assert.equal(payerUser.incomingSubscriptionsCount, 0);
    assert.equal(payerUser.outgoingSubscriptionsCount, 0);
  });

  it("registers the payee user", async () => {
    await program.methods
      .registerUser("Payee User")
      .accountsPartial({
        user: payeeUserPda,
        authority: payeeKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([payeeKeypair])
      .rpc();

    // Verify user account
    const payeeUser = await program.account.user.fetch(payeeUserPda);
    assert.equal(payeeUser.name, "Payee User");
    assert.equal(
      payeeUser.authority.toString(),
      payeeKeypair.publicKey.toString()
    );
    assert.equal(payeeUser.incomingSubscriptionsCount, 0);
    assert.equal(payeeUser.outgoingSubscriptionsCount, 0);
  });

  // Test 3: Create Mandate
  it("creates a mandate", async () => {
    await program.methods
      .createMandate(
        new BN(amount * 10 ** 6), // Convert to token amount with decimals
        new BN(frequency),
        name,
        description
      )
      .accountsPartial({
        payer: wallet.publicKey,
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

    // Verify mandate account
    const mandate = await program.account.mandate.fetch(mandatePda);
    assert.equal(mandate.payer.toString(), wallet.publicKey.toString());
    assert.equal(mandate.payee.toString(), payeeKeypair.publicKey.toString());
    assert.equal(
      mandate.amount.toString(),
      new BN(amount * 10 ** 6).toString()
    );
    assert.equal(mandate.token.toString(), token.toString());
    assert.equal(mandate.frequency.toString(), new BN(frequency).toString());
    assert.equal(mandate.active, true);
    assert.equal(mandate.name, name);
    assert.equal(mandate.description, description);
    assert.equal(mandate.paymentCount, 0);

    // Verify user accounts were updated
    const payerUser = await program.account.user.fetch(payerUserPda);
    const payeeUser = await program.account.user.fetch(payeeUserPda);
    assert.equal(payerUser.outgoingSubscriptionsCount, 1);
    assert.equal(payeeUser.incomingSubscriptionsCount, 1);
  });

  // Test 4: Execute Payment
  it("executes a payment", async () => {
    // Wait for the payment period to elapse
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Find the payment history PDA
    const [paymentHistoryPda, paymentHistoryBump] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_history"),
          mandatePda.toBuffer(),
          Buffer.from([0, 0, 0, 0]), // payment_count = 0 (as little endian bytes)
        ],
        program.programId
      );

    const initialPayeeBalance = await connection
      .getTokenAccountBalance(payeeAta)
      .then((res) => res.value.amount)
      .catch(() => "0"); // Handle case where account might not exist yet

    await program.methods
      .executePayment()
      .accountsPartial({
        signer: wallet.publicKey,
        payer: wallet.publicKey,
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

    // Verify payment execution
    // 1. Check mandate payment count updated
    const mandate = await program.account.mandate.fetch(mandatePda);
    assert.equal(mandate.paymentCount, 1);

    // 2. Check payment history record
    const paymentHistory = await program.account.paymentHistory.fetch(
      paymentHistoryPda
    );
    assert.equal(paymentHistory.mandate.toString(), mandatePda.toString());
    assert.equal(
      paymentHistory.amount.toString(),
      new BN(amount * 10 ** 6).toString()
    );
    assert.equal(paymentHistory.paymentNumber, 0); // First payment

    // 3. Check token balance transfer
    const finalPayeeBalance = await connection
      .getTokenAccountBalance(payeeAta)
      .then((res) => res.value.amount);

    const expectedPayeeBalance = new BN(initialPayeeBalance)
      .add(new BN(amount * 10 ** 6))
      .toString();
    assert.equal(
      finalPayeeBalance,
      expectedPayeeBalance,
      "Payee should have received tokens"
    );
  });

  // Test 5: Reapprove Mandate with different amount
  it("reapproves a mandate", async () => {
    const newAmount = 20 * 10 ** 6; // 20 tokens

    await program.methods
      .reapproveMandate(new BN(newAmount))
      .accountsPartial({
        payer: wallet.publicKey,
        token: token,
        payerAta: payerAta,
        mandate: mandatePda,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    // Verify approval by executing another payment
    // Wait for next payment period
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Find the payment history PDA for second payment
    const [paymentHistoryPda, paymentHistoryBump] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_history"),
          mandatePda.toBuffer(),
          Buffer.from([1, 0, 0, 0]), // payment_count = 1 (as little endian bytes)
        ],
        program.programId
      );

    // Execute second payment
    await program.methods
      .executePayment()
      .accountsPartial({
        signer: wallet.publicKey,
        payer: wallet.publicKey,
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

    // Verify second payment worked with reapproved delegation
    const mandate = await program.account.mandate.fetch(mandatePda);
    assert.equal(mandate.paymentCount, 2);
  });

  // Test 6: Close Payment History
  it("closes a payment history", async () => {
    // Find the payment history PDA
    const [paymentHistoryPda, paymentHistoryBump] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_history"),
          mandatePda.toBuffer(),
          Buffer.from([0, 0, 0, 0]), // payment_count = 0 (first payment)
        ],
        program.programId
      );

    const beforeBalance = await connection.getBalance(wallet.publicKey);

    await program.methods
      .closePaymentHistory()
      .accountsPartial({
        authority: wallet.publicKey,
        mandate: mandatePda,
        paymentHistory: paymentHistoryPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Verify payment history was closed
    try {
      await program.account.paymentHistory.fetch(paymentHistoryPda);
      assert.fail("Payment history account should be closed");
    } catch (err) {
      // Expected - account was closed
      assert.include(err.toString(), "Account does not exist");
    }

    // Verify rent was returned
    const afterBalance = await connection.getBalance(wallet.publicKey);
    assert(
      afterBalance > beforeBalance,
      "Rent should be returned to authority"
    );
  });

  // Test 7: Cancel Mandate
  it("cancels a mandate", async () => {
    await program.methods
      .cancelMandate()
      .accountsPartial({
        payer: wallet.publicKey,
        token: token,
        payerAta: payerAta,
        mandate: mandatePda,
        payerUser: payerUserPda,
        payeeUser: payeeUserPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Verify mandate account was closed
    try {
      await program.account.mandate.fetch(mandatePda);
      assert.fail("Mandate account should be closed");
    } catch (err) {
      // Expected - account was closed
      assert.include(err.toString(), "Account does not exist");
    }

    // Verify user accounts were updated
    const payerUser = await program.account.user.fetch(payerUserPda);
    const payeeUser = await program.account.user.fetch(payeeUserPda);
    assert.equal(payerUser.outgoingSubscriptionsCount, 0);
    assert.equal(payeeUser.incomingSubscriptionsCount, 0);
  });

  // Test 8: Error Cases
  it("fails when trying to execute payment too early", async () => {
    // Setup a new mandate for testing error cases
    const newMandateKeypair = anchor.web3.Keypair.generate();
    const frequency = 10000; // 10000 seconds (very long)

    // Fund the new mandate account
    await connection.requestAirdrop(
      newMandateKeypair.publicKey,
      1 * anchor.web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(
      await connection.requestAirdrop(
        newMandateKeypair.publicKey,
        1_000_000_000
      )
    );

    // Create user account for the new payee
    const [newPayeeUserPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user"), newMandateKeypair.publicKey.toBuffer()],
      program.programId
    );

    // Register the new payee user
    await program.methods
      .registerUser("Test Payee")
      .accountsPartial({
        user: newPayeeUserPda,
        authority: newMandateKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([newMandateKeypair])
      .rpc();

    // Find the new mandate PDA
    const [newMandatePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("dmandate"),
        wallet.publicKey.toBuffer(),
        newMandateKeypair.publicKey.toBuffer(),
      ],
      program.programId
    );

    // Create the new mandate
    await program.methods
      .createMandate(
        new anchor.BN(amount * 10 ** 6),
        new anchor.BN(frequency),
        "Test Mandate",
        "For testing early payment error"
      )
      .accountsPartial({
        payer: wallet.publicKey,
        payee: newMandateKeypair.publicKey,
        token,
        payerAta,
        mandate: newMandatePda,
        payerUser: payerUserPda,
        payeeUser: newPayeeUserPda, // Use the newly created payee user PDA
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Create payee token account
    const newPayeeAta = await getAssociatedTokenAddressSync(
      token,
      newMandateKeypair.publicKey
    );

    // Find payment history PDA
    const [paymentHistoryPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("payment_history"),
        newMandatePda.toBuffer(),
        Buffer.from([0, 0, 0, 0]),
      ],
      program.programId
    );

    // Try to execute payment immediately (should fail)
    try {
      await program.methods
        .executePayment()
        .accountsPartial({
          signer: wallet.publicKey,
          payer: wallet.publicKey,
          payerAta,
          payee: newMandateKeypair.publicKey,
          mandate: newMandatePda,
          paymentHistory: paymentHistoryPda,
          token,
          payeeAta: newPayeeAta,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have thrown an error");
    } catch (err) {
      assert.include(err.toString(), "PaymentTooEarly");
    }
  });
});
