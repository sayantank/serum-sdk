import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import { DEX_V3_DEVNET_PROGRAM_ID, SerumMarket } from "../src";

const USER = new PublicKey("FapcF2VpcvWNVYzG6KUj79iJvmCeo7kpsCaCNkDTkoZb");
const BTC_USDC_MARKET = new PublicKey(
  "gNsLX6xNx3g4MZEJyd3rD55UnjkrFMmFEf5waKeMWUo"
);
const BTC_MINT = new PublicKey("4pD52zMibzpWGb24Ua19oixmHPupj5WAHCfYXujYfUVW");
const USDC_MINT = new PublicKey("3biExJNbE4dxtN44FwD4V1xeEDVktYDVxU1rTWb7SfM2");

describe("layout tests", () => {
  const connection = new Connection(clusterApiUrl("devnet"));

  test("market layout", async () => {
    const market = await SerumMarket.load(
      connection,
      BTC_USDC_MARKET,
      DEX_V3_DEVNET_PROGRAM_ID
    );

    expect(market.marketState.address).toEqual(BTC_USDC_MARKET);
    expect(market.marketState.baseMint).toEqual(BTC_MINT);
    expect(market.marketState.quoteMint).toEqual(USDC_MINT);

    // TODO: add checks for queues, slabs, etc

    const eventQueue = await market.loadEventQueue(connection);
    expect([...eventQueue.events()].length).toEqual(1);

    const openOrders = await market.loadOpenOrders(connection, USER);
    expect(openOrders.length).toEqual(1);
    expect(openOrders[0].data.owner).toEqual(USER);
    expect(openOrders[0].data.market).toEqual(BTC_USDC_MARKET);

    const orders = await market.loadOrders(connection, USER);
    expect(orders.length).toEqual(1);
    expect(orders[0].price).toEqual(12.5);
    expect(orders[0].side).toEqual("buy");
    expect(orders[0].size).toEqual(10);
  });

  // TODO: add tests for other market types (permissioned, legacy maybe not lol)
});
