import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export type AccountFlags = {
  initialized: boolean;
  market: boolean;
  openOrders: boolean;
  requestQueue: boolean;
  eventQueue: boolean;
  bids: boolean;
  asks: boolean;
  disabled: boolean;
  closed: boolean;
  permissioned: boolean;
  crankAuthorityRequired: boolean;
};

type AccountPadding = {
  _headPadding: string;
  _tailPadding: string;
};

type BaseMarketState = {
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
};

/**
 * Legacy MarketState
 */
export type LegacyMarketState = BaseMarketState & AccountPadding;

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

export type SlabHeader = {
  bumpIndex: number;
  _bumpIndexPadding: Uint8Array;
  freeListLength: number;
  _freeListLengthPadding: Uint8Array;
  freeListHead: number;
  rootNode: number;
  leafCount: number;
  _leafCountPadding: Uint8Array;
};

export type UninitializedSlabNode = {
  tag: number;
  _padding: Uint8Array;
};

export type InnerSlabNode = {
  tag: number;
  prefixLen: number;
  key: BN;
  children: number[];
  _padding: Uint8Array;
};

export type LeafSlabNode = {
  tag: number;
  ownerSlot: number;
  feeTier: number;
  _padding: Uint8Array;
  key: BN;
  owner: PublicKey;
  quantity: BN;
  clientOrderId: BN;
};

export type FreeSlabNode = {
  tag: number;
  next: number;
  _padding: Uint8Array;
};

export type LastFreeSlabNode = {
  tag: number;
  _padding: Uint8Array;
};

export type SlabNode =
  | UninitializedSlabNode
  | InnerSlabNode
  | LeafSlabNode
  | FreeSlabNode
  | LastFreeSlabNode;

export type EventQueueHeader = {
  head: number;
  _headPadding: Uint8Array;
  count: number;
  _countPadding: Uint8Array;
  seqNum: number;
  _seqNumPadding: Uint8Array;
};

export type EventFlags = {
  fill: boolean;
  out: boolean;
  bid: boolean;
  maker: boolean;
};

export type Event = {
  eventFlags: EventFlags;
  ownerSlot: number;
  feeTier: number;
  _padding: Uint8Array;
  nativeQuantityReleased: BN;
  nativeQuantityPaid: BN;
  nativeFeeOrRebate: BN;
  orderId: BN;
  owner: PublicKey;
  clientOrderId: BN;
};

export type OpenOrdersState = {
  accountFlags: AccountFlags;
  market: PublicKey;
  owner: PublicKey;
  baseTokenFree: BN;
  baseTokenTotal: BN;
  quoteTokenFree: BN;
  quoteTokenTotal: BN;
  freeSlotBits: BN;
  isBidBits: BN;
  orders: BN[];
  clientIds: BN[];
  referrerRebatesAccrued: BN;
} & AccountPadding;

export type Order = {
  orderId: BN;
  openOrdersSlot: number;
  openOrdersAddress: PublicKey;
  price: number;
  priceLots: BN;
  size: number;
  sizeLots: BN;
  side: "buy" | "sell";
  feeTier: number;
  clientId: BN;
};
