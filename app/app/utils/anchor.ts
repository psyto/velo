import { Program, AnchorProvider, Idl, setProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import IDL from "./gucc.json";

export const PROGRAM_ID = new PublicKey("CqpC97ghGKUrTKQEmQ9JHrre6RrgBehytwb1MwPHwMLW");

export const getProgram = (connection: Connection, wallet: any) => {
    const provider = new AnchorProvider(connection, wallet, {});
    setProvider(provider);
    return new Program(IDL as Idl, provider);
};
