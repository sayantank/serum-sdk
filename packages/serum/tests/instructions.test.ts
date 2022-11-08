import { Connection, Keypair, Transaction } from "@solana/web3.js";
import {
  getInitializeMarketInstructions,
  LOCALHOST,
  LOCAL_DEX_PROGRAM,
} from "./utils";
import BN from "bn.js";
import { createInitializeMarketInstruction } from "../src";

describe("instructions tests", () => {
  const connection = new Connection(LOCALHOST);
  const payer = Keypair.generate();

  beforeAll(async () => {
    const airdropSig = await connection.requestAirdrop(
      payer.publicKey,
      2_000_000_000
    );
    await connection.confirmTransaction(airdropSig);
  });

  test("initialize market", async () => {
    const lotSizeExponent = 3;
    const tickSizeExponent = 2;
    const baseDecimals = 6;
    const quoteDecimals = 6;

    const {
      marketAccounts,
      vaultOwnerNonce,
      marketInstructions,
      marketSigners,
      tokenInstructions,
      tokenSigners,
    } = await getInitializeMarketInstructions(connection, payer, {
      dexProgramId: LOCAL_DEX_PROGRAM,
      baseDecimals,
      quoteDecimals,
    });

    let baseLotSize: number;
    let quoteLotSize: number;
    if (lotSizeExponent > 0) {
      baseLotSize = Math.round(
        10 ** baseDecimals * Math.pow(10, -1 * tickSizeExponent)
      );
      quoteLotSize = Math.round(
        10 ** quoteDecimals *
          Math.pow(10, -1 * lotSizeExponent) *
          Math.pow(10, -1 * tickSizeExponent)
      );
    } else {
      throw new Error("Invalid Lot Size");
    }

    const ix = createInitializeMarketInstruction(
      {
        market: marketAccounts.market.publicKey,
        requestQueue: marketAccounts.requestQueue.publicKey,
        eventQueue: marketAccounts.eventQueue.publicKey,
        bids: marketAccounts.bids.publicKey,
        asks: marketAccounts.asks.publicKey,
        baseVault: marketAccounts.baseVault.publicKey,
        quoteVault: marketAccounts.quoteVault.publicKey,
        baseMint: marketAccounts.baseMint.publicKey,
        quoteMint: marketAccounts.quoteMint.publicKey,
        dexProgramId: LOCAL_DEX_PROGRAM,
      },
      {
        baseLotSize: new BN(baseLotSize),
        quoteLotSize: new BN(quoteLotSize),
        feeRateBps: 150,
        quoteDustThreshold: new BN(500),
        vaultSignerNonce: vaultOwnerNonce,
      }
    );

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    const tx1 = new Transaction({
      feePayer: payer.publicKey,
      blockhash,
      lastValidBlockHeight,
    }).add(...tokenInstructions);
    tx1.partialSign(payer, ...tokenSigners);

    const tx1Sig = await connection.sendRawTransaction(tx1.serialize());
    await connection.confirmTransaction({
      signature: tx1Sig,
      blockhash,
      lastValidBlockHeight,
    });

    const tx = new Transaction({
      feePayer: payer.publicKey,
      blockhash,
      lastValidBlockHeight,
    }).add(...marketInstructions, ix);
    tx.partialSign(payer, ...marketSigners);

    const txSig = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction({
      signature: txSig,
      blockhash,
      lastValidBlockHeight,
    });

    console.log("initialize market tx sig", txSig);
  });
});
