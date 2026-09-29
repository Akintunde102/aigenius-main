/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { MarkdownYoutubeEmbed } from '../MarkdownYoutubeEmbed';

const watchUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

describe('MarkdownYoutubeEmbed', () => {
    it('shows a thumbnail preview instead of a blank player', () => {
        render(<MarkdownYoutubeEmbed watchUrl={watchUrl} title="watch" />);

        expect(screen.getByRole('button', { name: 'Play watch' })).toBeInTheDocument();
        const poster = document.querySelector('.markdown-youtube-embed__poster');
        expect(poster).toHaveAttribute(
            'src',
            'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        );
        expect(document.querySelector('iframe')).toBeNull();
    });

    it('loads the player only after the preview is clicked', () => {
        render(<MarkdownYoutubeEmbed watchUrl={watchUrl} title="watch" />);

        fireEvent.click(screen.getByRole('button', { name: 'Play watch' }));

        const frame = screen.getByTitle('watch');
        expect(frame.tagName).toBe('IFRAME');
        expect(frame).toHaveAttribute(
            'src',
            'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&origin=http%3A%2F%2Flocalhost',
        );
        expect(document.querySelector('.markdown-youtube-embed__poster')).toBeNull();
    });

    it('keeps a normal link when the url has no video id', () => {
        render(<MarkdownYoutubeEmbed watchUrl="https://www.youtube.com/feed/trending" title="Trending" />);

        const link = screen.getByRole('link', { name: 'Trending' });
        expect(link).toHaveAttribute('href', 'https://www.youtube.com/feed/trending');
        expect(document.querySelector('iframe')).toBeNull();
    });
});
