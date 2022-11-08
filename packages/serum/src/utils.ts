import { u32, u8 } from "@solana/buffer-layout";
import { Connection, ParsedAccountData, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { SlabNodeType } from "./layout";
import { MarketStateType } from "./market";
import {
  AccountFlags,
  InnerSlabNode,
  LeafSlabNode,
  LegacyMarketState,
  NonPermissionedMarketState,
  PermissionedMarketState,
  SlabNode,
} from "./state";

export const emptyAccountFlags: AccountFlags = {
  initialized: false,
  market: false,
  openOrders: false,
  requestQueue: false,
  eventQueue: false,
  bids: false,
  asks: false,
  disabled: false,
  closed: false,
  permissioned: false,
  crankAuthorityRequired: false,
};

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

export function getPriceFromKey(key: BN) {
  return key.ushrn(64);
}

export function divideBNToNumber(num: BN, den: BN): number {
  const quotient = num.div(den).toNumber();
  const remainder = num.umod(den);

  const gcd = remainder.gcd(den);

  return quotient + remainder.div(gcd).toNumber() / den.div(gcd).toNumber();
}

export function encodeInstruction(
  version: number,
  instructionIndex: number,
  data: Buffer
) {
  const versionLayout = u8("version");
  const versionBuffer = Buffer.alloc(versionLayout.span);
  versionLayout.encode(version, versionBuffer);

  const tagLayout = u32("instruction");
  const indexBuffer = Buffer.alloc(tagLayout.span);
  tagLayout.encode(instructionIndex, indexBuffer);

  return Buffer.from([...versionBuffer, ...indexBuffer, ...data]);
}
