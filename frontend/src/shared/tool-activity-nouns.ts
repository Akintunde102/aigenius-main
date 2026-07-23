/**
 * Per-tool activity nouns for turn summaries (e.g. "6 reads, 4 searches").
 * Keep labels short and lowercase — they appear mid-sentence in aggregate summaries.
 */
export type ToolActivityNoun = {
  singular: string;
  plural: string;
};

export const TOOL_ACTIVITY_NOUNS: Record<string, ToolActivityNoun> = {
  gmail_list_messages: { singular: 'inbox list', plural: 'inbox lists' },
  gmail_get_message: { singular: 'email read', plural: 'email reads' },
  gmail_send: { singular: 'email sent', plural: 'emails sent' },
  gmail_search: { singular: 'email search', plural: 'email searches' },
  linkedin_get_profile: { singular: 'profile lookup', plural: 'profile lookups' },
  linkedin_create_post: { singular: 'post', plural: 'posts' },
  keep_create_note: { singular: 'note created', plural: 'notes created' },
  keep_list_notes: { singular: 'note list', plural: 'note lists' },
  keep_get_note: { singular: 'note read', plural: 'note reads' },
  keep_search_notes: { singular: 'note search', plural: 'note searches' },
  keep_update_note: { singular: 'note update', plural: 'note updates' },
  keep_delete_note: { singular: 'note delete', plural: 'note deletes' },
  convert_to_pdf_and_upload: { singular: 'PDF conversion', plural: 'PDF conversions' },
  web_fetch: { singular: 'web fetch', plural: 'web fetches' },
  call_model: { singular: 'model call', plural: 'model calls' },
  workflow_intent: { singular: 'workflow run', plural: 'workflow runs' },
  workflow_inner_create: { singular: 'workflow create', plural: 'workflow creates' },
  workflow_inner_update: { singular: 'workflow update', plural: 'workflow updates' },
  workflow_inner_delete: { singular: 'workflow delete', plural: 'workflow deletes' },
  workflow_inner_list: { singular: 'workflow list', plural: 'workflow lists' },
  workflow_inner_schedule: { singular: 'workflow schedule', plural: 'workflow schedules' },
  workflow_intent_inner_llm: { singular: 'workflow model turn', plural: 'workflow model turns' },
  workflow_inner_generation: { singular: 'workflow design', plural: 'workflow designs' },
  local_rag_query: { singular: 'search', plural: 'searches' },
  local_read_file: { singular: 'read', plural: 'reads' },
  read_file: { singular: 'read', plural: 'reads' },
  read_local_file: { singular: 'read', plural: 'reads' },
  local_shell: { singular: 'command', plural: 'commands' },
  run_command: { singular: 'command', plural: 'commands' },
  local_apply_patch: { singular: 'edit', plural: 'edits' },
  local_get_context: { singular: 'context lookup', plural: 'context lookups' },
  local_list_directory: { singular: 'directory list', plural: 'directory lists' },
  local_symbol_outline: { singular: 'symbol outline', plural: 'symbol outlines' },
  local_list_symbols: { singular: 'symbol search', plural: 'symbol searches' },
  local_find_references: { singular: 'reference search', plural: 'reference searches' },
  local_find_callers: { singular: 'caller search', plural: 'caller searches' },
  local_trace_call_chain: { singular: 'call trace', plural: 'call traces' },
  local_symbol_blast_radius: { singular: 'blast radius check', plural: 'blast radius checks' },
  local_type_flow_trace: { singular: 'type trace', plural: 'type traces' },
  local_grep: { singular: 'search', plural: 'searches' },
  local_go_to_definition: { singular: 'definition lookup', plural: 'definition lookups' },
  local_import_blast_radius: { singular: 'import trace', plural: 'import traces' },
  local_git_status: { singular: 'git status check', plural: 'git status checks' },
  local_git_diff: { singular: 'git diff', plural: 'git diffs' },
  local_retrieval_memory_get: { singular: 'memory read', plural: 'memory reads' },
  local_retrieval_memory_upsert: { singular: 'memory save', plural: 'memory saves' },
};

const FALLBACK_NOUN: ToolActivityNoun = { singular: 'tool use', plural: 'tool uses' };

export function getToolActivityNoun(tool: string): ToolActivityNoun {
  return TOOL_ACTIVITY_NOUNS[tool] ?? FALLBACK_NOUN;
}

export function formatNounCount(count: number, noun: ToolActivityNoun, failed = false): string {
  const label = count === 1 ? noun.singular : noun.plural;
  if (failed) {
    return `${count} failed ${label}`;
  }
  return `${count} ${label}`;
}
