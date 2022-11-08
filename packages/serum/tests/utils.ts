import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  ACCOUNT_SIZE,
  createInitializeAccountInstruction,
  createInitializeMintInstruction,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import BN from "bn.js";
import { NonPermissionedMarketStateLayout } from "../src";

const EVENT_QUEUE_SIZE = 11308; // 128
const REQUEST_QUEUE_SIZE = 844; // 10
const ORDERBOOK_SIZE = 14524; // 201

export const LOCALHOST = "http://localhost:8899";
export const LOCAL_DEX_PROGRAM = new PublicKey(
  "8t1wRyKWWtvYiePBDCMc29kjDp6SHmBxjSFP9QTudSDu"
);

export async function getVaultOwnerAndNonce(
  marketAddress: PublicKey,
  dexAddress: PublicKey
): Promise<[vaultOwner: PublicKey, nonce: BN]> {
  const nonce = new BN(0);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const vaultOwner = await PublicKey.createProgramAddress(
        [marketAddress.toBuffer(), nonce.toArrayLike(Buffer, "le", 8)],
        dexAddress
      );
      return [vaultOwner, nonce];
    } catch (e) {
      nonce.iaddn(1);
    }
  }
}

export async function getInitializeMarketInstructions(
  connection: Connection,
  payer: Keypair,
  {
    dexProgramId,
    baseDecimals,
    quoteDecimals,
  }: {
    dexProgramId: PublicKey;
    baseDecimals: number;
    quoteDecimals: number;
  }
) {
  const accounts = {
    market: Keypair.generate(),
    requestQueue: Keypair.generate(),
    eventQueue: Keypair.generate(),
    bids: Keypair.generate(),
    asks: Keypair.generate(),
    baseVault: Keypair.generate(),
    quoteVault: Keypair.generate(),
    baseMint: Keypair.generate(),
    quoteMint: Keypair.generate(),
  };

  const tokenInstructions: TransactionInstruction[] = [];
  const tokenSigners: Keypair[] = [];

  const mintRent = await connection.getMinimumBalanceForRentExemption(
    MINT_SIZE
  );

  tokenInstructions.push(
    ...[
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: accounts.baseMint.publicKey,
        space: MINT_SIZE,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      }),
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: accounts.quoteMint.publicKey,
        space: MINT_SIZE,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      }),
    ]
  );

  tokenInstructions.push(
    ...[
      createInitializeMintInstruction(
        accounts.baseMint.publicKey,
        baseDecimals,
        payer.publicKey,
        payer.publicKey
      ),
      createInitializeMintInstruction(
        accounts.quoteMint.publicKey,
        quoteDecimals,
        payer.publicKey,
        payer.publicKey
      ),
    ]
  );

  const tokenAccountRent = await connection.getMinimumBalanceForRentExemption(
    ACCOUNT_SIZE
  );
  const [vaultOwner, vaultOwnerNonce] = await getVaultOwnerAndNonce(
    accounts.market.publicKey,
    dexProgramId
  );

  tokenInstructions.push(
    ...[
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: accounts.baseVault.publicKey,
        lamports: tokenAccountRent,
        space: ACCOUNT_SIZE,
        programId: TOKEN_PROGRAM_ID,
      }),
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: accounts.quoteVault.publicKey,
        lamports: tokenAccountRent,
        space: ACCOUNT_SIZE,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeAccountInstruction(
        accounts.baseVault.publicKey,
        accounts.baseMint.publicKey,
        vaultOwner
      ),
      createInitializeAccountInstruction(
        accounts.quoteVault.publicKey,
        accounts.quoteMint.publicKey,
        vaultOwner
      ),
    ]
  );

  tokenSigners.push(
    accounts.baseMint,
    accounts.quoteMint,
    accounts.baseVault,
    accounts.quoteVault
  );

  const marketInstructions: TransactionInstruction[] = [];
  const marketSigners: Keypair[] = [];

  marketInstructions.push(
    SystemProgram.createAccount({
      newAccountPubkey: accounts.market.publicKey,
      fromPubkey: payer.publicKey,
      space: NonPermissionedMarketStateLayout.span,
      lamports: await connection.getMinimumBalanceForRentExemption(
        NonPermissionedMarketStateLayout.span
      ),
      programId: dexProgramId,
    })
  );

  // create request queue
  marketInstructions.push(
    SystemProgram.createAccount({
      newAccountPubkey: accounts.requestQueue.publicKey,
      fromPubkey: payer.publicKey,
      space: REQUEST_QUEUE_SIZE,
      lamports: await connection.getMinimumBalanceForRentExemption(
        REQUEST_QUEUE_SIZE
      ),
      programId: dexProgramId,
    })
  );

  // create event queue
  marketInstructions.push(
    SystemProgram.createAccount({
      newAccountPubkey: accounts.eventQueue.publicKey,
      fromPubkey: payer.publicKey,
      space: EVENT_QUEUE_SIZE,
      lamports: await connection.getMinimumBalanceForRentExemption(
        EVENT_QUEUE_SIZE
      ),
      programId: dexProgramId,
    })
  );

  const orderBookRent = await connection.getMinimumBalanceForRentExemption(
    ORDERBOOK_SIZE
  );

  // create bids
  marketInstructions.push(
    SystemProgram.createAccount({
      newAccountPubkey: accounts.bids.publicKey,
      fromPubkey: payer.publicKey,
      space: ORDERBOOK_SIZE,
      lamports: orderBookRent,
      programId: dexProgramId,
    })
  );

  // create asks
  marketInstructions.push(
    SystemProgram.createAccount({
      newAccountPubkey: accounts.asks.publicKey,
      fromPubkey: payer.publicKey,
      space: ORDERBOOK_SIZE,
      lamports: orderBookRent,
      programId: dexProgramId,
    })
  );

  marketSigners.push(
    accounts.market,
    accounts.requestQueue,
    accounts.eventQueue,
    accounts.bids,
    accounts.asks
  );

  return {
    marketAccounts: accounts,
    vaultOwnerNonce,
    marketInstructions,
    marketSigners,
    tokenInstructions,
    tokenSigners,
  };
}
