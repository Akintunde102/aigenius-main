/**
 * @jest-environment jsdom
 *
 * react-markdown and plugins are ESM-only; we mock them here and assert the
 * MarkdownRenderer contract (wrapper, empty handling, props). Behaviour of
 * GFM + highlighting is covered in e2e/tests/markdown-chat-rendering.spec.ts.
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';

jest.mock('github-markdown-css/github-markdown.css', () => ({}));
jest.mock('highlight.js/styles/github.css', () => ({}));
jest.mock('../markdown-renderer.scss', () => ({}));

const reactMarkdownSpy = jest.fn();

jest.mock('react-markdown', () => ({
    __esModule: true,
    default: function MockReactMarkdown({
        children,
        remarkPlugins,
        rehypePlugins,
    }: {
        children: string;
        remarkPlugins?: unknown[];
        rehypePlugins?: unknown[];
    }) {
        reactMarkdownSpy({ children, remarkPlugins, rehypePlugins });
        return (
            <div data-testid="react-markdown-mock">
                <span data-testid="rm-children">{children}</span>
            </div>
        );
    },
}));

jest.mock('remark-gfm', () => ({
    __esModule: true,
    default: function remarkGfm() {
        return function remarkGfmTransform() {};
    },
}));

jest.mock('rehype-highlight', () => ({
    __esModule: true,
    default: function rehypeHighlight() {
        return function rehypeHighlightTransform() {};
    },
}));

import {
    MarkdownRenderer,
    markdownSanitizeSchema,
    shouldOpenWorkflowStudioLinkInNewTab,
} from '../MarkdownRenderer';

describe('shouldOpenWorkflowStudioLinkInNewTab', () => {
    it('matches relative /workflow/:id links', () => {
        expect(shouldOpenWorkflowStudioLinkInNewTab('/workflow/f284a24b-df4a-4596-a880-ba92ef255442')).toBe(true);
        expect(shouldOpenWorkflowStudioLinkInNewTab('/workflow/f284a24b-df4a-4596-a880-ba92ef255442/executions')).toBe(
            true,
        );
        expect(shouldOpenWorkflowStudioLinkInNewTab('/workflows')).toBe(false);
        expect(shouldOpenWorkflowStudioLinkInNewTab('/workflow/')).toBe(false);
    });

    it('matches same-origin absolute workflow URLs when origin is provided', () => {
        const origin = 'http://localhost:3001';
        expect(
            shouldOpenWorkflowStudioLinkInNewTab(
                'http://localhost:3001/workflow/f284a24b-df4a-4596-a880-ba92ef255442',
                origin,
            ),
        ).toBe(true);
        expect(
            shouldOpenWorkflowStudioLinkInNewTab('https://other.example/workflow/f284a24b-df4a-4596-a880-ba92ef255442', origin),
        ).toBe(false);
    });
});

describe('markdownSanitizeSchema', () => {
    it('allows local-file preview links through rehype-sanitize', () => {
        expect(markdownSanitizeSchema.protocols?.href).toContain('local-file');
    });

    it('allows local-file image sources through rehype-sanitize', () => {
        expect(markdownSanitizeSchema.protocols?.src).toContain('local-file');
    });
});

describe('MarkdownRenderer', () => {
    beforeEach(() => {
        reactMarkdownSpy.mockClear();
    });

    it('returns null for empty or whitespace-only content', () => {
        const { container: c1 } = render(<MarkdownRenderer content="" />);
        expect(c1.firstChild).toBeNull();
        cleanup();

        const { container: c2 } = render(<MarkdownRenderer content={' \n\t '} />);
        expect(c2.firstChild).toBeNull();
    });

    it('does not invoke ReactMarkdown when trimmed content is empty', () => {
        render(<MarkdownRenderer content="   " />);
        expect(reactMarkdownSpy).not.toHaveBeenCalled();
    });

    it('wraps output in markdown-body and optional className', () => {
        const { container } = render(<MarkdownRenderer content="Hello" className="extra-class" />);
        const root = container.firstElementChild;
        expect(root).toHaveClass('markdown-body', 'markdown-chat-body', 'extra-class');
    });

    it('passes full content string to ReactMarkdown (not only trim) for rendering', () => {
        render(<MarkdownRenderer content={'  line1\n\nline2  '} />);
        expect(reactMarkdownSpy).toHaveBeenCalledTimes(1);
        expect(reactMarkdownSpy.mock.calls[0][0].children).toBe('  line1\n\nline2  ');
    });

    it('wires remark-gfm and rehype plugins into ReactMarkdown', () => {
        render(<MarkdownRenderer content="x" />);
        const arg = reactMarkdownSpy.mock.calls[0][0];
        expect(arg.remarkPlugins).toHaveLength(1);
        expect(arg.rehypePlugins).toHaveLength(3);
    });

    it('applies repairLlmMarkdown before passing content to ReactMarkdown', () => {
        render(<MarkdownRenderer content={'| A | one\\ntwo |'} />);
        expect(reactMarkdownSpy.mock.calls[0][0].children).toContain('one<br>two');
    });

    it('renders mocked markdown subtree so downstream structure can be asserted', () => {
        render(<MarkdownRenderer content={'**hi**'} />);
        expect(screen.getByTestId('react-markdown-mock')).toBeInTheDocument();
        expect(screen.getByTestId('rm-children')).toHaveTextContent('**hi**');
    });
});
