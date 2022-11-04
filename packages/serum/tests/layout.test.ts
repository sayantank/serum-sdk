import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import { DEX_V3_DEVNET_PROGRAM_ID, SerumMarket } from "../src";

const BTC_USDC_MARKET = new PublicKey(
  "FYz52ugfgU3K6qmHr6zBE1KCiqk86hzrqtcNJh6seeFe"
);
const BTC_MINT = new PublicKey("BrwwxApRNfCqH6ZyLhvimFpiZsqqs9UQ6wPWuNAKPaaY");
const USDC_MINT = new PublicKey("HbGPWHiqpj7fYn5khwxuX99bT3AFGfNgQbEeekqoMj1z");

describe("layout tests", () => {
  const connection = new Connection(clusterApiUrl("devnet"));

  test("market layout", async () => {
    const market = await SerumMarket.load(
      connection,
      BTC_USDC_MARKET,
      DEX_V3_DEVNET_PROGRAM_ID
    );

    expect(market.marketState.accountFlags).toEqual(
      InitializedMarketAccountFlags
    );
    expect(market.marketState.address).toEqual(BTC_USDC_MARKET);
    expect(market.marketState.baseMint).toEqual(BTC_MINT);
    expect(market.marketState.quoteMint).toEqual(USDC_MINT);

    // TODO: add checks for queues, slabs, etc
  });

  // TODO: add tests for other market types (permissioned, legacy maybe not lol)
});

const InitializedMarketAccountFlags = {
  Initialized: true,
  Market: true,
  OpenOrders: false,
  RequestQueue: false,
  EventQueue: false,
  Bids: false,
  Asks: false,
  Disabled: false,
  Closed: false,
  Permissioned: false,
  CrankAuthorityRequired: false,
};
