import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import fs from "fs";
import os from "os";
import path from "path";

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error("Usage: npx ts-node src/faucet.ts <YOUR_WALLET_ADDRESS>");
        process.exit(1);
    }
    const targetAddress = new PublicKey(args[0]);

    // Connect to local validator
    const connection = new Connection("http://127.0.0.1:8899", "confirmed");

    // Load Admin Wallet (Mint Authority)
    const home = os.homedir();
    const keypairPath = path.join(home, ".config/solana/id.json");
    const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf-8')));
    const adminKeypair = Keypair.fromSecretKey(secretKey);

    // Hardcoded Mint from previous step (We have to find it or fetch from event)
    // NOTE: In a real scenario, we'd store this. For now, we'll fetch the event to find the mint.
    // Load IDL
    const IDL = require("./gucc_idl.json");
    const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(adminKeypair), {});
    const program = new Program(IDL, provider);

    // Fetch all events to find the mint (assuming single mint for simplicity or just take the first one)
    // @ts-ignore
    const events = await program.account.congestionEvent.all();
    if (events.length === 0) {
        console.error("No events found. Run create_event.ts first.");
        return;
    }

    // Use the mint from the first event (assuming common mint or random one created in create_event)
    const usdcMint = new PublicKey(events[0].account.usdcMint);
    console.log(`Using Mock USDC Mint: ${usdcMint.toBase58()}`);

    // Create ATA for Target
    const targetATA = await getOrCreateAssociatedTokenAccount(
        connection,
        adminKeypair,
        usdcMint,
        targetAddress
    );

    // Mint tokens
    const amount = 1000 * 1000000; // 1000 USDC
    await mintTo(
        connection,
        adminKeypair,
        usdcMint,
        targetATA.address,
        adminKeypair, // Authority
        amount
    );

    console.log(`✅ Sent 1000 Mock USDC to ${targetAddress.toBase58()}`);
    console.log(`ATA: ${targetATA.address.toBase58()}`);
}

main().catch(console.error);
