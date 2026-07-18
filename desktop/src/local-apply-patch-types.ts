export type PatchOp =
  | { kind: 'create_file'; path: string; content: string }
  | { kind: 'update_file'; path: string; content: string }
  | { kind: 'apply_hunk'; path: string; search: string; replace: string; replaceAll?: boolean }
  | { kind: 'delete_file'; path: string };
