import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import { DEX_V3_PROGRAM_ID, SerumMarket } from "../src";

const BTC_USDC_MARKET = new PublicKey(
  "A8YFbxQYFVqKZaoYJLLUVcQiWP7G2MeEgW5wsAQgMvFw"
);
const BTC_MINT = new PublicKey("9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E");
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

describe("layout tests", () => {
  const connection = new Connection(clusterApiUrl("mainnet-beta"));

  test("market layout", async () => {
    const market = await SerumMarket.load(
      connection,
      BTC_USDC_MARKET,
      DEX_V3_PROGRAM_ID
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
