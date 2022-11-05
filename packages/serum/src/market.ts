import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { LEGACY_PROGRAM_IDS } from "./ids";
import {
  LegacyMarketStateLayout,
  NonPermissionedMarketStateLayout,
  PermissionedMarketStateLayout,
} from "./layout";
import { OpenOrders } from "./openOrders";
import { Orderbook } from "./orderbook";
import { EventQueue } from "./queue";
import {
  LegacyMarketState,
  NonPermissionedMarketState,
  Order,
  PermissionedMarketState,
} from "./state";
import { divideBNToNumber, getMintDecimals } from "./utils";

export type MarketStateType =
  | LegacyMarketState
  | NonPermissionedMarketState
  | PermissionedMarketState;

export type MarketLayoutType =
  | typeof LegacyMarketStateLayout
  | typeof NonPermissionedMarketStateLayout
  | typeof PermissionedMarketStateLayout;

export class SerumMarket {
  readonly marketState: MarketStateType;
  readonly marketLayout: MarketLayoutType;

  readonly address: PublicKey;
  readonly dexProgramId: PublicKey;

  readonly baseDecimals: number;
  readonly quoteDecimals: number;

  readonly baseSplTokenMultiplier: BN;
  readonly quoteSplTokenMultiplier: BN;

  constructor(
    marketState: MarketStateType,
    marketLayout: MarketLayoutType,
    address: PublicKey,
    dexProgramId: PublicKey,
    baseDecimals: number,
    quoteDecimals: number
  ) {
    if (LEGACY_PROGRAM_IDS.some((p) => p.equals(dexProgramId))) {
      throw new Error("Legacy programs are not supported");
    }

    this.marketState = marketState;
    this.marketLayout = marketLayout;
    this.address = address;
    this.dexProgramId = dexProgramId;
    this.baseDecimals = baseDecimals;
    this.quoteDecimals = quoteDecimals;

    this.baseSplTokenMultiplier = new BN(10).pow(new BN(baseDecimals));
    this.quoteSplTokenMultiplier = new BN(10).pow(new BN(quoteDecimals));
  }

  static async getMarketLayout(connection: Connection, address: PublicKey) {
    const accountInfo = await connection.getAccountInfo(address);

    if (accountInfo === null) {
      throw new Error("Market not found");
    }

    switch (accountInfo.data.length) {
      case LegacyMarketStateLayout.span:
        return LegacyMarketStateLayout;
      case NonPermissionedMarketStateLayout.span:
        return NonPermissionedMarketStateLayout;
      case PermissionedMarketStateLayout.span:
        return PermissionedMarketStateLayout;
      default:
        throw new Error("Invalid market layout");
    }
  }

  static async load(
    connection: Connection,
    address: PublicKey,
    dexProgramId: PublicKey
  ): Promise<SerumMarket> {
    const accountInfo = await connection.getAccountInfo(address);

    if (accountInfo === null) {
      throw new Error("Market not found");
    }

    if (!accountInfo.owner.equals(dexProgramId)) {
      throw new Error("Market is not owned by the dex program");
    }

    const marketLayout = await this.getMarketLayout(connection, address);

    const marketState = marketLayout.decode(accountInfo.data);

    const [baseDecimals, quoteDecimals] = await Promise.all([
      getMintDecimals(connection, marketState.baseMint),
      getMintDecimals(connection, marketState.quoteMint),
    ]);

    return new SerumMarket(
      marketState,
      marketLayout,
      address,
      dexProgramId,
      baseDecimals,
      quoteDecimals
    );
  }

  priceLotsToNumber(price: BN): number {
    const num = price
      .mul(this.marketState.quoteLotSize)
      .mul(this.baseSplTokenMultiplier);
    const den = this.marketState.baseLotSize.mul(this.quoteSplTokenMultiplier);

    return divideBNToNumber(num, den);
  }

  priceNumberToLots(price: number): BN {
    return new BN(
      Math.round(
        (price *
          Math.pow(10, this.quoteDecimals) *
          this.marketState.baseLotSize.toNumber()) /
          (Math.pow(10, this.baseDecimals) *
            this.marketState.quoteLotSize.toNumber())
      )
    );
  }

  baseSizeLotsToNumber(size: BN): number {
    return divideBNToNumber(
      size.mul(this.marketState.baseLotSize),
      this.baseSplTokenMultiplier
    );
  }

  baseSizeNumberToLots(size: number): BN {
    const native = new BN(Math.round(size * Math.pow(10, this.baseDecimals)));
    return native.div(this.marketState.baseLotSize);
  }

  quoteSizeLotsToNumber(size: BN): number {
    return divideBNToNumber(
      size.mul(this.marketState.quoteLotSize),
      this.quoteSplTokenMultiplier
    );
  }

  quoteSizeNumberToLots(size: number): BN {
    const native = new BN(Math.round(size * Math.pow(10, this.quoteDecimals)));
    return native.div(this.marketState.quoteLotSize);
  }

  loadOrderbook(connection: Connection): Promise<Orderbook> {
    return Orderbook.load(connection, this);
  }

  loadEventQueue(connection: Connection): Promise<EventQueue> {
    return EventQueue.load(connection, this.marketState.eventQueue);
  }

  loadOpenOrders(
    connection: Connection,
    owner: PublicKey
  ): Promise<OpenOrders[]> {
    return OpenOrders.findForMarketAndOwner(
      connection,
      this.address,
      owner,
      this.dexProgramId
    );
  }

  async loadOrders(connection: Connection, owner: PublicKey): Promise<Order[]> {
    const [orderbook, openOrders] = await Promise.all([
      this.loadOrderbook(connection),
      this.loadOpenOrders(connection, owner),
    ]);

    const allOrders = [
      ...orderbook.orders("bids"),
      ...orderbook.orders("asks"),
    ];

    return allOrders.filter((order) =>
      openOrders.some((oo) => oo.address.equals(order.openOrdersAddress))
    );
  }
}
