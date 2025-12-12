'use client';
import { useState, useEffect } from 'react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { getProgram } from '../app/utils/anchor';
import { BN, web3 } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

import { Event } from './MapInner';
import * as token from '@solana/spl-token';

export default function MarketDashboard({ event }: { event: Event | null }) {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const [amount, setAmount] = useState(10);
    const [loading, setLoading] = useState(false);
    const [onChainData, setOnChainData] = useState<any>(null);

    useEffect(() => {
        if (!event || !wallet) return;
        const fetchDetails = async () => {
            const program = getProgram(connection, wallet);
            try {
                // @ts-ignore
                const data = await program.account.congestionEvent.fetch(new PublicKey(event.publicKey));
                setOnChainData(data);
            } catch (e) {
                console.error(e);
            }
        };
        fetchDetails();
    }, [event, wallet, connection]);

    if (!event) return (
        <div className="h-full flex items-center justify-center bg-gray-800 text-gray-400 rounded-lg p-8">
            <p>Select a Congestion Zone on the map to start trading</p>
        </div>
    );

    const handleMint = async () => {
        if (!wallet || !event || !onChainData) return;
        setLoading(true);
        try {
            const program = getProgram(connection, wallet);
            const eventPda = new PublicKey(event.publicKey);

            const [userPositionPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("position"), eventPda.toBuffer(), wallet.publicKey.toBuffer()],
                program.programId
            );

            const usdcMint = onChainData.usdcMint;
            // Get user ATA
            const userTokenAccount = await token.getAssociatedTokenAddress(
                usdcMint,
                wallet.publicKey
            );

            // Note: In real app, we check if ATA exists, if not we create it (or add instruction).
            // Here we assume it exists (minted in test or faucet).

            // @ts-ignore
            await program.methods.mintTokens(new BN(amount))
                .accounts({
                    congestionEvent: eventPda,
                    userPosition: userPositionPda,
                    userTokenAccount: userTokenAccount,
                    vault: onChainData.vault,
                    user: wallet.publicKey,
                    tokenProgram: token.TOKEN_PROGRAM_ID,
                    systemProgram: web3.SystemProgram.programId
                })
                .rpc();

            alert("Successfully bought positions!");
        } catch (err) {
            console.error(err);
            alert("Transaction failed. Do you have USDC?");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-gray-900 text-white rounded-lg shadow-xl border border-gray-700">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">{event.id}</h2>
                    <p className="text-gray-400 text-sm mt-1">{event.description}</p>
                </div>
                {onChainData?.resolved ?
                    <span className="px-2 py-1 bg-red-900 text-red-200 text-xs rounded">Resolved</span> :
                    <span className="px-2 py-1 bg-green-900 text-green-200 text-xs rounded">Active</span>
                }
            </div>

            <div className="bg-gray-800 p-4 rounded mb-6 border border-gray-700/50">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-gray-500 uppercase">Settlement Time</p>
                        <p className="font-mono">{new Date(event.settlementTime * 1000).toLocaleTimeString()}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase">Oracle Status</p>
                        <p className="text-green-400 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Live Feed
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="text-sm text-gray-400 block mb-2">Investment Amount (Units)</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(Number(e.target.value))}
                            className="w-full p-3 bg-gray-950 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        <span className="absolute right-3 top-3 text-gray-500">USDC</span>
                    </div>
                </div>

                <button
                    onClick={handleMint}
                    disabled={!wallet || loading || onChainData?.resolved}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20"
                >
                    {loading ? 'Processing...' : 'Trade Positions'}
                </button>
                <p className="text-xs text-gray-500 text-center">
                    Purchase creates <strong className="text-white">YES</strong> + <strong className="text-white">NO</strong> tokens.
                </p>

                {!wallet && (
                    <div className="text-center p-2 bg-yellow-900/20 text-yellow-500 text-sm rounded">
                        Please connect wallet to trade
                    </div>
                )}
            </div>
        </div>
    );
}
