"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const anchor = __importStar(require("@coral-xyz/anchor"));
const anchor_1 = require("@coral-xyz/anchor");
const web3_js_1 = require("@solana/web3.js");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
// Load IDL
const IDL = require("./gucc_idl.json");
async function main() {
    // Connect to local validator
    const connection = new web3_js_1.Connection("http://127.0.0.1:8899", "confirmed");
    // Load Wallet (Default Solana CLI wallet)
    const home = os_1.default.homedir();
    const keypairPath = path_1.default.join(home, ".config/solana/id.json");
    let wallet;
    if (fs_1.default.existsSync(keypairPath)) {
        const secretKey = Uint8Array.from(JSON.parse(fs_1.default.readFileSync(keypairPath, 'utf-8')));
        const keypair = web3_js_1.Keypair.fromSecretKey(secretKey);
        wallet = new anchor.Wallet(keypair);
    }
    else {
        console.log("No wallet found at default path, generating random.");
        wallet = new anchor.Wallet(web3_js_1.Keypair.generate());
    }
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    anchor.setProvider(provider);
    const program = new anchor_1.Program(IDL, provider);
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
                        }
                        catch (err) {
                            console.error(`Failed to resolve event ${account.eventId}:`, err);
                        }
                    }
                }
            }
        }
        catch (e) {
            console.error("Error in loop:", e);
        }
    };
    // Run immediately then interval
    await checkAndResolve();
    setInterval(checkAndResolve, 5000);
}
main().catch(console.error);
