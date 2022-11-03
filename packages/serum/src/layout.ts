import { BitStructure, blob, Layout, struct, u32 } from "@solana/buffer-layout";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import {
  AccountFlags,
  LegacyMarketState,
  NonPermissionedMarketState,
  PermissionedMarketState,
} from "./state";

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
