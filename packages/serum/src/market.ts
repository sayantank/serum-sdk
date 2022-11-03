import { Connection, PublicKey } from "@solana/web3.js";
import {
  LegacyMarketStateLayout,
  NonPermissionedMarketStateLayout,
  PermissionedMarketStateLayout,
} from "./layout";
import {
  LegacyMarketState,
  NonPermissionedMarketState,
  PermissionedMarketState,
} from "./state";
import { getMintDecimals } from "./utils";

export type MarketStateType =
  | LegacyMarketState
  | NonPermissionedMarketState
  | PermissionedMarketState;

export class SerumMarket {
  readonly marketState: MarketStateType;

  readonly address: PublicKey;
  readonly dexProgramId: PublicKey;

  readonly baseDecimals: number;
  readonly quoteDecimals: number;

  constructor(
    marketState: MarketStateType,
    address: PublicKey,
    dexProgramId: PublicKey,
    baseDecimals: number,
    quoteDecimals: number
  ) {
    this.marketState = marketState;
    this.address = address;
    this.dexProgramId = dexProgramId;
    this.baseDecimals = baseDecimals;
    this.quoteDecimals = quoteDecimals;
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
  ) {
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
      address,
      dexProgramId,
      baseDecimals,
      quoteDecimals
    );
  }
}
