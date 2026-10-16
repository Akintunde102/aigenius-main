/** Request fullscreen for inline chat video (wrapper preferred so controls + letterboxing stay correct). */
export async function requestMediaFullscreen(
    container: HTMLElement | null,
    video: HTMLVideoElement | null,
): Promise<void> {
    const target = container ?? video;
    if (!target) {
        return;
    }

    try {
        if (target.requestFullscreen) {
            await target.requestFullscreen();
            return;
        }
        const webkitTarget = target as HTMLElement & { webkitRequestFullscreen?: () => void };
        if (webkitTarget.webkitRequestFullscreen) {
            webkitTarget.webkitRequestFullscreen();
            return;
        }
    } catch {
        /* fall through to video-only APIs */
    }

    if (!video) {
        return;
    }

    const webkitVideo = video as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
    if (webkitVideo.webkitEnterFullscreen) {
        webkitVideo.webkitEnterFullscreen();
    }
}

export function isMediaFullscreenActive(): boolean {
    return Boolean(
        document.fullscreenElement
        || (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement,
    );
}

export async function exitMediaFullscreen(): Promise<void> {
    if (document.exitFullscreen) {
        await document.exitFullscreen();
        return;
    }
    const doc = document as Document & { webkitExitFullscreen?: () => void };
    doc.webkitExitFullscreen?.();
}

export async function toggleMediaFullscreen(
    container: HTMLElement | null,
    video: HTMLVideoElement | null,
): Promise<void> {
    if (isMediaFullscreenActive()) {
        await exitMediaFullscreen();
        return;
    }
    await requestMediaFullscreen(container, video);
}
