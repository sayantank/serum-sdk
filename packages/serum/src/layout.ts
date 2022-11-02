import { BitStructure, blob, Layout, struct, u32 } from "@solana/buffer-layout";
import { AccountFlags, MarketStateV1 } from "./state";

export class AccountFlagsLayout extends Layout<AccountFlags> {
  private _lower: BitStructure;
  private _upper: BitStructure;

  constructor(property: string) {
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

export const MarketStateLayoutV1 = struct<Readonly<MarketStateV1>>([
  blob(5),
  new AccountFlagsLayout("accountFlags"),
]);
