import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import { DEX_V3_PROGRAM_ID, SerumMarket } from "../src";

const BTC_USDC_MARKET = new PublicKey(
  "A8YFbxQYFVqKZaoYJLLUVcQiWP7G2MeEgW5wsAQgMvFw"
);

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
  });
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
