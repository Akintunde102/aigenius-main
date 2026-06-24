import React from 'react';
import Image from 'next/image';
import { MarkdownRenderer } from '@/app/components/model-interface/shared/components';
import { textPartToPlainString } from '@/lib/utils/messageTextUtils';

// Component for rendering structured content with text and images
interface StructuredMessageProps {
    content: Array<{
        type: string;
        text?: string;
        image_url?: { url: string };
    }>;
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
    streaming = false
}) => (
    <div className="space-y-3 md:space-y-4">
        {content.map((block, index) => {
            const textForMd = textPartToPlainString(block.text);
            const blockImageUrl = block.image_url?.url;
            if (block.type === 'text' && textForMd) {
                return (
                    <div key={index} className="break-words">
                        <MarkdownRenderer content={textForMd} />
                        {streaming && index === content.length - 1 && (
                            <span className="animate-pulse">▊</span>
                        )}
                    </div>
                );
            } else if (block.type === 'image_url' && blockImageUrl) {
                return (
                    <div key={index} className="space-y-2">
                        {/* Display text if it exists alongside the image */}
                        {textForMd && (
                            <div className="break-words">
                                <MarkdownRenderer content={textForMd} />
                            </div>
                        )}
                        {/* Display the image */}
                        <div>
                            <img
                                src={blockImageUrl}
                                alt="generated"
                                style={{
                                    maxWidth: '100%',
                                    height: 'auto',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    border: '2px solid #e6e8f9',
                                    display: 'block'
                                }}
                                loading="lazy"
                                decoding="async"
                                onClick={() => setImagePreview(blockImageUrl)}
                            />
                            {imagePreview === blockImageUrl && (
                                <div
                                    className="fixed inset-0 z-[110] flex items-center justify-center bg-black bg-opacity-70"
                                    onClick={() => setImagePreview(null)}
                                >
                                    <Image
                                        src={blockImageUrl}
                                        alt="preview"
                                        width={600}
                                        height={400}
                                        style={{
                                            maxWidth: '90%',
                                            maxHeight: '90%',
                                            width: 'auto',
                                            height: 'auto',
                                            borderRadius: 12,
                                            boxShadow: '0 4px 32px rgba(0,0,0,0.3)'
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                );
            }
            return null;
        })}
    </div>
);

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
    setImagePreview
}) => (
    <>
        <img
            src={imageUrl}
            alt="uploaded"
            style={{
                maxWidth: '100%',
                height: 'auto',
                borderRadius: 8,
                cursor: 'pointer',
                border: '2px solid #e6e8f9',
                display: 'block'
            }}
            loading="lazy"
            decoding="async"
            onClick={() => setImagePreview(imageUrl)}
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
                        boxShadow: '0 4px 32px rgba(0,0,0,0.3)'
                    }}
                />
            </div>
        )}
    </>
);
