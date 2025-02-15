import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Dmandate } from "../target/types/dmandate";
import {
  createMint,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { assert } from "chai";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

describe("dmandate", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.Dmandate as Program<Dmandate>;
  const connection = provider.connection;
  const mintKeypair = anchor.web3.Keypair.generate();
  const wallet = provider.wallet as NodeWallet;
  let token: anchor.web3.PublicKey;
  let tokenAccount: anchor.web3.PublicKey;
  it("creates an SPL token", async () => {
    const amount = 20 * Math.pow(10, 6); // this is the amount of tokens to mint
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
    tokenAccount = await createAssociatedTokenAccount(
      connection,
      wallet.payer,
      token,
      wallet.publicKey
    );

    await mintTo(
      connection,
      wallet.payer,
      token,
      tokenAccount,
      wallet.publicKey,
      amount
    );

    const balance = await connection.getTokenAccountBalance(tokenAccount);
    assert.equal(
      balance.value.amount.toString(),
      amount.toString(),
      "Balance should be equal to amount minted"
    );
  });

  // Mandate creation & actual logic testing
  // A subscription of 10 tokens per month
  const amount = 10;
  const frequency = 30 * 24 * 60 * 60; // 30 days
  const mandate = {
    amount: new anchor.BN(amount),
    frequency: new anchor.BN(frequency),
  };
  const payeeAccount = anchor.web3.Keypair.generate();
  const [mandateAccount, nonce] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("dmandate"),
      wallet.publicKey.toBuffer(),
      payeeAccount.publicKey.toBuffer(),
    ],
    program.programId
  );
  it("creates a mandate", async () => {
    const tx = await program.methods
      .createMandate(mandate.amount, mandate.frequency)
      .accountsPartial({
        mandate: mandateAccount,
        payee: payeeAccount.publicKey,
        payer: wallet.publicKey,
        token,
        tokenProgram: TOKEN_PROGRAM_ID,
        payerAta: tokenAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    assert.ok(tx);
    const accountData = await program.account.mandate.fetch(mandateAccount);

    // Retrieve Solana's clock sysvar
    const clockAccount = await connection.getAccountInfo(
      anchor.web3.SYSVAR_CLOCK_PUBKEY
    );
    let solanaUnixTimestamp: bigint = BigInt(0);
    if (clockAccount) {
      // Clock sysvar layout:
      // slot: u64 (8 bytes)
      // epoch_start_timestamp: i64 (8 bytes)
      // epoch: u64 (8 bytes)
      // leader_schedule_epoch: u64 (8 bytes)
      // unix_timestamp: i64 (8 bytes)  <-- offset 32 bytes
      solanaUnixTimestamp = clockAccount.data.readBigInt64LE(32);
      // console.log("Solana clock (sec):", solanaUnixTimestamp);
    } else {
      console.error("Failed to get clock sysvar");
    }

    assert.ok(accountData);
    assert(accountData.amount.eq(mandate.amount));
    assert(accountData.frequency.eq(mandate.frequency));
    assert(accountData.payee.equals(payeeAccount.publicKey));
    assert(accountData.payer.equals(wallet.publicKey));
    assert(accountData.token.equals(token));
    assert(
      accountData.nextPayout.toNumber() - Number(solanaUnixTimestamp) ==
        accountData.frequency.toNumber(),
      "Next payout should be in 30 days"
    );
  });
});
