import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import "../../styles/gallery.scss";
import { CloudFile } from "./file.interface";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { useRouter } from "next/navigation";

interface ImageLoadState {
    [key: string]: 'loading' | 'loaded' | 'error';
}

export default function Gallery({ images }: { images: CloudFile[] }) {
    const [hoveredImage, setHoveredImage] = useState<CloudFile | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [imageLoadStates, setImageLoadStates] = useState<ImageLoadState>({});
    const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());

    const router = useRouter();



    const getFileSizeText = (fileSizeInBytes?: number) => {

        if (!fileSizeInBytes) {
            return "Unknown";
        }

        if (fileSizeInBytes < 1000) {
            return fileSizeInBytes + " Bytes";
        }

        if (fileSizeInBytes < 1000000) {
            return (fileSizeInBytes / 1000).toFixed(2) + " KB";
        }

        if (fileSizeInBytes < 1000000000) {
            return (fileSizeInBytes / 1000000).toFixed(2) + " MB";
        }

        if (fileSizeInBytes < 1000000000000) {
            return (fileSizeInBytes / 1000000000).toFixed(2) + " GB";
        }

        return "Unknown";
    };

    // Preload images for better performance
    const preloadImage = useCallback((src: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (preloadedImages.has(src)) {
                resolve();
                return;
            }

            const img = document.createElement('img');
            img.onload = () => {
                setPreloadedImages(prev => new Set(prev).add(src));
                setImageLoadStates(prev => ({ ...prev, [src]: 'loaded' }));
                resolve();
            };
            img.onerror = () => {
                setImageLoadStates(prev => ({ ...prev, [src]: 'error' }));
                reject(new Error(`Failed to load image: ${src}`));
            };
            img.src = src;
            img.crossOrigin = 'anonymous';
        });
    }, [preloadedImages]);

    // Preload images on component mount
    useEffect(() => {
        const preloadImages = async () => {
            const preloadPromises = images.slice(0, 10).map(image => {
                setImageLoadStates(prev => ({ ...prev, [image.s3Link]: 'loading' }));
                return preloadImage(image.s3Link);
            });

            try {
                await Promise.allSettled(preloadPromises);
            } catch (error) {
                console.warn('Some images failed to preload:', error);
            }
        };

        if (images.length > 0) {
            preloadImages();
        }
    }, [images, preloadImage]);

    return (

        <section
            className='mt-2 w-[1350px]'
            style={{ maxWidth: "100%", marginInline: "auto" }}
        >
            <div className='mt-24 pb-3 text-lg text-stone-600 flex justify-between'>

                <span className="title">Your Image Files</span>

                <span className="details" >
                    {hoveredImage && (
                        <div className="flex" >
                            <span className="text-[10px] ml-10">FileSize: {getFileSizeText(hoveredImage.fileSizeInBytes)}</span>
                            <span className="text-[10px] ml-1">, Uploaded: {new Date(hoveredImage.createdAt).toDateString()}</span>
                        </div>
                    )}
                </span>
            </div>
            <div className="gallery-container">
                <div className="gallery">
                    <div className="grid">
                        {images.map((image, index) => {
                            const loadState = imageLoadStates[image.s3Link] || 'loading';
                            const isPreloaded = preloadedImages.has(image.s3Link);

                            return (
                                <div
                                    key={index}
                                    className="gallery__item"
                                    onMouseEnter={() => setHoveredImage(image)}
                                    onMouseLeave={() => setHoveredImage(null)}
                                    onClick={
                                        () => {
                                            router.push(`/upload/${image.id}`);
                                            if (typeof window !== 'undefined') {
                                                copyToClipboard(`${window.location.origin}/upload/${image.id}`, "File Link Copied ")
                                            }
                                        }
                                    }
                                >
                                    {loadState === 'loading' && !isPreloaded && (
                                        <div className="image-loading-skeleton">
                                            <div className="skeleton-content"></div>
                                        </div>
                                    )}

                                    {loadState === 'error' && (
                                        <div className="image-error">
                                            <div className="error-icon">⚠️</div>
                                            <div className="error-text">Failed to load</div>
                                        </div>
                                    )}

                                    {(loadState === 'loaded' || isPreloaded || loadState === 'loading' && index < 10) && (
                                        <Image
                                            src={image.s3Link}
                                            alt={image.name}
                                            fill
                                            sizes="(max-width: 640px) 280px, (max-width: 768px) 320px, (max-width: 1024px) 350px, 380px"
                                            style={{ objectFit: 'cover' }}
                                            onLoad={() => {
                                                setImageLoadStates(prev => ({ ...prev, [image.s3Link]: 'loaded' }));
                                            }}
                                            onError={() => {
                                                setImageLoadStates(prev => ({ ...prev, [image.s3Link]: 'error' }));
                                            }}
                                            loading={index < 5 ? "eager" : "lazy"}
                                            placeholder="blur"
                                            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAoACgDASIAAhEBAxEB/8QAFwAAAwEAAAAAAAAAAAAAAAAAAAMEB//EACUQAAIBAwMEAwEBAAAAAAAAAAECAwAEEQUSITFBURNhcZEigf/EABUBAFEAAAAAAAAAAAAAAAAAAAH/xAAVEQEBAAAAAAAAAAAAAAAAAAAAAf/aAAwDAQACEQMRAD8A4+iiigAooooAKKKKACiiigAooooAKKKKACiiigD/2Q=="
                                        />
                                    )}

                                    <div className="desc">{image.name}</div>
                                    {copied === image.s3Link && <span className="copied-message">Copied!</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>


            </div>
        </section >
    );
}

