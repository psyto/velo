'use client';
import { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
    WalletModalProvider,
} from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

export const Providers: FC<{ children: ReactNode }> = ({ children }) => {
    // Default to localhost for development
    const endpoint = useMemo(() => "http://127.0.0.1:8899", []);

    const wallets = useMemo(
        () => [
            // Adapters are automatically detected in recent versions
        ],
        []
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
