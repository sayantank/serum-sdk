/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  BitStructure,
  Blob,
  blob,
  Layout,
  offset,
  seq,
  struct,
  u32,
  u8,
  UInt,
} from "@solana/buffer-layout";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { Slab } from "./slab";
import {
  AccountFlags,
  FreeSlabNode,
  InnerSlabNode,
  LastFreeSlabNode,
  LeafSlabNode,
  LegacyMarketState,
  NonPermissionedMarketState,
  PermissionedMarketState,
  SlabHeader,
  SlabNode,
  UninitializedSlabNode,
} from "./state";

// ============================= Utility layouts =============================
class AccountFlagsLayout extends Layout<AccountFlags> {
  private _lower: BitStructure;
  private _upper: BitStructure;

  constructor(property?: string) {
    super(8, property);
    this._lower = new BitStructure(u32(), false);
    this._upper = new BitStructure(u32(), false);

    this.addBoolean("Initialized");
    this.addBoolean("Market");
    this.addBoolean("OpenOrders");
    this.addBoolean("RequestQueue");
    this.addBoolean("EventQueue");
    this.addBoolean("Bids");
    this.addBoolean("Asks");
    this.addBoolean("Disabled");
    this.addBoolean("Closed");
    this.addBoolean("Permissioned");
    this.addBoolean("CrankAuthorityRequired");
  }

  addBoolean(property: string) {
    if (this._lower.fields.length < 32) {
      this._lower.addBoolean(property);
    } else {
      this._upper.addBoolean(property);
    }
  }

  decode(b: Uint8Array, offset?: number | undefined): AccountFlags {
    const lowerDecoded = this._lower.decode(b, offset);
    const upperDecoded = this._upper.decode(
      b,
      (offset ? offset : 0) + this._lower.span
    );

    return { ...lowerDecoded, ...upperDecoded } as AccountFlags;
  }

  encode(
    src: AccountFlags,
    b: Uint8Array,
    offset?: number | undefined
  ): number {
    return (
      this._lower.encode(src, b, offset) +
      this._upper.encode(src, b, (offset ? offset : 0) + this._lower.span)
    );
  }
}
export function accountFlags(property?: string): AccountFlagsLayout {
  return new AccountFlagsLayout(property);
}

class PublicKeyLayout extends Layout<PublicKey> {
  constructor(property?: string) {
    super(32, property);
  }

  decode(b: Uint8Array, offset?: number | undefined): PublicKey {
    const start = offset ? offset : 0;
    const end = offset ? offset + this.span : this.span;
    return new PublicKey(b.slice(start, end));
  }

  encode(src: PublicKey, b: Uint8Array, offset?: number | undefined): number {
    b.set(src.toBuffer(), offset ? offset : 0);
    return this.span;
  }
}
export function publicKey(property?: string) {
  return new PublicKeyLayout(property);
}

class BNLayout extends Layout<BN> {
  constructor(span: number, property?: string) {
    super(span, property);
  }

  decode(b: Uint8Array, offset?: number | undefined): BN {
    const start = offset ? offset : 0;
    const end = offset ? offset + this.span : this.span;
    return new BN(b.slice(start, end));
  }

  encode(src: BN, b: Uint8Array, offset?: number | undefined): number {
    b.set(src.toArrayLike(Buffer, "le", 8), offset ? offset : 0);
    return this.span;
  }
}
export function u64(property?: string) {
  return new BNLayout(8, property);
}
export function u128(property?: string) {
  return new BNLayout(16, property);
}

class Zeros extends Blob {
  constructor(span: number, property?: string) {
    super(span, property);
  }

  decode(b: Uint8Array, offset?: number | undefined): Uint8Array {
    const slice = super.decode(b, offset);
    if (!slice.every((v) => v === 0)) {
      throw new Error("nonzero padding bytes");
    }
    return slice;
  }
}
export function zeros(span: number, property?: string) {
  return new Zeros(span, property);
}

// ============================= Market Layouts =============================

function baseMarketLayout() {
  return [
    accountFlags("accountFlags"),
    publicKey("address"),
    u64("vaultSignerNonce"),
    publicKey("baseMint"),
    publicKey("quoteMint"),
    publicKey("baseVault"),
    u64("baseDepositsTotal"),
    u64("baseFeesAccrued"),
    publicKey("quoteVault"),
    u64("quoteDepositsTotal"),
    u64("quoteFeesAccrued"),
    u64("quoteDustThreshold"),
    publicKey("requestQueue"),
    publicKey("eventQueue"),
    publicKey("bids"),
    publicKey("asks"),
    u64("baseLotSize"),
    u64("quoteLotSize"),
    u64("feeRateBps"),
  ];
}

export const LegacyMarketStateLayout = struct<Readonly<LegacyMarketState>>([
  blob(5),
  ...baseMarketLayout(),
  blob(7),
]);

export const NonPermissionedMarketStateLayout = struct<
  Readonly<NonPermissionedMarketState>
>([blob(5), ...baseMarketLayout(), u64("referrerRebatesAccrued"), blob(7)]);

export const PermissionedMarketStateLayout = struct<
  Readonly<PermissionedMarketState>
>([
  blob(5),
  ...baseMarketLayout(),
  u64("referrerRebatesAccrued"),
  publicKey("openOrdersAuthority"),
  publicKey("pruneAuthority"),
  publicKey("consumeEventsAuthority"),
  blob(992),
  blob(7),
]);

// ============================= Slab Layouts =============================

const SlabHeaderLayout = struct<SlabHeader>([
  u32("bumpIndex"),
  zeros(4),
  u32("freelistLength"),
  zeros(4),
  u32("freelistHead"),
  u32("rootNode"),
  u32("leafCount"),
  zeros(4),
]);

export enum SlabNodeType {
  Uninitialized = 0,
  Inner = 1,
  Leaf = 2,
  Free = 3,
  LastFree = 4,
}

const UninitializedNodeLayout = struct<UninitializedSlabNode>([
  u32("tag"),
  blob(68),
]);

const InnerNodeLayout = struct<InnerSlabNode>([
  u32("tag"),
  u32("prefixLen"),
  u128("key"),
  seq(u32(), 2, "children"),
  blob(40),
]);

const LeafNodeLayout = struct<LeafSlabNode>([
  u32("tag"),
  u8("ownerSlot"),
  u32("feeTier"),
  blob(2, "_padding"),
  u128("key"),
  publicKey("owner"),
  u64("quantity"),
  u64("clientOrderId"),
]);

const FreeNodeLayout = struct<FreeSlabNode>([
  u32("tag"),
  u32("next"),
  blob(64),
]);

const LastFreeNode = struct<LastFreeSlabNode>([u32("tag"), blob(68)]);

export class SlabNodeLayout extends Layout<SlabNode> {
  constructor() {
    super(68, "slabNode");
  }

  decode(b: Uint8Array): SlabNode {
    const tag = new UInt(4, "tag").decode(b);
    switch (tag) {
      case 0:
        return UninitializedNodeLayout.decode(b);
      case 1:
        return InnerNodeLayout.decode(b);
      case 2:
        return LeafNodeLayout.decode(b);
      case 3:
        return FreeNodeLayout.decode(b);
      case 4:
        return LastFreeNode.decode(b);
      default:
        throw new Error("invalid tag");
    }
  }

  encode(src: SlabNode, b: Uint8Array): number {
    switch (src.tag) {
      case 0:
        return UninitializedNodeLayout.encode(src, b);
      case 1:
        return InnerNodeLayout.encode(src as InnerSlabNode, b);
      case 2:
        return LeafNodeLayout.encode(src as LeafSlabNode, b);
      case 3:
        return FreeNodeLayout.encode(src as FreeSlabNode, b);
      case 4:
        return LastFreeNode.encode(src, b);
      default:
        throw new Error("invalid tag");
    }
  }
}
export function slabNode() {
  return new SlabNodeLayout();
}

export const SlabLayout = struct<Slab>([
  accountFlags("accountFlags"),
  SlabHeaderLayout,
  seq(
    slabNode(),
    offset(
      SlabHeaderLayout.layoutFor("bumpIndex") as unknown as Layout<number>,
      SlabHeaderLayout.offsetOf("bumpIndex")! - SlabHeaderLayout.span
    ),
    "nodes"
  ),
]);

// ============================= Queue Layouts =============================
