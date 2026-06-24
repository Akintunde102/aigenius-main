import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}


export function isValidJsonObjectOrArray(jsonString: string): { isValid: boolean, type?: 'object' | 'array' } {
    try {
        const parsed = JSON.parse(jsonString);

        if (typeof parsed === 'object' && parsed !== null) {
            if (Array.isArray(parsed)) {
                return { isValid: true, type: 'array' };
            }
            return { isValid: true, type: 'object' };
        }

        return { isValid: false };
    } catch (error) {
        return { isValid: false };
    }
}


export const addCommas = (value: number) => {
    if (isNaN(value)) return '';
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value);
}


export function slugify(text: string, date?: Date): string {
    const now = date ?? new Date();
    const uniqueString = `${now.getFullYear().toString().slice(-2)}${now.getMonth() + 1}${now.getDate()}`;
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '')             // Trim - from end of text
        .concat(`-${uniqueString}`);    // Add date uniqueness
}
