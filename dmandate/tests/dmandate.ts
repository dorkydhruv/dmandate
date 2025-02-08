import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Dmandate } from "../target/types/dmandate";

describe("dmandate", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Dmandate as Program<Dmandate>;

  it("Is initialized!", async () => {
    // Add your test here.
    // const tx = await program.methods.createMandate(anchor.BN()).rpc();
    // console.log("Your transaction signature", tx);
  });
});
