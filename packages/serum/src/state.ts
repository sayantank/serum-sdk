export type AccountFlags = {
  Initialized: boolean;
  Market: boolean;
  OpenOrders: boolean;
  RequestQueue: boolean;
  EventQueue: boolean;
  Bids: boolean;
  Asks: boolean;
  Disabled: boolean;
  Closed: boolean;
  Permissioned: boolean;
  CrankAuthorityRequired: boolean;
};

export type MarketStateV1 = {
  _headPadding: Uint8Array;
  accountFlags: AccountFlags;
};
