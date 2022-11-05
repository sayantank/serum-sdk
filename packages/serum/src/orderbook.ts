import { Connection } from "@solana/web3.js";
import { SerumMarket } from "./market";
import { Slab, SlabType } from "./slab";
import { Order } from "./state";
import { getPriceFromKey } from "./utils";

export class Orderbook {
  readonly market: SerumMarket;
  readonly bidsSlab: Slab;
  readonly asksSlab: Slab;

  constructor(market: SerumMarket, bidsSlab: Slab, asksSlab: Slab) {
    this.market = market;
    this.bidsSlab = bidsSlab;
    this.asksSlab = asksSlab;
  }

  static async load(connection: Connection, market: SerumMarket) {
    const bidsSlab = await Slab.load(
      connection,
      market.marketState.bids,
      "bids"
    );
    const asksSlab = await Slab.load(
      connection,
      market.marketState.asks,
      "asks"
    );

    return new Orderbook(market, bidsSlab, asksSlab);
  }

  *orders(slabType: SlabType, descending = false): Generator<Order> {
    const slab = slabType === "bids" ? this.bidsSlab : this.asksSlab;
    for (const slabItem of slab.items(descending)) {
      const price = getPriceFromKey(slabItem.key);
      yield {
        orderId: slabItem.key,
        clientOrderId: slabItem.clientOrderId,
        openOrdersAddress: slabItem.owner,
        openOrdersSlot: slabItem.ownerSlot,
        price: this.market.priceLotsToNumber(price),
        priceLots: price,
        size: this.market.baseSizeLotsToNumber(slabItem.quantity),
        sizeLots: slabItem.quantity,
        side: slabType === "bids" ? "buy" : "sell",
        feeTier: slabItem.feeTier,
      };
    }
  }
}
