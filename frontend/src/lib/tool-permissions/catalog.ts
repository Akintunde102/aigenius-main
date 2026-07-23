export type ToolPermissionCatalogEntry = {
  id: string;
  label: string;
  description: string;
  defaultRequiresApproval: boolean;
  aliases?: string[];
  /** When true, excluded from permission UI and approval gates (workflows). */
  excludeFromPermissions?: boolean;
};

const MUTATING = true;
const READ_ONLY = false;

export const TOOL_PERMISSION_CATALOG: ToolPermissionCatalogEntry[] = [
  // Desktop local
  {
    id: 'local_shell',
    label: 'Run shell commands',
    description: 'Execute terminal commands on your computer',
    defaultRequiresApproval: MUTATING,
    aliases: ['run_command'],
  },
  {
    id: 'local_apply_patch',
    label: 'Apply file changes',
    description: 'Create, update, or delete files on disk',
    defaultRequiresApproval: MUTATING,
  },
  {
    id: 'local_retrieval_memory_upsert',
    label: 'Save retrieval memory',
    description: 'Write or update saved memory entries on disk',
    defaultRequiresApproval: MUTATING,
  },
  {
    id: 'local_read_file',
    label: 'Read local files',
    description: 'Read file contents from your machine',
    defaultRequiresApproval: READ_ONLY,
    aliases: ['read_file', 'read_local_file'],
  },
  {
    id: 'local_list_directory',
    label: 'List directories',
    description: 'Browse folders and files on your machine',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'local_rag_query',
    label: 'Search indexed files',
    description: 'Query the local search index',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'local_open_in_os',
    label: 'Open in system app',
    description: 'Open a file with the default OS application',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'local_retrieval_memory_get',
    label: 'Load retrieval memory',
    description: 'Read a saved memory entry from disk',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'local_ollama_chat',
    label: 'Run local Ollama chat',
    description: 'Send prompts to a local Ollama model',
    defaultRequiresApproval: READ_ONLY,
  },
  // Keep
  {
    id: 'keep_create_note',
    label: 'Create note',
    description: 'Create a new note in your workspace',
    defaultRequiresApproval: MUTATING,
  },
  {
    id: 'keep_update_note',
    label: 'Update note',
    description: 'Change an existing note',
    defaultRequiresApproval: MUTATING,
  },
  {
    id: 'keep_delete_note',
    label: 'Delete note',
    description: 'Permanently delete a note',
    defaultRequiresApproval: MUTATING,
  },
  {
    id: 'keep_list_notes',
    label: 'List notes',
    description: 'List notes in your workspace',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'keep_get_note',
    label: 'Get note',
    description: 'Read a note by id',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'keep_search_notes',
    label: 'Search notes',
    description: 'Search notes by keyword',
    defaultRequiresApproval: READ_ONLY,
  },
  // Gmail
  {
    id: 'gmail_send',
    label: 'Send email',
    description: 'Send an email from your connected Gmail account',
    defaultRequiresApproval: MUTATING,
  },
  {
    id: 'gmail_list_messages',
    label: 'List emails',
    description: 'List messages from your inbox',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'gmail_get_message',
    label: 'Read email',
    description: 'Read a specific email message',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'gmail_search',
    label: 'Search emails',
    description: 'Search your Gmail inbox',
    defaultRequiresApproval: READ_ONLY,
  },
  // LinkedIn
  {
    id: 'linkedin_create_post',
    label: 'Post to LinkedIn',
    description: 'Publish a post to your LinkedIn profile',
    defaultRequiresApproval: MUTATING,
  },
  {
    id: 'linkedin_get_profile',
    label: 'LinkedIn profile',
    description: 'Read your LinkedIn profile information',
    defaultRequiresApproval: READ_ONLY,
  },
  // PDF
  {
    id: 'convert_to_pdf_and_upload',
    label: 'Convert to PDF',
    description: 'Convert content to PDF and upload it',
    defaultRequiresApproval: MUTATING,
  },
  // Web / search
  {
    id: 'web_fetch',
    label: 'Fetch web page',
    description: 'Download a web page for the assistant to read',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'serper_google_search',
    label: 'Google search',
    description: 'Run a web search via Serper',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'get_wallet_balance',
    label: 'Wallet balance',
    description: 'Read your credit balance',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'call_model',
    label: 'Call model',
    description: 'Invoke a secondary model (uses credits)',
    defaultRequiresApproval: READ_ONLY,
  },
  // Firecrawl — mutating / interactive
  {
    id: 'firecrawl_interact',
    label: 'Firecrawl interact',
    description: 'Interact with a page in a browser session',
    defaultRequiresApproval: MUTATING,
  },
  {
    id: 'firecrawl_stop_interaction',
    label: 'Firecrawl stop interaction',
    description: 'Stop an active browser interaction',
    defaultRequiresApproval: MUTATING,
  },
  {
    id: 'firecrawl_crawl_start',
    label: 'Firecrawl start crawl',
    description: 'Start crawling a website',
    defaultRequiresApproval: MUTATING,
  },
  {
    id: 'firecrawl_crawl_cancel',
    label: 'Firecrawl cancel crawl',
    description: 'Cancel an active crawl job',
    defaultRequiresApproval: MUTATING,
  },
  {
    id: 'firecrawl_batch_scrape_start',
    label: 'Firecrawl batch scrape',
    description: 'Start a batch scrape job',
    defaultRequiresApproval: MUTATING,
  },
  {
    id: 'firecrawl_batch_scrape_cancel',
    label: 'Firecrawl cancel batch scrape',
    description: 'Cancel a batch scrape job',
    defaultRequiresApproval: MUTATING,
  },
  {
    id: 'firecrawl_agent_start',
    label: 'Firecrawl agent',
    description: 'Start a Firecrawl agent task',
    defaultRequiresApproval: MUTATING,
  },
  {
    id: 'firecrawl_agent_cancel',
    label: 'Firecrawl cancel agent',
    description: 'Cancel a Firecrawl agent task',
    defaultRequiresApproval: MUTATING,
  },
  {
    id: 'firecrawl_browser_create',
    label: 'Firecrawl create browser',
    description: 'Create a remote browser session',
    defaultRequiresApproval: MUTATING,
  },
  {
    id: 'firecrawl_browser_execute',
    label: 'Firecrawl browser execute',
    description: 'Run actions in a remote browser',
    defaultRequiresApproval: MUTATING,
  },
  {
    id: 'firecrawl_browser_delete',
    label: 'Firecrawl delete browser',
    description: 'Delete a remote browser session',
    defaultRequiresApproval: MUTATING,
  },
  {
    id: 'firecrawl_extract_start',
    label: 'Firecrawl extract',
    description: 'Start a structured data extraction job',
    defaultRequiresApproval: MUTATING,
  },
  // Firecrawl — read-only / status
  {
    id: 'firecrawl_scrape_url',
    label: 'Firecrawl scrape',
    description: 'Scrape a single URL',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'firecrawl_search',
    label: 'Firecrawl search',
    description: 'Search the web via Firecrawl',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'firecrawl_map_site',
    label: 'Firecrawl map site',
    description: 'Map links on a website',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'firecrawl_crawl_status',
    label: 'Firecrawl crawl status',
    description: 'Check crawl job status',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'firecrawl_crawl_wait',
    label: 'Firecrawl crawl wait',
    description: 'Wait for a crawl job to finish',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'firecrawl_crawl_errors',
    label: 'Firecrawl crawl errors',
    description: 'List crawl errors',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'firecrawl_active_crawls',
    label: 'Firecrawl active crawls',
    description: 'List active crawl jobs',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'firecrawl_batch_scrape_status',
    label: 'Firecrawl batch status',
    description: 'Check batch scrape status',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'firecrawl_batch_scrape_wait',
    label: 'Firecrawl batch wait',
    description: 'Wait for batch scrape to finish',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'firecrawl_batch_scrape_errors',
    label: 'Firecrawl batch errors',
    description: 'List batch scrape errors',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'firecrawl_agent_status',
    label: 'Firecrawl agent status',
    description: 'Check agent task status',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'firecrawl_agent_wait',
    label: 'Firecrawl agent wait',
    description: 'Wait for agent task to finish',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'firecrawl_extract_status',
    label: 'Firecrawl extract status',
    description: 'Check extraction job status',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'firecrawl_extract_wait',
    label: 'Firecrawl extract wait',
    description: 'Wait for extraction to finish',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'firecrawl_browser_list',
    label: 'Firecrawl list browsers',
    description: 'List remote browser sessions',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'firecrawl_credit_usage',
    label: 'Firecrawl credit usage',
    description: 'Read Firecrawl credit usage',
    defaultRequiresApproval: READ_ONLY,
  },
  {
    id: 'firecrawl_queue_status',
    label: 'Firecrawl queue status',
    description: 'Read Firecrawl queue status',
    defaultRequiresApproval: READ_ONLY,
  },
  // Workflows — excluded from permission system
  {
    id: 'workflow_agent',
    label: 'Workflow agent',
    description: 'Workflow automation (excluded from tool permissions)',
    defaultRequiresApproval: READ_ONLY,
    excludeFromPermissions: true,
  },
];

export const WORKFLOW_TOOL_PREFIX = 'workflow_inner_';

export function isWorkflowTool(tool: string): boolean {
  return tool === 'workflow_agent' || tool.startsWith(WORKFLOW_TOOL_PREFIX);
}

export function normalizeToolId(tool: string): string {
  const byId = TOOL_PERMISSION_CATALOG.find((entry) => entry.id === tool);
  if (byId) {
    return byId.id;
  }
  const byAlias = TOOL_PERMISSION_CATALOG.find((entry) => entry.aliases?.includes(tool));
  return byAlias?.id ?? tool;
}

export function getCatalogEntry(toolId: string): ToolPermissionCatalogEntry | undefined {
  const normalized = normalizeToolId(toolId);
  return TOOL_PERMISSION_CATALOG.find((entry) => entry.id === normalized);
}

export function getPermissionCatalogForUi(): ToolPermissionCatalogEntry[] {
  return TOOL_PERMISSION_CATALOG.filter((entry) => !entry.excludeFromPermissions);
}
