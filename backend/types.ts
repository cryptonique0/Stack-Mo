export interface BlockIdentifier {
  index: number;
  hash: string;
}

export interface TransactionIdentifier {
  hash: string;
}

export interface TransactionMetadata {
  success: boolean;
  sender: string;
  fee: number;
  proof?: string;
  kind: {
    type: string;
    [key: string]: any;
  };
  receipt: any;
  description: string;
}

export interface Transaction {
  transaction_identifier: TransactionIdentifier;
  operations: any[];
  metadata: TransactionMetadata;
}

export interface Block {
  block_identifier: BlockIdentifier;
  timestamp: number;
  transactions: Transaction[];
  metadata: any;
}

export interface ChainhookPayload {
  apply: Block[];
  rollback: Block[];
  chainhook: {
    uuid: string;
    predicate: any;
  };
}