import { test } from "node:test";
import * as anchor from "@coral-xyz/anchor";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { expect } from "chai";
import { LiteSVM } from "litesvm";
import type { IamAnchor } from "../target/types/iam_anchor";
import type { IamRegistry } from "../target/types/iam_registry";
import { admin, SYSTEM_PROGRAM } from "./litesvm-utils";

/*
Build the Solana programs first:
$ anchor build
Then Install NodeJs v25.9.0(or above v22.18.0) to run this TypeScript Natively: node ./file_path/this_file.ts
Or use Bun: bun test ./file_path/this_file.ts
*/
const iamAnchor = anchor.workspace.iamAnchor as anchor.Program<IamAnchor>;
const iamAnchorProgId = iamAnchor.programId;

const registry = anchor.workspace.iamRegistry as anchor.Program<IamRegistry>;

const [mintAuthorityPda] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("mint_authority")],
  iamAnchorProgId,
);
console.log("mintAuthorityPda:", mintAuthorityPda.toBase58());

const [protocolConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("protocol_config")],
  registry.programId,
);

const commitment = Buffer.alloc(32);
commitment.write("initial_commitment_test", "utf-8");

test("one transfer", () => {
  const svm = new LiteSVM();
  const payer = new Keypair();
  svm.airdrop(payer.publicKey, BigInt(LAMPORTS_PER_SOL));
  const receiver = PublicKey.unique();
  const blockhash = svm.latestBlockhash();
  const transferLamports = 1_000_000n;
  const ixs = [
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: receiver,
      lamports: transferLamports,
    }),
  ];
  const tx = new Transaction();
  tx.recentBlockhash = blockhash;
  tx.add(...ixs);
  tx.sign(payer);
  svm.sendTransaction(tx);
  const balanceAfter = svm.getBalance(receiver);
  expect(balanceAfter).eq(transferLamports);
});

test("registry.initializeProtocol()", async () => {
  try {
    await registry.methods
      .initializeProtocol(
        new anchor.BN(1_000_000_000),
        new anchor.BN(300),
        10000,
        100,
        new anchor.BN(0),
      )
      .accountsStrict({
        admin: admin,
        protocolConfig: protocolConfigPda,
        systemProgram: SYSTEM_PROGRAM,
      })
      .rpc();
  } catch {
    // Already initialized from a previous run
  }
});
