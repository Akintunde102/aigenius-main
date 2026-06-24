export type PatchOp =
  | { kind: 'create_file'; path: string; content: string }
  | { kind: 'update_file'; path: string; content: string }
  | { kind: 'delete_file'; path: string };
