const TABLE_ROW_RE = /^\s*\|(.+)\|\s*$/;
const TABLE_SEPARATOR_RE = /^\s*\|[\s\-:|]+\|\s*$/;

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

/**
 * Repairs common LLM markdown mistakes in GFM tables without altering normal prose.
 * - Pulls pseudo-fenced code (` ```lang\\n...\\n``` `) out of table cells below the table.
 * - Converts literal `\\n` in table cells to `<br>` (parsed via rehype-raw).
 */
export function repairLlmMarkdown(markdown: string): string {
    if (!markdown) {
        return markdown;
    }

    const lines = markdown.split('\n');
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
