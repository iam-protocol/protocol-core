import { test } from "node:test";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import type { Keypair } from "@solana/web3.js";
import {
  BASE_TRUST_INCREMENT,
  CHALLENGE_EXPIRY,
  decodeIdentityPdaDev,
  getAta,
  type IdentityStateAcctWeb3js,
  iamAnchorAddr,
  loadProofFixture,
  MAX_TRUST_SCORE,
  MIN_STAKE,
  mintAuthorityPda,
  type Pdas,
  protocolConfigPda,
  treasuryPda,
  VERIFICATION_FEE,
} from "./encodeDecode.ts";
import {
  acctEqual,
  acctIsNull,
  adminKp,
  authorizeNewWallet,
  initializeProtocol,
  mintAnchor,
  pdasBySignerKp,
  readAcct,
  user1,
  user1Kp,
} from "./litesvm-utils.ts";

/*
Build the Solana programs first:
$ anchor build
Then Install NodeJs v25.9.0(or above v22.18.0) to run this TypeScript Natively: node ./file_path/this_file.ts
Or use Bun: bun test ./file_path/this_file.ts
*/

const fixture = loadProofFixture();
const commitment = Buffer.alloc(32);
commitment.write("initial_commitment_test", "utf-8");

let signerKp: Keypair;
const _expectedErr = "";
let pdas: Pdas;
let rawAccData: Uint8Array<ArrayBufferLike> | undefined;
let identity: IdentityStateAcctWeb3js;

//Follow z-e2e.ts tests
test("registry.initializeProtocol()", async () => {
  console.log("\n----------------== registry.initializeProtocol()");
  signerKp = adminKp;

  acctIsNull(protocolConfigPda);
  initializeProtocol(
    signerKp,
    protocolConfigPda,
    MIN_STAKE,
    CHALLENGE_EXPIRY,
    MAX_TRUST_SCORE,
    BASE_TRUST_INCREMENT,
    VERIFICATION_FEE,
  );
});

test("registry.mintAnchor()", async () => {
  console.log("\n----------------== registry.mintAnchor()");
  signerKp = adminKp;
  pdas = pdasBySignerKp(signerKp);
  const tokenProgram = TOKEN_2022_PROGRAM_ID;
  const ata = getAta(pdas.mintPda, pdas.signer, false, tokenProgram);
  const initialCommitment = Buffer.from(fixture.public_inputs[1]);

  mintAnchor(
    signerKp,
    initialCommitment,
    pdas.identityPda,
    pdas.mintPda,
    mintAuthorityPda,
    ata,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    tokenProgram,
    protocolConfigPda,
    treasuryPda,
  );
});

test("iamAnchor.authorizeNewWallet(): 1st time", async () => {
  console.log("\n----------------== iamAnchor.authorizeNewWallet(): 1st time");
  signerKp = adminKp;
  pdas = pdasBySignerKp(signerKp); //{signer, identityPda, mintPda, nonce, challengePda, verificationPda }

  authorizeNewWallet(adminKp, pdas.identityPda, user1Kp);
  rawAccData = readAcct(pdas.identityPda, iamAnchorAddr);
  identity = decodeIdentityPdaDev(rawAccData);
  acctEqual(identity.owner, signerKp.publicKey);
  console.log("user1:", user1.toBase58());
  acctEqual(identity.new_wallet, user1Kp.publicKey);
});

//mint_anchor

//migrate_identity(old_identity, new_identity)
