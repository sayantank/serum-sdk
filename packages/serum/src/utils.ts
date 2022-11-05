import { Connection, ParsedAccountData, PublicKey } from "@solana/web3.js";
import { SlabNodeType } from "./layout";
import { MarketStateType } from "./market";
import {
  InnerSlabNode,
  LeafSlabNode,
  LegacyMarketState,
  NonPermissionedMarketState,
  PermissionedMarketState,
  SlabNode,
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

export function calculateTotalAccountSize(
  individualAccountSize: number,
  accountHeaderSize: number,
  length: number
) {
  const accountPadding = 12;
  const accountFlags = 8; // accountFlags().span
  const minRequiredSize =
    accountPadding +
    accountFlags +
    accountHeaderSize +
    length * individualAccountSize;

  const modulo = minRequiredSize % 8;

  return modulo <= 4
    ? minRequiredSize + (4 - modulo)
    : minRequiredSize + (8 - modulo + 4);
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

export function isInnerNode(node: SlabNode): node is InnerSlabNode {
  return node.tag === SlabNodeType.Inner;
}

export function isLeafNode(node: SlabNode): node is LeafSlabNode {
  return node.tag === SlabNodeType.Leaf;
}
