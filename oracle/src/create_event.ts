import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { Gucc } from "../../program/target/types/gucc";
import fs from "fs";
import os from "os";
import path from "path";

// Load IDL
const IDL = require("./gucc_idl.json");

async function main() {
    // Connect to local validator
    const connection = new Connection(
        process.env.SOLANA_RPC_URL ?? "http://127.0.0.1:8899",
        "confirmed",
    );

    // Load Wallet
    const home = os.homedir();
    const keypairPath = path.join(home, ".config/solana/id.json");
    const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf-8')));
    const walletKeypair = Keypair.fromSecretKey(secretKey);
    const wallet = new anchor.Wallet(walletKeypair);

    const provider = new anchor.AnchorProvider(connection, wallet, {});
    anchor.setProvider(provider);

    const program = new Program(IDL as unknown as Gucc, provider);

    console.log("Setting up event...");

    // 1. Create USDC Mint (Mock)
    const usdcMint = await createMint(
        connection,
        walletKeypair,
        wallet.publicKey,
        null,
        6 // 6 decimals like USDC
    );
    console.log("Created Mock USDC Mint:", usdcMint.toBase58());

    // 2. Mint some USDC to our wallet so we can trade
    const userTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        walletKeypair,
        usdcMint,
        wallet.publicKey
    );
    await mintTo(
        connection,
        walletKeypair,
        usdcMint,
        userTokenAccount.address,
        walletKeypair,
        10000 * 1000000 // 10,000 USDC
    );
    console.log("Minted 10,000 USDC to user wallet");

    // 3. Initialize Event
    const eventId = "TOKYO-SHIBUYA-" + Math.floor(Math.random() * 1000);
    const [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), Buffer.from(eventId)],
        program.programId
    );
    const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), eventPda.toBuffer()],
        program.programId
    );

    // Settlement in 1 hour
    const settlementTime = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);

    await program.methods
        .initializeEvent(
            eventId,
            "Shibuya High Congestion > 30km/h",
            settlementTime,
            wallet.publicKey // Oracle is us
        )
        .accounts({
            congestionEvent: eventPda,
            authority: wallet.publicKey,
            usdcMint: usdcMint,
            vault: vaultPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

    console.log(`✅ Event Created: ${eventId}`);
    console.log(`Address: ${eventPda.toBase58()}`);
}

main().catch(console.error);
