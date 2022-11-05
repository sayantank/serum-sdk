import { Connection, PublicKey } from "@solana/web3.js";
import { OpenOrdersLayout } from "./layout";
import { OpenOrdersState } from "./state";

export class OpenOrders {
  readonly address: PublicKey;
  readonly data: OpenOrdersState;

  constructor(address: PublicKey, data: OpenOrdersState) {
    this.address = address;
    this.data = data;
  }

  static async findForOwner(
    connection: Connection,
    owner: PublicKey,
    dexProgramId: PublicKey
  ): Promise<OpenOrders[]> {
    const response = await connection.getProgramAccounts(dexProgramId, {
      filters: [
        {
          memcmp: {
            offset: OpenOrdersLayout.offsetOf("owner") ?? 0,
            bytes: owner.toBase58(),
          },
        },
        {
          dataSize: OpenOrdersLayout.span,
        },
      ],
    });

    return response.map((account) => {
      return new OpenOrders(
        account.pubkey,
        OpenOrdersLayout.decode(account.account.data)
      );
    });
  }

  static async findForMarketAndOwner(
    connection: Connection,
    market: PublicKey,
    owner: PublicKey,
    dexProgramId: PublicKey
  ): Promise<OpenOrders[]> {
    const response = await connection.getProgramAccounts(dexProgramId, {
      filters: [
        {
          memcmp: {
            offset: OpenOrdersLayout.offsetOf("market") ?? 0,
            bytes: market.toBase58(),
          },
        },
        {
          memcmp: {
            offset: OpenOrdersLayout.offsetOf("owner") ?? 0,
            bytes: owner.toBase58(),
          },
        },
        {
          dataSize: OpenOrdersLayout.span,
        },
      ],
    });
    return response.map((account) => {
      return new OpenOrders(
        account.pubkey,
        OpenOrdersLayout.decode(account.account.data)
      );
    });
  }
}
