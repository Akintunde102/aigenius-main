import React from 'react';
import Image from 'next/image';

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
}) => {
    // Handle base64 images that might be truncated
    const processedImageUrl = imageUrl && imageUrl.startsWith('data:image/') && !imageUrl.includes(';base64,')
        ? `data:image/png;base64,${imageUrl.split(',')[1] || imageUrl}`
        : imageUrl;
    const previewUrl = processedImageUrl || imageUrl;

    return (
        <>
            <img
                src={previewUrl}
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
                onClick={() => setImagePreview(previewUrl)}
                onError={(e) => {
                    console.error('Image failed to load:', previewUrl);
                    console.error('Error details:', e);
                }}
            />
            {imagePreview === previewUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
                    onClick={() => setImagePreview(null)}
                >
                    <Image
                        src={previewUrl}
                        alt="preview"
                        width={600}
                        height={400}
                        unoptimized={previewUrl.startsWith('data:image/')}
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
};

interface ImageWithTextMessageProps {
    imageUrl: string;
    imageText: string;
    onImagePreview: (url: string) => void;
    imagePreview: string | null;
    setImagePreview: (url: string | null) => void;
}

export const ImageWithTextMessage: React.FC<ImageWithTextMessageProps> = ({
    imageUrl,
    imageText,
    onImagePreview,
    imagePreview,
    setImagePreview
}) => {
    // Handle base64 images that might be truncated
    const processedImageUrl = imageUrl && imageUrl.startsWith('data:image/') && !imageUrl.includes(';base64,')
        ? `data:image/png;base64,${imageUrl.split(',')[1] || imageUrl}`
        : imageUrl;
    const previewUrl = processedImageUrl || imageUrl;

    return (
        <div className="space-y-3">
            {/* Display text if present */}
            {imageText && imageText.trim() && (
                <div className="whitespace-pre-wrap break-words text-sm">
                    {imageText}
                </div>
            )}

            {/* Display image */}
            <div>
                <img
                    src={previewUrl}
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
                    onClick={() => setImagePreview(previewUrl)}
                    onError={(e) => {
                        console.error('Image failed to load:', previewUrl);
                        console.error('Error details:', e);
                    }}
                />
                {imagePreview === previewUrl && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
                        onClick={() => setImagePreview(null)}
                    >
                        <Image
                            src={previewUrl}
                            alt="preview"
                            width={600}
                            height={400}
                            unoptimized={previewUrl.startsWith('data:image/')}
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
};
