import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import { expect } from "chai";
import {
  ComputeBudget,
  type FailedTransactionMetadata,
  LiteSVM,
  type SimulatedTransactionInfo,
  TransactionMetadata,
} from "litesvm";

export let svm = new LiteSVM();

export const ownerKp = new Keypair();
export const adminKp = new Keypair();
export const user1Kp = new Keypair();

export const owner = ownerKp.publicKey;
export const admin = adminKp.publicKey;
export const user1 = user1Kp.publicKey;

export const initSolBalc = BigInt(LAMPORTS_PER_SOL) * BigInt(10);
console.log("initialize accounts by airdropping SOLs");

svm.airdrop(owner, initSolBalc);
svm.airdrop(admin, initSolBalc);
svm.airdrop(user1, initSolBalc);

export const iamAnchorAddr = new PublicKey(
  "GZYwTp2ozeuRA5Gof9vs4ya961aANcJBdUzB7LN6q4b2",
);
console.log("iamAnchorAddr:", iamAnchorAddr.toBase58());

export const registryAddr = new PublicKey(
  "6VBs3zr9KrfFPGd6j7aGBPQWwZa5tajVfA7HN6MMV9VW",
);
console.log("registryAddr:", registryAddr.toBase58());

export const verifierAddr = new PublicKey(
  "4F97jNoxQzT2qRbkWpW3ztC3Nz2TtKj3rnKG8ExgnrfV",
);
console.log("verifierAddr:", verifierAddr.toBase58());

export const SYSTEM_PROGRAM = new PublicKey("11111111111111111111111111111111"); //default or anchor.web3.SystemProgram.programId

export const acctIsNull = (account: PublicKey) => {
  const raw = svm.getAccount(account);
  expect(raw === null);
};
export const acctExists = (account: PublicKey) => {
  const raw = svm.getAccount(account);
  expect(raw !== null);
};
export const deployProgram = (computeMaxUnits?: bigint) => {
  console.log("deployProgram...");
  if (computeMaxUnits) {
    const computeBudget = new ComputeBudget();
    computeBudget.computeUnitLimit = computeMaxUnits;
    svm = svm.withComputeBudget(computeBudget);
  }
  const programPath = "target/deploy/iam_anchor.so";
  //# Dump a program from mainnet
  //solana program dump progAddr pyth.so --url mainnet-beta

  svm.addProgramFromFile(iamAnchorAddr, programPath);
  //return [programId];
};
deployProgram();
acctExists(iamAnchorAddr);
console.log("program deployment is successful");

//---------------==
export const sendTxns = (
  svm: LiteSVM,
  blockhash: string,
  ixs: TransactionInstruction[],
  signerKps: Keypair[],
  expectedError = "",
  programId = iamAnchorAddr,
) => {
  const tx = new Transaction();
  tx.recentBlockhash = blockhash;
  tx.add(...ixs);
  tx.sign(...signerKps); //first signature is considered "primary" and is used identify and confirm transactions.
  const simRes = svm.simulateTransaction(tx);
  const sendRes = svm.sendTransaction(tx);
  checkLogs(simRes, sendRes, programId, expectedError);
};
export const checkLogs = (
  simRes: FailedTransactionMetadata | SimulatedTransactionInfo,
  sendRes: TransactionMetadata | FailedTransactionMetadata,
  programId: PublicKey,
  expectedError = "",
  isVerbose = false,
) => {
  console.log("\nsimRes meta prettylogs:", simRes.meta().prettyLogs());
  if (isVerbose) {
    console.log("\nsimRes.meta().logs():", simRes.meta().logs());
  }
  /** simRes.meta():
      computeUnitsConsumed: [class computeUnitsConsumed],
      innerInstructions: [class innerInstructions],
      logs: [class logs],
      prettyLogs: [class prettyLogs],
      returnData: [class returnData],
      signature: [class signature],
      toString: [class toString], */
  if (sendRes instanceof TransactionMetadata) {
    expect(simRes.meta().logs()).eq(sendRes.logs());

    const logLength = simRes.meta().logs().length;
    //console.log("logLength:", logLength);
    //console.log("sendRes.logs()[logIndex]:", sendRes.logs()[logIndex]);
    expect(sendRes.logs()[logLength - 1]).eq(`Program ${programId} success`);
  } else {
    console.log("sendRes.err():", sendRes.err());
    console.log("sendRes.meta():", sendRes.meta());
    const errStr = sendRes.toString();
    console.log("sendRes.toString():", errStr);
    const pos = errStr.search("custom program error: 0x");
    console.log("pos:", pos);
    if (pos > -1) {
      let errCode = errStr.substring(pos + 22, pos + 26);
      if (errCode.slice(-1) === '"') {
        //console.log("last char:", errCode.slice(-1));
        errCode = errCode.slice(0, -1);
      }
      console.log("error code:", errCode, Number(errCode));
    }
    console.log(
      "find error here: https://docs.rs/solana-sdk/latest/solana_sdk/transaction/enum.TransactionError.html",
    );
    if (expectedError) {
      const foundErrorMesg = sendRes
        .toString()
        .includes(`custom program error: ${expectedError}`);
      console.log("found error?:", foundErrorMesg);
      expect(foundErrorMesg).eq(true);
    } else {
      throw new Error("This error is unexpected");
    }
  }
};
