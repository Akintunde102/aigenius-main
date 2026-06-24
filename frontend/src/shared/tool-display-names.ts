/**
 * Human-readable tool labels + live activity hints for the chat UI.
 *
 * Keep in sync with: backend/src/shared/tool-display-names.ts
 * (Next.js must compile this from inside `frontend/src`; it cannot import TS from `backend/` without extra webpack setup.)
 */
export const TOOL_DISPLAY_NAMES: Record<string, string> = {
    gmail_list_messages: 'List Emails',
    gmail_get_message: 'Read Email',
    gmail_send: 'Send Email',
    gmail_search: 'Search Emails',
    linkedin_get_profile: 'LinkedIn profile',
    linkedin_create_post: 'Post to LinkedIn',
    keep_create_note: 'Create Note',
    keep_list_notes: 'List Notes',
    keep_get_note: 'Get Note',
    keep_search_notes: 'Search Notes',
    keep_update_note: 'Update Note',
    keep_delete_note: 'Delete Note',
    convert_to_pdf_and_upload: 'Convert to PDF',
    web_fetch: 'Fetch web page',
    // Keep key in sync with backend `CALL_MODEL_FUNCTION_NAME` ('call_model').
    call_model: 'Call model (non-streaming)',
    workflow_intent: 'Workflow agent',
    workflow_inner_create: 'Create workflow (agent)',
    workflow_inner_update: 'Update workflow (agent)',
    workflow_inner_delete: 'Delete workflow (agent)',
    workflow_inner_list: 'List workflows (agent)',
    workflow_inner_schedule: 'Schedule workflow (agent)',
    workflow_intent_inner_llm: 'Workflow agent (model turn)',
    workflow_inner_generation: 'Workflow design (model)',
    local_rag_query: 'Local index search (desktop)',
    local_read_file: 'Read local file (desktop)',
    run_command: 'Local terminal (desktop)',
    local_apply_patch: 'Apply local file patch (desktop)',
    local_index_status: 'Indexer status (desktop)',
    local_index_rescan: 'Indexer rescan (desktop)',
    local_retrieval_memory_get: 'Retrieval memory get (desktop)',
    local_retrieval_memory_upsert: 'Retrieval memory save (desktop)',
};

export function getToolDisplayName(toolName: string): string {
    return TOOL_DISPLAY_NAMES[toolName] ?? toolName;
}

/**
 * Short live status line when tool logs are sparse (shown under the tool header while running).
 * Tools can rely on stream `log` events instead; this fills gaps for common cases.
 */
export function getToolActivityHint(
    tool: string,
    args: Record<string, unknown> | undefined,
): string | null {
    if (!args || typeof args !== 'object') return null;
    switch (tool) {
        case 'gmail_send': {
            const to = args.to;
            if (typeof to === 'string' && to.trim()) return `Sending email to ${to}`;
            return 'Preparing to send email…';
        }
        case 'gmail_list_messages':
            return 'Listing messages from your inbox…';
        case 'gmail_get_message': {
            const id = args.id ?? args.message_id;
            if (typeof id === 'string' && id) return `Loading message ${id.slice(0, 12)}…`;
            return 'Loading message…';
        }
        case 'gmail_search': {
            const q = args.query ?? args.q;
            if (typeof q === 'string' && q.trim()) return `Searching: "${q.slice(0, 40)}${q.length > 40 ? '…' : ''}"`;
            return 'Searching mail…';
        }
        case 'linkedin_get_profile':
            return 'Loading LinkedIn profile…';
        case 'linkedin_create_post':
            return 'Publishing post to LinkedIn…';
        case 'keep_create_note':
            return 'Creating note…';
        case 'keep_list_notes':
            return 'Listing notes…';
        case 'keep_get_note': {
            const id = args.id;
            if (typeof id === 'string' && id) return `Opening note…`;
            return 'Loading note…';
        }
        case 'keep_search_notes': {
            const q = args.query;
            if (typeof q === 'string' && q.trim()) return `Searching notes: "${q.slice(0, 32)}…"`;
            return 'Searching notes…';
        }
        case 'convert_to_pdf_and_upload':
            return 'Converting and uploading PDF…';
        case 'web_fetch': {
            const u = args.url;
            if (typeof u === 'string' && u.trim()) return `Fetching ${u.slice(0, 48)}${u.length > 48 ? '…' : ''}…`;
            return 'Fetching page…';
        }
        case 'call_model': {
            const mid = args.model_id;
            if (typeof mid === 'string' && mid.trim()) return `Calling model ${mid}…`;
            return 'Calling secondary model…';
        }
        case 'local_apply_patch': {
            const ops = args.operations;
            if (Array.isArray(ops) && ops.length > 0) {
                return `Preparing ${ops.length} file change${ops.length === 1 ? '' : 's'}…`;
            }
            return 'Preparing file patch…';
        }
        case 'run_command': {
            const cmd = typeof args.command === 'string' ? args.command.trim() : '';
            if (!cmd) return 'Running a command on your computer…';
            const short = cmd.length > 48 ? `${cmd.slice(0, 47)}…` : cmd;
            return `Command: ${short}`;
        }
        default:
            return null;
    }
}
