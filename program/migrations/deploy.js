// Migration script for the GUCC congestion event prediction market.
//
// Usage:
//   anchor migrate
//
// This script is intentionally minimal — GUCC events are created dynamically
// via `initialize_event`, so there is no global state to pre-initialize.

const anchor = require("@coral-xyz/anchor");

module.exports = async function (provider) {
  anchor.setProvider(provider);

  const program = anchor.workspace.Gucc;
  console.log("GUCC program ID:", program.programId.toBase58());
  console.log("Migration complete — no global state to initialize.");
  console.log("Use `initialize_event` to create individual prediction events.");
};
