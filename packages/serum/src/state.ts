import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export type AccountFlags = {
  Initialized: boolean;
  Market: boolean;
  OpenOrders: boolean;
  RequestQueue: boolean;
  EventQueue: boolean;
  Bids: boolean;
  Asks: boolean;
  Disabled: boolean;
  Closed: boolean;
  Permissioned: boolean;
  CrankAuthorityRequired: boolean;
};

type BaseMarketState = {
  _headPadding: Uint8Array;
  address: PublicKey;
  accountFlags: AccountFlags;
  vaultSignerNonce: BN;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  baseVault: PublicKey;
  baseDepositsTotal: BN;
  baseFeesAccrued: BN;
  quoteVault: PublicKey;
  quoteDepositsTotal: BN;
  quoteFeesAccrued: BN;
  quoteDustThreshold: BN;
  requestQueue: PublicKey;
  eventQueue: PublicKey;
  bids: PublicKey;
  asks: PublicKey;
  baseLotSize: BN;
  quoteLotSize: BN;
  feeRateBps: BN;
  _tailPadding: Uint8Array;
};

/**
 * Legacy MarketState
 */
export type LegacyMarketState = BaseMarketState;

/**
 * Non-permissioned MarketState
 */
export type NonPermissionedMarketState = LegacyMarketState & {
  referrerRebatesAccrued: BN;
};

/**
 * Permissioned MarketState
 */
export type PermissionedMarketState = NonPermissionedMarketState & {
  openOrdersAuthority: PublicKey;
  pruneAuthority: PublicKey;
  consumeEventsAuthority: PublicKey;
  _padding: Uint8Array;
};
