const TABLE_ROW_RE = /^\s*\|(.+)\|\s*$/;
const TABLE_SEPARATOR_RE = /^\s*\|[\s\-:|]+\|\s*$/;
const FENCED_CODE_BLOCK_RE = /```[\s\S]*?```/g;

/** LLMs sometimes escape `[` before `local-file://` links, which leaves raw markdown in chat. */
const ESCAPED_LOCAL_FILE_LINK_RE = /!?\\\[([^\]]*)\]\((local-file:\/\/[^)]+)\)/g;

const PSEUDO_CODE_FENCE_RE = /```(\w*)\\n([\s\S]*?)\\n```/g;

type PseudoFenceExtraction = {
    cleaned: string;
    blocks: string[];
};

function unescapePseudoCode(code: string): string {
    return code.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

function extractPseudoCodeFences(text: string): PseudoFenceExtraction {
    const blocks: string[] = [];
    const matches = Array.from(text.matchAll(PSEUDO_CODE_FENCE_RE));

    if (matches.length === 0) {
        return { cleaned: text, blocks };
    }

    let cleaned = text;
    for (const match of matches) {
        const lang = match[1] ?? '';
        const code = unescapePseudoCode(match[2]);
        blocks.push(`\n\n\`\`\`${lang}\n${code}\n\`\`\`\n`);
        cleaned = cleaned.replace(match[0], '');
    }

    cleaned = cleaned.replace(/<br\s*\/?>/gi, '').replace(/\\n/g, '').replace(/\s+/g, ' ').trim();

    if (!cleaned) {
        cleaned = 'See example below';
    }

    return { cleaned, blocks };
}

function repairTableCell(cell: string, appendedBlocks: string[]): string {
    const { cleaned, blocks } = extractPseudoCodeFences(cell);
    appendedBlocks.push(...blocks);

    if (cleaned.includes('```')) {
        return cleaned;
    }

    return cleaned.replace(/\\n/g, '<br>');
}

function isTableRow(line: string): boolean {
    return TABLE_ROW_RE.test(line) && !TABLE_SEPARATOR_RE.test(line);
}

function repairEscapedLocalFileLinkSegment(segment: string): string {
    if (!segment.includes('\\[') || !segment.includes('local-file://')) {
        return segment;
    }
    return segment.replace(ESCAPED_LOCAL_FILE_LINK_RE, (match, label: string, href: string) => {
        const prefix = match.startsWith('!') ? '!' : '';
        return `${prefix}[${label}](${href})`;
    });
}

/** Unescape `\[` / `!\[` before `local-file://` markdown links (skipped inside fenced code). */
export function repairEscapedLocalFileMarkdownLinks(markdown: string): string {
    if (!markdown || !markdown.includes('\\[') || !markdown.includes('local-file://')) {
        return markdown;
    }

    let result = '';
    let lastIndex = 0;
    FENCED_CODE_BLOCK_RE.lastIndex = 0;

    for (const match of Array.from(markdown.matchAll(FENCED_CODE_BLOCK_RE))) {
        const index = match.index ?? 0;
        result += repairEscapedLocalFileLinkSegment(markdown.slice(lastIndex, index));
        result += match[0];
        lastIndex = index + match[0].length;
    }

    result += repairEscapedLocalFileLinkSegment(markdown.slice(lastIndex));
    return result;
}

/**
 * Repairs common LLM markdown mistakes in GFM tables without altering normal prose.
 * - Pulls pseudo-fenced code (` ```lang\\n...\\n``` `) out of table cells below the table.
 * - Converts literal `\\n` in table cells to `<br>` (parsed via rehype-raw).
 * - Unescapes `\[` before `local-file://` preview links so desktop chat renders clickable paths.
 */
export function repairLlmMarkdown(markdown: string): string {
    if (!markdown) {
        return markdown;
    }

    const repairedLinks = repairEscapedLocalFileMarkdownLinks(markdown);
    const lines = repairedLinks.split('\n');
    const out: string[] = [];
    const appendedBlocks: string[] = [];

    for (const line of lines) {
        if (!isTableRow(line)) {
            out.push(line);
            continue;
        }

        const match = line.match(TABLE_ROW_RE);
        if (!match) {
            out.push(line);
            continue;
        }

        const cells = match[1].split('|').map((cell) => repairTableCell(cell, appendedBlocks));
        out.push(`| ${cells.map((cell) => cell.trim()).join(' | ')} |`);
    }

    if (appendedBlocks.length > 0) {
        out.push('');
        out.push(appendedBlocks.join('').trimEnd());
    }

    return out.join('\n');
}
