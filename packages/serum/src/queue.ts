import { seq } from "@solana/buffer-layout";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  accountFlags,
  EventLayout,
  EventQueueHeaderLayout,
  serumHeadPadding,
  serumTailPadding,
} from "./layout";
import { AccountFlags, EventQueueHeader, Event } from "./state";
import { calculateTotalAccountSize } from "./utils";

export class EventQueue {
  readonly accountFlags: AccountFlags;
  readonly header: EventQueueHeader;
  readonly queue: Event[];

  constructor(
    accountFlags: AccountFlags,
    header: EventQueueHeader,
    queue: Event[]
  ) {
    if (!accountFlags.initialized || !accountFlags.eventQueue) {
      throw new Error("Invalid event queue account");
    }

    this.accountFlags = accountFlags;
    this.header = header;
    this.queue = queue;
  }

  static getTotalSize(queueLength: number) {
    return calculateTotalAccountSize(
      EventLayout.span,
      EventQueueHeaderLayout.span,
      queueLength
    );
  }

  static decode(b: Uint8Array): EventQueue {
    serumHeadPadding().decode(b, 0);
    serumTailPadding().decode(b, b.length - 7);

    const flags = accountFlags().decode(b, 5);
    const header = EventQueueHeaderLayout.decode(b, 13);

    const eventCount = Math.floor(
      (b.length - (12 + accountFlags().span + EventQueueHeaderLayout.span)) /
        EventLayout.span
    );

    const queue = seq(EventLayout, eventCount, "events").decode(b, 40);

    return new EventQueue(flags, header, queue);
  }

  static async load(
    connection: Connection,
    eventQueueAccount: PublicKey
  ): Promise<EventQueue> {
    const b = await connection.getAccountInfo(eventQueueAccount);

    if (b === null) {
      throw new Error("Event queue account not found");
    }

    return EventQueue.decode(b.data);
  }

  *events(reversed?: number): Generator<Event> {
    const head = this.header.head;

    if (!reversed) {
      for (let i = 0; i < this.header.count; i++) {
        yield this.queue[(head + i) % this.queue.length];
      }
    } else {
      for (let i = 0; i < Math.min(reversed, this.header.count); i++) {
        yield this.queue[
          (head + this.header.count + this.queue.length - i - 1) %
            this.queue.length
        ];
      }
    }
  }
}
