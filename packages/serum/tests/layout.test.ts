import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import { DEX_V3_PROGRAM_ID, SerumMarket } from "../src";

describe("layout tests", () => {
  const connection = new Connection(clusterApiUrl("mainnet-beta"));

  test("market layout", async () => {
    const market = await SerumMarket.load(
      connection,
      new PublicKey("A8YFbxQYFVqKZaoYJLLUVcQiWP7G2MeEgW5wsAQgMvFw"),
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
