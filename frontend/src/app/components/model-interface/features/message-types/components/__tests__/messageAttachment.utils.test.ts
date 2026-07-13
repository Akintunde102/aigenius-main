import {
    attachmentFromContentBlock,
    preprocessStructuredBlocks,
    segmentStructuredContent,
} from './messageAttachment.utils';

describe('messageAttachment.utils', () => {
    it('detects file links encoded as text blocks', () => {
        expect(
            attachmentFromContentBlock({
                type: 'text',
                text: 'report.pdf: https://cdn.example.com/report.pdf',
            }),
        ).toEqual({
            kind: 'file',
            fileName: 'report.pdf',
            fileUrl: 'https://cdn.example.com/report.pdf',
        });
    });

    it('treats pdf image_url blocks as file cards, not image previews', () => {
        expect(
            attachmentFromContentBlock({
                type: 'image_url',
                image_url: {
                    url: 'https://res.cloudinary.com/demo/raw/upload/v1/resume.pdf',
                },
            }),
        ).toEqual({
            kind: 'file',
            fileName: 'resume.pdf',
            fileUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/resume.pdf',
        });
    });

    it('merges split filename and url text blocks', () => {
        expect(
            preprocessStructuredBlocks([
                { type: 'text', text: "Owoseni Clinton's Resume.pdf:" },
                { type: 'text', text: 'https://cdn.example.com/resume.pdf' },
            ]),
        ).toEqual([
            { type: 'text', text: "Owoseni Clinton's Resume.pdf: https://cdn.example.com/resume.pdf" },
        ]);
    });

    it('segments text above attachment cards and hides duplicate labels', () => {
        expect(
            segmentStructuredContent([
                { type: 'text', text: 'hi' },
                {
                    type: 'text',
                    text: 'report.pdf: https://cdn.example.com/report.pdf',
                },
                {
                    type: 'image_url',
                    image_url: { url: 'https://cdn.example.com/photo.png' },
                },
            ]),
        ).toEqual([
            { type: 'text', text: 'hi', key: 'text-0' },
            {
                type: 'attachments',
                key: 'attachments-1',
                items: [
                    {
                        kind: 'file',
                        fileName: 'report.pdf',
                        fileUrl: 'https://cdn.example.com/report.pdf',
                    },
                    {
                        kind: 'image',
                        fileName: 'photo.png',
                        fileUrl: 'https://cdn.example.com/photo.png',
                    },
                ],
            },
        ]);
    });

    it('dedupes pdf preview image_url plus legacy text label', () => {
        const url = 'https://res.cloudinary.com/demo/raw/upload/v1/resume.pdf';
        expect(
            segmentStructuredContent([
                { type: 'image_url', image_url: { url } },
                { type: 'text', text: `resume.pdf:\n${url}` },
            ]),
        ).toEqual([
            {
                type: 'attachments',
                key: 'attachments-0',
                items: [
                    {
                        kind: 'file',
                        fileName: 'resume.pdf',
                        fileUrl: url,
                    },
                ],
            },
        ]);
    });

    it('prefers human filenames over cloudinary slugs when deduping', () => {
        const url = 'https://res.cloudinary.com/demo/raw/upload/v1/uuid_owoseni-clintons-resume.pdf';
        expect(
            segmentStructuredContent([
                { type: 'image_url', image_url: { url } },
                {
                    type: 'text',
                    text: `Owoseni Clinton's Resume.pdf:\n${url}`,
                },
            ]),
        ).toEqual([
            {
                type: 'attachments',
                key: 'attachments-0',
                items: [
                    {
                        kind: 'file',
                        fileName: "Owoseni Clinton's Resume.pdf",
                        fileUrl: url,
                    },
                ],
            },
        ]);
    });

    it('detects audio attachments from file_url blocks', () => {
        expect(
            attachmentFromContentBlock({
                type: 'file_url',
                file_url: {
                    name: 'voice-note.mp3',
                    url: 'https://cdn.example.com/voice-note.mp3',
                },
            }),
        ).toEqual({
            kind: 'audio',
            fileName: 'voice-note.mp3',
            fileUrl: 'https://cdn.example.com/voice-note.mp3',
        });
    });

    it('detects legacy input_audio blocks as audio cards', () => {
        expect(
            attachmentFromContentBlock({
                type: 'input_audio',
                input_audio: { data: 'abc123', format: 'mp3' },
            }),
        ).toEqual({
            kind: 'audio',
            fileName: 'audio.mp3',
            fileUrl: 'data:audio/mp3;base64,abc123',
        });
    });
});
