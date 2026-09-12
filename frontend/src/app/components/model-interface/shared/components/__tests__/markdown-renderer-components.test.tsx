/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../LocalFileInlineImage', () => ({
    LocalFileInlineImage: ({ path, alt }: { path: string; alt?: string }) => (
        <span data-testid="local-file-inline-image" data-path={path}>
            {alt}
        </span>
    ),
}));

jest.mock('../MermaidRenderer', () => ({
    MermaidRenderer: () => null,
}));

jest.mock('../markdown-code-widgets', () => ({
    isMarkdownBlockCode: () => false,
    PreWithCopy: ({ children }: { children: React.ReactNode }) => <pre>{children}</pre>,
}));

import { MarkdownImage } from '../markdown-renderer-components';

describe('MarkdownImage', () => {
    it('omits Referer on remote https images so hotlink-protected hosts do not 403', () => {
        render(
            <MarkdownImage
                src="https://tribuneonlineng.com/wp-content/uploads/2019/02/The-big-courtyard-of-Akure-old-palace.jpg"
                alt="The old palace courtyard of the Deji of Akure, built around 1150 AD"
            />,
        );

        const img = screen.getByAltText(
            'The old palace courtyard of the Deji of Akure, built around 1150 AD',
        );
        expect(img).toHaveAttribute('src', 'https://tribuneonlineng.com/wp-content/uploads/2019/02/The-big-courtyard-of-Akure-old-palace.jpg');
        expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
    });

    it('keeps local-file images on the desktop inline loader instead of a remote img', () => {
        render(<MarkdownImage src="local-file://C:/photos/palace.jpg" alt="palace" />);

        expect(screen.getByTestId('local-file-inline-image')).toHaveAttribute(
            'data-path',
            'C:/photos/palace.jpg',
        );
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('does not let caller props override referrerPolicy', () => {
        render(
            <MarkdownImage
                src="https://example.com/a.jpg"
                alt="example"
                referrerPolicy="origin"
            />,
        );

        expect(screen.getByAltText('example')).toHaveAttribute('referrerpolicy', 'no-referrer');
    });
});
