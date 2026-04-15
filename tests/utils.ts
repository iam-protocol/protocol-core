import { web3 } from "@coral-xyz/anchor";

type PublicKey = web3.PublicKey;

//--------- iamAnchor
export const deriveIdentityPda = (
	user: PublicKey,
	iamAnchorProgId: PublicKey,
) =>
	web3.PublicKey.findProgramAddressSync(
		[Buffer.from("identity"), user.toBuffer()],
		iamAnchorProgId,
	);

export const deriveMintPda = (user: PublicKey, iamAnchorProgId: PublicKey) =>
	web3.PublicKey.findProgramAddressSync(
		[Buffer.from("mint"), user.toBuffer()],
		iamAnchorProgId,
	);

//--------- iamVerifier
export const generateNonce = (): number[] =>
	Array.from(web3.Keypair.generate().publicKey.toBytes());

export const deriveChallengePda = (
	challenger: PublicKey,
	nonce: number[],
	verifierProgId: PublicKey,
) =>
	web3.PublicKey.findProgramAddressSync(
		[Buffer.from("challenge"), challenger.toBuffer(), Buffer.from(nonce)],
		verifierProgId,
	);

export const deriveVerificationPda = (
	verifier: PublicKey,
	nonce: number[],
	verifierProgId: PublicKey,
) =>
	web3.PublicKey.findProgramAddressSync(
		[Buffer.from("verification"), verifier.toBuffer(), Buffer.from(nonce)],
		verifierProgId,
	);
