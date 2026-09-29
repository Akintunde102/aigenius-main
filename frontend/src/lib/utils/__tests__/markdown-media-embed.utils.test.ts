import {
    isEmbeddableAudioFileUrl,
    isEmbeddableMediaFileUrl,
    isEmbeddableVideoFileUrl,
    mimeTypeForMediaUrl,
    shouldEmbedMediaMarkdownLink,
} from '../markdown-media-embed.utils';

describe('markdown media embed utils', () => {
    it('detects common video file URLs', () => {
        expect(isEmbeddableVideoFileUrl('https://cdn.example.com/clips/demo.mp4')).toBe(true);
        expect(isEmbeddableVideoFileUrl('https://cdn.example.com/clips/demo.MP4?token=1')).toBe(true);
        expect(isEmbeddableVideoFileUrl('https://cdn.example.com/page.html')).toBe(false);
    });

    it('detects audio file URLs', () => {
        expect(isEmbeddableAudioFileUrl('https://cdn.example.com/song.mp3')).toBe(true);
        expect(isEmbeddableMediaFileUrl('https://cdn.example.com/song.mp3')).toBe(true);
    });

    it('embeds preview-style links', () => {
        const mp4 = 'https://files.example.com/clip.webm';
        expect(shouldEmbedMediaMarkdownLink(mp4, 'Preview')).toBe(true);
        expect(shouldEmbedMediaMarkdownLink(mp4, mp4)).toBe(true);
        expect(shouldEmbedMediaMarkdownLink(mp4, 'Download page')).toBe(false);
    });

    it('resolves mime types from extensions', () => {
        expect(mimeTypeForMediaUrl('https://x.test/a.mp4')).toBe('video/mp4');
        expect(mimeTypeForMediaUrl('https://x.test/a.mp3')).toBe('audio/mpeg');
    });
});
