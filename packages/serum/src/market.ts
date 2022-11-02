import { Connection, PublicKey } from "@solana/web3.js";
import { MarketStateLayoutV1 } from "./layout";
import { MarketStateV1 } from "./state";

export class SerumMarket {
  readonly address: PublicKey;
  readonly dexProgramId: PublicKey;
  readonly marketState: MarketStateV1;

  constructor(
    address: PublicKey,
    dexProgramId: PublicKey,
    marketState: MarketStateV1
  ) {
    this.address = address;
    this.dexProgramId = dexProgramId;
    this.marketState = marketState;
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

    const marketState = MarketStateLayoutV1.decode(accountInfo.data);

    return new SerumMarket(address, dexProgramId, marketState);
  }
}
