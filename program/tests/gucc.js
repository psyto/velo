const anchor = require("@coral-xyz/anchor");
const { expect } = require("chai");
const { createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } = require("@solana/spl-token");

describe("gucc", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Gucc;

  let mint = null;
  let userTokenAccount = null;
  const amountToMint = 1000;

  const eventId = "TOKYO-" + Date.now();
  const [eventPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("event"), Buffer.from(eventId)],
    program.programId
  );
  const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), eventPda.toBuffer()],
    program.programId
  );

  const [userPositionPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("position"), eventPda.toBuffer(), provider.publicKey.toBuffer()],
    program.programId
  );

  it("Setup Mint and User Account", async () => {
    mint = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.publicKey,
      null,
      6
    );

    userTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mint,
      provider.publicKey
    );

    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mint,
      userTokenAccount.address,
      provider.wallet.payer,
      1000000
    );
  });

  it("Initializes the event", async () => {
    await program.methods
      .initializeEvent(eventId, "Traffic > 20km/h", new anchor.BN(Date.now()), provider.publicKey)
      .accounts({
        congestionEvent: eventPda,
        authority: provider.publicKey,
        usdcMint: mint,
        vault: vaultPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const account = await program.account.congestionEvent.fetch(eventPda);
    expect(account.eventId).to.equal(eventId);
  });

  it("Mints Tokens (Buy)", async () => {
    await program.methods.mintTokens(new anchor.BN(amountToMint))
      .accounts({
        congestionEvent: eventPda,
        userPosition: userPositionPda,
        userTokenAccount: userTokenAccount.address,
        vault: vaultPda,
        user: provider.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId
      })
      .rpc();

    const pos = await program.account.userPosition.fetch(userPositionPda);
    expect(pos.yesAmount.toNumber()).to.equal(amountToMint);
    expect(pos.noAmount.toNumber()).to.equal(amountToMint);
  });

  it("Resolves Event (YES)", async () => {
    await program.methods.resolveEvent(true)
      .accounts({
        congestionEvent: eventPda,
        oracle: provider.publicKey
      })
      .rpc();

    const event = await program.account.congestionEvent.fetch(eventPda);
    expect(event.resolved).to.be.true;
    expect(event.outcome).to.be.true;
  });

  it("Redeems (Winner)", async () => {
    const balanceBefore = (await provider.connection.getTokenAccountBalance(userTokenAccount.address)).value.amount;

    await program.methods.redeem()
      .accounts({
        congestionEvent: eventPda,
        userPosition: userPositionPda,
        userTokenAccount: userTokenAccount.address,
        vault: vaultPda,
        user: provider.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .rpc();

    const balanceAfter = (await provider.connection.getTokenAccountBalance(userTokenAccount.address)).value.amount;
    // Should have received amountToMint back
    const diff = parseInt(balanceAfter) - parseInt(balanceBefore);
    console.log("Balance Diff:", diff);
    expect(diff).to.equal(amountToMint);

    const pos = await program.account.userPosition.fetch(userPositionPda);
    expect(pos.yesAmount.toNumber()).to.equal(0);
  });
});
