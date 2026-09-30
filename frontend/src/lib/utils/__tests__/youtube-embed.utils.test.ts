import {
    buildYoutubeEmbedUrl,
    extractYoutubeVideoId,
    isYoutubeWatchUrl,
    shouldEmbedYoutubeMarkdownLink,
    youtubePosterUrl,
} from '../youtube-embed.utils';

describe('extractYoutubeVideoId', () => {
    it('parses watch URLs with v query param', () => {
        expect(extractYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
        expect(extractYoutubeVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s')).toBe('dQw4w9WgXcQ');
    });

    it('parses youtu.be short links', () => {
        expect(extractYoutubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('parses shorts and embed paths', () => {
        expect(extractYoutubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
        expect(extractYoutubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('returns null for non-YouTube or invalid ids', () => {
        expect(extractYoutubeVideoId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
        expect(extractYoutubeVideoId('https://www.youtube.com/watch?v=short')).toBeNull();
        expect(extractYoutubeVideoId('not-a-url')).toBeNull();
    });
});

describe('shouldEmbedYoutubeMarkdownLink', () => {
    const watch = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    it('embeds image-style preview links and autolink text', () => {
        expect(shouldEmbedYoutubeMarkdownLink(watch, 'Preview')).toBe(true);
        expect(shouldEmbedYoutubeMarkdownLink(watch, watch)).toBe(true);
        expect(shouldEmbedYoutubeMarkdownLink(watch, 'https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    });

    it('keeps descriptive link text as a normal link', () => {
        expect(shouldEmbedYoutubeMarkdownLink(watch, 'Read the docs')).toBe(false);
    });
});

describe('buildYoutubeEmbedUrl', () => {
    it('uses privacy-enhanced embed host', () => {
        expect(buildYoutubeEmbedUrl('dQw4w9WgXcQ')).toBe(
            'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
        );
    });

    it('adds autoplay and the page origin so the player can start after a click', () => {
        expect(
            buildYoutubeEmbedUrl('dQw4w9WgXcQ', {
                autoplay: true,
                origin: 'http://localhost:23001',
            }),
        ).toBe(
            'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&origin=http%3A%2F%2Flocalhost%3A23001',
        );
    });
});

describe('youtubePosterUrl', () => {
    it('points at the always-available hq thumbnail', () => {
        expect(youtubePosterUrl('dQw4w9WgXcQ')).toBe(
            'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        );
    });
});

describe('isYoutubeWatchUrl', () => {
    it('matches known watch URLs', () => {
        expect(isYoutubeWatchUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
        expect(isYoutubeWatchUrl('https://vimeo.com/123')).toBe(false);
    });
});
