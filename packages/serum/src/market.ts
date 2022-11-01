import { PublicKey } from "@solana/web3.js";

export const sum = (a: number, b: number) => a + b;
export class SerumMarket {
  readonly programID: PublicKey;

  constructor(programID: PublicKey) {
    this.programID = programID;
  }
}
