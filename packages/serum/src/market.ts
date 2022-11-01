import { PublicKey } from "@solana/web3.js";

export class SerumMarket {
  readonly programID: PublicKey;

  constructor(programID: PublicKey) {
    this.programID = programID;
  }
}
