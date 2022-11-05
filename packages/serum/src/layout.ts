/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  BitStructure,
  Blob,
  blob,
  Layout,
  seq,
  struct,
  u32,
  u8,
  UInt,
} from "@solana/buffer-layout";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import {
  AccountFlags,
  Event,
  EventFlags,
  EventQueueHeader,
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

class StringLayout extends Layout<string> {
  readonly value: string;

  constructor(s: string, property?: string) {
    super(s.length, property);
    this.value = s;
  }

  decode(b: Uint8Array, offset?: number): string {
    const s = Buffer.from(b).toString(
      "utf8",
      offset,
      (offset ? offset : 0) + this.span
    );
    if (s !== this.value) throw new Error(`Invalid string: ${s}`);

    return s;
  }

  encode(src: string, b: Uint8Array, offset?: number | undefined): number {
    if (src !== this.value)
      throw new Error(`Invalid string: ${src}. Should be ${this.value}`);

    b.set(Buffer.from(src, "utf-8"), offset ? offset : 0);

    return this.span;
  }
}
export function string(s: string, property?: string) {
  return new StringLayout(s, property);
}
export function serumHeadPadding() {
  return string("serum", "_headPadding");
}
export function serumTailPadding() {
  return string("padding", "_tailPadding");
}

class AccountFlagsLayout extends Layout<AccountFlags> {
  private _lower: BitStructure;
  private _upper: BitStructure;

  constructor(property?: string) {
    super(8, property);
    this._lower = new BitStructure(u32(), false);
    this._upper = new BitStructure(u32(), false);

    this.addBoolean("initialized");
    this.addBoolean("market");
    this.addBoolean("openOrders");
    this.addBoolean("requestQueue");
    this.addBoolean("eventQueue");
    this.addBoolean("bids");
    this.addBoolean("asks");
    this.addBoolean("disabled");
    this.addBoolean("closed");
    this.addBoolean("permissioned");
    this.addBoolean("crankAuthorityRequired");
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
  serumHeadPadding(),
  ...baseMarketLayout(),
  serumTailPadding(),
]);

export const NonPermissionedMarketStateLayout = struct<
  Readonly<NonPermissionedMarketState>
>([
  serumHeadPadding(),
  ...baseMarketLayout(),
  u64("referrerRebatesAccrued"),
  serumTailPadding(),
]);

export const PermissionedMarketStateLayout = struct<
  Readonly<PermissionedMarketState>
>([
  serumHeadPadding(),
  ...baseMarketLayout(),
  u64("referrerRebatesAccrued"),
  publicKey("openOrdersAuthority"),
  publicKey("pruneAuthority"),
  publicKey("consumeEventsAuthority"),
  blob(992),
  serumTailPadding(),
]);

// ============================= Slab Layouts =============================

export const SlabHeaderLayout = struct<SlabHeader>([
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
    super(72, "slabNode");
  }

  decode(b: Uint8Array, offset?: number): SlabNode {
    const o = offset ? offset : 0;
    const tag = new UInt(4, "tag").decode(b, o);
    switch (tag) {
      case 0:
        return UninitializedNodeLayout.decode(b, o);
      case 1:
        return InnerNodeLayout.decode(b, o);
      case 2:
        return LeafNodeLayout.decode(b, o);
      case 3:
        return FreeNodeLayout.decode(b, o);
      case 4:
        return LastFreeNode.decode(b, o);
      default:
        throw new Error("invalid tag");
    }
  }

  encode(src: SlabNode, b: Uint8Array, offset?: number | undefined): number {
    const o = offset ? offset : 0;
    switch (src.tag) {
      case 0:
        return UninitializedNodeLayout.encode(src, b, o);
      case 1:
        return InnerNodeLayout.encode(src as InnerSlabNode, b, o);
      case 2:
        return LeafNodeLayout.encode(src as LeafSlabNode, b, o);
      case 3:
        return FreeNodeLayout.encode(src as FreeSlabNode, b, o);
      case 4:
        return LastFreeNode.encode(src, b, o);
      default:
        throw new Error("invalid tag");
    }
  }
}
export function slabNode() {
  return new SlabNodeLayout();
}

// ============================= Queue Layouts =============================

class EventFlagsLayout extends Layout<EventFlags> {
  private bits: BitStructure;

  constructor(property?: string) {
    super(1, property);
    this.bits = new BitStructure(u8(), false);

    this.addBoolean("fill");
    this.addBoolean("out");
    this.addBoolean("bid");
    this.addBoolean("maker");
  }

  addBoolean(property: string) {
    this.bits.addBoolean(property);
  }

  decode(b: Uint8Array, offset?: number | undefined): EventFlags {
    const decoded = this.bits.decode(b, offset);

    return decoded as EventFlags;
  }

  encode(src: EventFlags, b: Uint8Array, offset?: number | undefined): number {
    return this.bits.encode(src, b, offset);
  }
}
export function eventFlags(property?: string) {
  return new EventFlagsLayout(property);
}

export const EventQueueHeaderLayout = struct<EventQueueHeader>([
  u32("head"),
  zeros(4),
  u32("count"),
  zeros(4),
  u32("seqNum"),
  zeros(4),
]);

export const EventLayout = struct<Event>([
  eventFlags(),
  u8("ownerSlot"),
  u8("feeTier"),
  blob(5),
  u64("nativeQuantityReleased"),
  u64("nativeQuantityPaid"),
  u64("nativeFeeOrRebate"),
  u128("orderId"),
  publicKey("owner"),
  u64("clientOrderId"),
]);
