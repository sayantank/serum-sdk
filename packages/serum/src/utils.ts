import { Connection, ParsedAccountData, PublicKey } from "@solana/web3.js";
import { MarketStateType } from "./market";
import {
  LegacyMarketState,
  NonPermissionedMarketState,
  PermissionedMarketState,
} from "./state";

export function throwIfNull<T>(
  value: T | null,
  message = "account not found"
): T {
  if (value === null) {
    throw new Error(message);
  }
  return value;
}

export async function getMintDecimals(connection: Connection, mint: PublicKey) {
  const { value } = throwIfNull(
    await connection.getParsedAccountInfo(mint),
    "Mint not found"
  );

  if (value?.data instanceof Buffer) throw new Error("Invalid mint data");

  return (value?.data as ParsedAccountData).parsed.info.decimals;
}

export function isLegacyMarket(
  marketState: MarketStateType
): marketState is LegacyMarketState {
  return (
    (marketState as NonPermissionedMarketState).referrerRebatesAccrued ===
    undefined
  );
}

export function isNonPermissionedMarket(
  marketState: MarketStateType
): marketState is NonPermissionedMarketState {
  return (
    (marketState as PermissionedMarketState).openOrdersAuthority ===
      undefined && !isLegacyMarket(marketState)
  );
}

export function isPermissionedMarket(
  marketState: MarketStateType
): marketState is PermissionedMarketState {
  return (
    (marketState as PermissionedMarketState).openOrdersAuthority !== undefined
  );
}
