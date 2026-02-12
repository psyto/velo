import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, Keypair } from "@solana/web3.js";
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

    // Load Wallet (Default Solana CLI wallet)
    const home = os.homedir();
    const keypairPath = path.join(home, ".config/solana/id.json");
    let wallet: anchor.Wallet;

    if (fs.existsSync(keypairPath)) {
        const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf-8')));
        const keypair = Keypair.fromSecretKey(secretKey);
        wallet = new anchor.Wallet(keypair);
    } else {
        console.log("No wallet found at default path, generating random.");
        wallet = new anchor.Wallet(Keypair.generate());
    }

    const provider = new anchor.AnchorProvider(connection, wallet, {});
    anchor.setProvider(provider);

    const program = new Program(IDL, provider);

    console.log(`Oracle Service started. Oracle Public Key: ${wallet.publicKey.toBase58()}`);
    console.log("Watching for events...");

    const checkAndResolve = async () => {
        try {
            // @ts-ignore
            const events = await program.account.congestionEvent.all();

            const now = Math.floor(Date.now() / 1000);

            for (const { publicKey, account } of events) {
                // If the event expects THIS oracle and is not resolved
                if (account.oracle.toBase58() === wallet.publicKey.toBase58() && !account.resolved) {

                    console.log(`Found pending event: ${account.eventId}. Settlement: ${account.settlementTime.toString()}, Now: ${now}`);

                    if (account.settlementTime.toNumber() <= now) {
                        console.log(`Time reached. Resolving event ${account.eventId}...`);

                        // Mock Data Fetching
                        // Parse description or ID to determine outcome if it was real
                        // e.g. "Traffic > 20km/h"
                        const mockSpeed = Math.floor(Math.random() * 40);
                        const threshold = 20; // Hardcoded for demo
                        const outcome = mockSpeed > threshold; // High congestion?

                        console.log(`Fetched Data: Speed=${mockSpeed}km/h (Threshold: ${threshold}). Outcome=${outcome}`);

                        try {
                            // @ts-ignore
                            await program.methods.resolveEvent(outcome)
                                .accounts({
                                    congestionEvent: publicKey,
                                    oracle: wallet.publicKey,
                                })
                                .rpc();

                            console.log(`✅ Successfully resolved event ${account.eventId}`);
                        } catch (err) {
                            console.error(`Failed to resolve event ${account.eventId}:`, err);
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Error in loop:", e);
        }
    };

    // Run immediately then interval
    await checkAndResolve();
    setInterval(checkAndResolve, 5000);
}

main().catch(console.error);
