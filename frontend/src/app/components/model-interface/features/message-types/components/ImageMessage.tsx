import React from 'react';
import { MarkdownRenderer } from '@/app/components/model-interface/shared/components';
import { MessageAttachmentCard } from './MessageAttachmentCard';
import {
    segmentStructuredContent,
    type StructuredContentBlock,
    type StructuredMessageSegment,
    type MessageAttachment,
} from './messageAttachment.utils';

function mergeAttachmentSegments(
    segments: StructuredMessageSegment[],
): StructuredMessageSegment[] {
    const merged: StructuredMessageSegment[] = [];
    let pendingAttachments: MessageAttachment[] = [];

    const flushAttachments = () => {
        if (pendingAttachments.length === 0) {
            return;
        }
        merged.push({
            type: 'attachments',
            items: pendingAttachments,
            key: `attachments-${merged.length}`,
        });
        pendingAttachments = [];
    };

    segments.forEach((segment) => {
        if (segment.type === 'attachments') {
            pendingAttachments.push(...segment.items);
            return;
        }
        flushAttachments();
        merged.push(segment);
    });

    flushAttachments();
    return merged;
}

interface StructuredMessageProps {
    content: StructuredContentBlock[];
    onImagePreview: (url: string) => void;
    imagePreview: string | null;
    setImagePreview: (url: string | null) => void;
    streaming?: boolean;
    /** When set, stream cursor only renders on assistant turns. */
    role?: string;
    attachmentCacheSeed?: string | number | null;
}

export const StructuredMessage: React.FC<StructuredMessageProps> = ({
    content,
    onImagePreview,
    setImagePreview,
    streaming = false,
    role = 'assistant',
    attachmentCacheSeed,
}) => {
    const segments = mergeAttachmentSegments(segmentStructuredContent(content));
    const attachmentSegments = segments.filter((segment) => segment.type === "attachments");
    const textSegments = segments.filter((segment) => segment.type === "text");
    const orderedSegments = [...attachmentSegments, ...textSegments];

    return (
        <div className="space-y-3 md:space-y-4">
            {orderedSegments.map((segment, segmentIndex) => {
                if (segment.type === 'text') {
                    const isLast = segmentIndex === orderedSegments.length - 1;
                    const showStreamCursor = streaming && role === 'assistant' && isLast;
                    return (
                        <div key={segment.key} className="break-words">
                            <MarkdownRenderer content={segment.text} />
                            {showStreamCursor ? (
                                <span className="animate-pulse">▊</span>
                            ) : null}
                        </div>
                    );
                }

                return (
                    <div key={segment.key} className="flex flex-row flex-wrap items-start gap-2">
                        {segment.items.map((item) => (
                            <MessageAttachmentCard
                                key={`${item.fileUrl}-${item.fileName}`}
                                kind={item.kind}
                                fileName={item.fileName}
                                fileUrl={item.fileUrl}
                                attachmentCacheSeed={attachmentCacheSeed}
                                onPreview={(target) => {
                                    onImagePreview(target as any);
                                    setImagePreview(target as any);
                                }}
                                onImagePreview={(url, name, kind) => {
                                    const target = { fileUrl: url, fileName: name || item.fileName, kind: kind || item.kind };
                                    onImagePreview(target as any);
                                    setImagePreview(target as any);
                                }}
                            />
                        ))}
                    </div>
                );
            })}

        </div>
    );
};

interface ImageMessageProps {
    imageUrl: string;
    onImagePreview: (url: string) => void;
    imagePreview: string | null;
    setImagePreview: (url: string | null) => void;
    attachmentCacheSeed?: string | number | null;
}

export const ImageMessage: React.FC<ImageMessageProps> = ({
    imageUrl,
    onImagePreview,
    setImagePreview,
    attachmentCacheSeed,
}) => (
  <MessageAttachmentCard
    kind="image"
    fileName="Image"
    fileUrl={imageUrl}
    attachmentCacheSeed={attachmentCacheSeed}
    onPreview={(target) => {
      onImagePreview(target as any);
      setImagePreview(target as any);
    }}
    onImagePreview={(url) => {
      onImagePreview(url);
      setImagePreview(url);
    }}
  />
);
