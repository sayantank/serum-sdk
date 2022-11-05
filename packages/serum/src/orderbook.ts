import { Connection, PublicKey } from "@solana/web3.js";
import { Slab } from "./slab";

export class Orderbook {
  readonly bidsSlab: Slab;
  readonly asksSlab: Slab;

  constructor(bidsSlab: Slab, asksSlab: Slab) {
    this.bidsSlab = bidsSlab;
    this.asksSlab = asksSlab;
  }

  static async load(
    connection: Connection,
    bidsAccount: PublicKey,
    asksAccount: PublicKey
  ) {
    const bidsSlab = await Slab.load(connection, bidsAccount);
    const asksSlab = await Slab.load(connection, asksAccount);

    return new Orderbook(bidsSlab, asksSlab);
  }
}
