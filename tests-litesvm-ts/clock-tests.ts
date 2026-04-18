import { test } from "node:test";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import type { Keypair, PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import {
  decodeIdentityStateWeb3js,
  decodeProtocolConfigWeb3js,
  deriveIdentityPda,
  deriveMintPda,
  mintAuthorityPda,
  protocolConfigBump,
  protocolConfigPda,
  treasuryPda,
} from "./encodeDecode.ts";
import {
  acctEqual,
  acctIsNull,
  adminKp,
  ataBalCk,
  day,
  iamAnchorAddr,
  initializeProtocol,
  mintAnchor,
  readAcct,
  registryAddr,
  updateAnchor,
  warpTime,
} from "./litesvm-utils.ts";

/* Build the Solana programs first:
$ anchor build
Then Install NodeJs v25.9.0(or above v22.18.0) to run this TypeScript Natively: node ./file_path/this_file.ts
Or use Bun: bun test ./file_path/this_file.ts
*/
const commitment = Buffer.alloc(32);
commitment.write("initial_commitment_test", "utf-8");

let signerKp: Keypair;
let signer: PublicKey;
warpTime(0);

test("registry.initializeProtocol()", async () => {
  signerKp = adminKp;
  signer = signerKp.publicKey;
  const min_stake = BigInt(1_000_000_000);
  const challenge_expiry = BigInt(300); //i64,
  const max_trust_score = 10000; //u16,
  const base_trust_increment = 100; //u16,
  const verification_fee = BigInt(0);
  acctIsNull(protocolConfigPda);
  initializeProtocol(
    signerKp,
    protocolConfigPda,
    min_stake,
    challenge_expiry,
    max_trust_score,
    base_trust_increment,
    verification_fee,
  );

  const rawAccountData = readAcct(protocolConfigPda, registryAddr);
  const decoded = decodeProtocolConfigWeb3js(rawAccountData);
  acctEqual(decoded.admin, signer);
  expect(decoded.min_stake).eq(min_stake);
  expect(decoded.challenge_expiry).eq(challenge_expiry);
  expect(decoded.max_trust_score).eq(max_trust_score);
  expect(decoded.base_trust_increment).eq(base_trust_increment);
  expect(decoded.bump).eq(protocolConfigBump);
  expect(decoded.verification_fee).eq(verification_fee);
});

test("registry.mintAnchor()", async () => {
  signerKp = adminKp;
  signer = signerKp.publicKey;
  const [identityPda] = deriveIdentityPda(signer);
  const [mintPda] = deriveMintPda(signer);
  const tokenProgram = TOKEN_2022_PROGRAM_ID;
  const ata = getAssociatedTokenAddressSync(
    mintPda,
    signer,
    false,
    tokenProgram,
  );

  mintAnchor(
    signerKp,
    commitment,
    identityPda,
    mintPda,
    mintAuthorityPda,
    ata,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    tokenProgram,
    protocolConfigPda,
    treasuryPda,
  );
  const rawAccountData = readAcct(identityPda, iamAnchorAddr);
  const decoded = decodeIdentityStateWeb3js(rawAccountData);
  acctEqual(decoded.owner, signer);
  expect(decoded.verification_count).to.equal(0);
  expect(decoded.trust_score).to.equal(0);
  console.log("expected commitment:", commitment.buffer);
  expect(Buffer.from(decoded.current_commitment)).to.deep.equal(commitment);
  acctEqual(decoded.mint, mintPda);
  ataBalCk(ata, BigInt(1), "IdentityMint", 0);
});

test("iamAnchor.updateAnchor()", async () => {
  //update_anchor() at T=0 → trust score = 100
  signerKp = adminKp;
  signer = signerKp.publicKey;
  const [identityPda] = deriveIdentityPda(signer);
  const newCommitment = Buffer.alloc(32);
  newCommitment.write("updated_commitment_v2!", "utf-8");

  updateAnchor(
    signerKp,
    newCommitment,
    identityPda,
    protocolConfigPda,
    treasuryPda,
  );
  const rawAccountData = readAcct(identityPda);
  const decoded = decodeIdentityStateWeb3js(rawAccountData);
  expect(decoded.verification_count).to.equal(1);
  expect(decoded.trust_score).to.equal(100);
});

test("iamAnchor.updateAnchor() 2nd time", async () => {
  //warp 1 day + create_challenge + verify_proof + update_anchor: trust score should be ~196
  signerKp = adminKp;
  signer = signerKp.publicKey;
  const [_identityPda] = deriveIdentityPda(signer);
  const newCommitment = Buffer.alloc(32);
  newCommitment.write("updated_commitment_v2!", "utf-8");

  warpTime(1 * day);

  /*updateAnchor(
    signerKp,
    newCommitment,
    identityPda,
    protocolConfigPda,
    treasuryPda,
  );
  const rawAccountData = readAcct(identityPda);
  const decoded = decodeIdentityStateWeb3js(rawAccountData);
  expect(decoded.verification_count).to.equal(1);
  expect(decoded.trust_score).to.equal(196);
  */
});
