export function isUploadErrorMessage(message: string): boolean {
    return /^Upload failed:/i.test(message.trim());
}
