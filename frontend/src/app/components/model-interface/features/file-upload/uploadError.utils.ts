export function isUploadErrorMessage(error: string | { kind?: string } | null | undefined): boolean {
    if (!error) {
        return false;
    }
    if (typeof error !== 'string') {
        return error.kind === 'upload';
    }
    return /^Upload failed:/i.test(error.trim());
}
