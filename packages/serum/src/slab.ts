import { seq } from "@solana/buffer-layout";
import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import {
  accountFlags,
  serumHeadPadding,
  serumTailPadding,
  SlabHeaderLayout,
  slabNode,
} from "./layout";
import { AccountFlags, LeafSlabNode, SlabHeader, SlabNode } from "./state";
import {
  calculateTotalAccountSize,
  emptyAccountFlags,
  isInnerNode,
  isLeafNode,
} from "./utils";

export type SlabType = "bids" | "asks";

export class Slab {
  readonly type: SlabType;
  readonly accountFlags: AccountFlags;
  readonly header: SlabHeader;
  readonly nodes: SlabNode[];

  constructor(
    accountFlags: AccountFlags,
    header: SlabHeader,
    nodes: SlabNode[]
  ) {
    if (
      !accountFlags.initialized ||
      !(accountFlags.bids || accountFlags.asks)
    ) {
      throw new Error("Invalid slab account");
    }
    this.type = accountFlags.bids ? "bids" : "asks";
    this.accountFlags = accountFlags;
    this.header = header;
    this.nodes = nodes;
  }

  static getTotalSize(nodeCount: number) {
    return calculateTotalAccountSize(
      slabNode().span,
      SlabHeaderLayout.span,
      nodeCount
    );
  }

  static decode(b: Uint8Array, type: SlabType): Slab {
    serumHeadPadding().decode(b, 0);
    serumTailPadding().decode(b, b.length - 7);

    const slabFlags: AccountFlags = {
      ...emptyAccountFlags,
      initialized: true,
      bids: type === "bids",
      asks: type === "asks",
    };

    const flags = accountFlags(slabFlags).decode(b, 5);
    const header = SlabHeaderLayout.decode(b, 13);

    const nodeCount = Math.floor(
      (b.length - (12 + accountFlags(slabFlags).span + SlabHeaderLayout.span)) /
        slabNode().span
    );

    const nodes = seq(slabNode(), nodeCount, "nodes").decode(b, 45);

    return new Slab(flags, header, nodes);
  }

  static async load(
    connection: Connection,
    slabAccount: PublicKey,
    type: SlabType
  ): Promise<Slab> {
    const accountInfo = await connection.getAccountInfo(slabAccount);

    if (accountInfo === null) {
      throw new Error("Slab account not found");
    }

    return Slab.decode(accountInfo.data, type);
  }

  get(searchKey: BN | number): SlabNode | null {
    if (this.header.leafCount === 0) return null;

    if (!(searchKey instanceof BN)) {
      searchKey = new BN(searchKey);
    }

    let index = this.header.rootNode;

    const loop = true;
    while (loop) {
      const node = this.nodes[index];

      if (isLeafNode(node)) {
        if (node.key.eq(searchKey)) {
          return node;
        } else return null;
      } else if (isInnerNode(node)) {
        if (
          !node.key
            .xor(searchKey)
            .iushrn(128 - node.prefixLen)
            .isZero()
        ) {
          return null;
        }

        index =
          node.children[searchKey.testn(128 - node.prefixLen - 1) ? 1 : 0];
      } else {
        throw new Error("Invalid slab node");
      }
    }

    return null;
  }

  *items(descending = false): Generator<LeafSlabNode> {
    if (this.header.leafCount === 0) return;

    const stack = [this.header.rootNode];

    while (stack.length > 0) {
      const index = stack.pop();
      if (index === undefined) return;

      const currNode = this.nodes[index];

      if (isLeafNode(currNode)) {
        yield currNode;
      } else if (isInnerNode(currNode)) {
        if (descending) {
          stack.push(currNode.children[0]);
          stack.push(currNode.children[1]);
        } else {
          stack.push(currNode.children[1]);
          stack.push(currNode.children[0]);
        }
      }
    }
  }

  [Symbol.iterator]() {
    return this.items(false);
  }
}
