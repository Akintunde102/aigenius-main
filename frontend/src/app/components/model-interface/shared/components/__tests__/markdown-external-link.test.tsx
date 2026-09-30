/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn() }),
}));

import { MarkdownAnchor } from '../markdown-renderer-components';
import { MarkdownExternalLink } from '../MarkdownExternalLink';
import { externalLinkPreview } from '../markdown-external-link.utils';

describe('externalLinkPreview', () => {
    it('returns the host and the original url for http(s) links', () => {
        expect(externalLinkPreview('  https://docs.example.com/guide?id=1  ')).toEqual({
            host: 'docs.example.com',
            url: 'https://docs.example.com/guide?id=1',
        });
    });

    it('rejects in-app paths and non-http urls', () => {
        expect(externalLinkPreview('/chat/abc')).toBeNull();
        expect(externalLinkPreview('javascript:alert(1)')).toBeNull();
        expect(externalLinkPreview('https://')).toBeNull();
    });
});

describe('MarkdownExternalLink', () => {
    const href = 'https://example.com/docs';

    afterEach(() => {
        delete window.aigeniusDesktop;
        jest.restoreAllMocks();
    });

    function renderLink() {
        return render(
            <MarkdownExternalLink href={href} host="example.com">
                Docs
            </MarkdownExternalLink>,
        );
    }

    it('shows the url while the link is hovered and hides it on leave', () => {
        renderLink();
        const link = screen.getByRole('link', { name: 'Docs' });

        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

        fireEvent.mouseEnter(link);
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toHaveTextContent('example.com');
        expect(tooltip).toHaveTextContent(href);
        expect(tooltip).toHaveTextContent('Opens in your browser');

        fireEvent.mouseLeave(link);
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('opens the system browser from the desktop app', () => {
        const openClickedHttpUrl = jest.fn().mockResolvedValue({ ok: true });
        const open = jest.spyOn(window, 'open').mockImplementation(() => null);
        window.aigeniusDesktop = { isDesktop: true, openClickedHttpUrl };

        renderLink();
        fireEvent.click(screen.getByRole('link', { name: 'Docs' }));

        expect(openClickedHttpUrl).toHaveBeenCalledWith(href);
        expect(open).not.toHaveBeenCalled();
    });

    it('falls back to openExternalUrl when the clicked-url bridge is missing', () => {
        const openExternalUrl = jest.fn().mockResolvedValue({ ok: true });
        window.aigeniusDesktop = { isDesktop: true, openExternalUrl };

        renderLink();
        fireEvent.click(screen.getByRole('link', { name: 'Docs' }));

        expect(openExternalUrl).toHaveBeenCalledWith(href);
    });

    it('opens a new browser tab on the web', () => {
        const open = jest.spyOn(window, 'open').mockImplementation(() => null);

        renderLink();
        fireEvent.click(screen.getByRole('link', { name: 'Docs' }));

        expect(open).toHaveBeenCalledWith(href, '_blank', 'noopener,noreferrer');
    });
});

describe('MarkdownAnchor', () => {
    afterEach(() => {
        delete window.aigeniusDesktop;
        jest.restoreAllMocks();
    });

    it('previews external model links and keeps in-app chat links inside the app', () => {
        const { rerender } = render(
            <MarkdownAnchor href="https://example.com/offer">Offer</MarkdownAnchor>,
        );

        fireEvent.mouseEnter(screen.getByRole('link', { name: 'Offer' }));
        expect(screen.getByRole('tooltip')).toHaveTextContent('https://example.com/offer');

        rerender(<MarkdownAnchor href="/chat/abc">Thread</MarkdownAnchor>);
        fireEvent.mouseEnter(screen.getByRole('link', { name: 'Thread' }));
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Thread' })).toHaveAttribute('href', '/chat/abc');
    });
});
