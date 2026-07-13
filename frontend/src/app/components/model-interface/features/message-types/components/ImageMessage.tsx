import React from 'react';
import Image from 'next/image';
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
}

export const StructuredMessage: React.FC<StructuredMessageProps> = ({
    content,
    onImagePreview,
    imagePreview,
    setImagePreview,
    streaming = false,
}) => {
    const segments = mergeAttachmentSegments(segmentStructuredContent(content));
    const attachmentSegments = segments.filter((segment) => segment.type === "attachments");
    const textSegments = segments.filter((segment) => segment.type === "text");
    const orderedSegments = [...attachmentSegments, ...textSegments];

    return (
        <div className="space-y-3 md:space-y-4">
            {orderedSegments.map((segment, segmentIndex) => {
                if (segment.type === 'text') {
                    const isLast = segmentIndex === segments.length - 1;
                    return (
                        <div key={segment.key} className="break-words">
                            <MarkdownRenderer content={segment.text} />
                            {streaming && isLast && (
                                <span className="animate-pulse">▊</span>
                            )}
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
                                onImagePreview={(url) => {
                                    onImagePreview(url);
                                    setImagePreview(url);
                                }}
                            />
                        ))}
                    </div>
                );
            })}

            {imagePreview && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center bg-black bg-opacity-70"
                    onClick={() => setImagePreview(null)}
                    role="presentation"
                >
                    <Image
                        src={imagePreview}
                        alt="preview"
                        width={600}
                        height={400}
                        style={{
                            maxWidth: '90%',
                            maxHeight: '90%',
                            width: 'auto',
                            height: 'auto',
                            borderRadius: 12,
                            boxShadow: '0 4px 32px rgba(0,0,0,0.3)',
                        }}
                    />
                </div>
            )}
        </div>
    );
};

interface ImageMessageProps {
    imageUrl: string;
    onImagePreview: (url: string) => void;
    imagePreview: string | null;
    setImagePreview: (url: string | null) => void;
}

export const ImageMessage: React.FC<ImageMessageProps> = ({
    imageUrl,
    onImagePreview,
    imagePreview,
    setImagePreview,
}) => (
  <>
    <MessageAttachmentCard
      kind="image"
      fileName="Image"
      fileUrl={imageUrl}
      onImagePreview={(url) => {
        onImagePreview(url);
        setImagePreview(url);
      }}
    />
    {imagePreview === imageUrl && (
      <div
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black bg-opacity-70"
        onClick={() => setImagePreview(null)}
      >
        <Image
          src={imageUrl}
          alt="preview"
          width={600}
          height={400}
          style={{
            maxWidth: '90%',
            maxHeight: '90%',
            width: 'auto',
            height: 'auto',
            borderRadius: 12,
            boxShadow: '0 4px 32px rgba(0,0,0,0.3)',
          }}
        />
      </div>
    )}
  </>
);
