import BN from "bn.js";
import { struct, u16 } from "@solana/buffer-layout";
import { u64 } from "../layout";
import {
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { encodeInstruction } from "../utils";

export type InitializeMarketInstructionData = {
  baseLotSize: BN;
  quoteLotSize: BN;
  feeRateBps: number;
  vaultSignerNonce: BN;
  quoteDustThreshold: BN;
};

const dataLayout = struct<InitializeMarketInstructionData>([
  u64("baseLotSize"),
  u64("quoteLotSize"),
  u16("feeRateBps"),
  u64("vaultSignerNonce"),
  u64("quoteDustThreshold"),
]);

export type InitializeMarketInstructionAccounts = {
  market: PublicKey;
  requestQueue: PublicKey;
  eventQueue: PublicKey;
  bids: PublicKey;
  asks: PublicKey;
  baseVault: PublicKey;
  quoteVault: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  dexProgramId: PublicKey;
  openOrdersAuthority?: PublicKey;
  pruneAuthority?: PublicKey;
  consumeEventsAuthority?: PublicKey;
};

export function createInitializeMarketInstruction(
  accounts: InitializeMarketInstructionAccounts,
  data: InitializeMarketInstructionData
): TransactionInstruction {
  const keys = [
    { pubkey: accounts.market, isSigner: false, isWritable: true },
    { pubkey: accounts.requestQueue, isSigner: false, isWritable: true },
    { pubkey: accounts.eventQueue, isSigner: false, isWritable: true },
    { pubkey: accounts.bids, isSigner: false, isWritable: true },
    { pubkey: accounts.asks, isSigner: false, isWritable: true },
    { pubkey: accounts.baseVault, isSigner: false, isWritable: true },
    { pubkey: accounts.quoteVault, isSigner: false, isWritable: true },
    { pubkey: accounts.baseMint, isSigner: false, isWritable: false },
    { pubkey: accounts.quoteMint, isSigner: false, isWritable: false },
    {
      pubkey: accounts.openOrdersAuthority
        ? accounts.quoteMint
        : SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ]
    .concat(
      accounts.openOrdersAuthority
        ? [
            {
              pubkey: accounts.openOrdersAuthority,
              isSigner: false,
              isWritable: false,
            },
          ]
        : []
    )
    .concat(
      accounts.openOrdersAuthority && accounts.pruneAuthority
        ? [
            {
              pubkey: accounts.pruneAuthority,
              isSigner: false,
              isWritable: false,
            },
          ]
        : []
    )
    .concat(
      accounts.openOrdersAuthority && accounts.consumeEventsAuthority
        ? [
            {
              pubkey: accounts.consumeEventsAuthority,
              isSigner: false,
              isWritable: false,
            },
          ]
        : []
    );

  const dataBuffer = Buffer.alloc(dataLayout.span);
  dataLayout.encode(data, dataBuffer);

  return new TransactionInstruction({
    keys,
    programId: accounts.dexProgramId,
    data: encodeInstruction(0, 0, dataBuffer),
  });
}
