/**
 * Run file message parsing tests with Node (no Jest). Exit 0 if all pass.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Load the parser from the built or source - we need to test the logic.
// In a Next.js project, we can't easily require TS. So we inlined the parser logic for this script.
function parseFileMessageFromString(raw) {
    const result = { isFileMsg: false, fileUrl: '', fileName: '' };
    if (raw.startsWith('<a href=')) {
        const match = raw.match(/href='([^']+)'[^>]*>([^<]+)<\/a>/);
        if (match) {
            result.isFileMsg = true;
            result.fileUrl = match[1];
            result.fileName = match[2];
        }
        return result;
    }
    const httpsIdx = raw.indexOf('https://');
    const httpIdx = raw.indexOf('http://');
    const urlStart = httpsIdx === -1 ? httpIdx : (httpIdx === -1 ? httpsIdx : Math.min(httpsIdx, httpIdx));
    if (urlStart === -1) return result;
    const beforeUrl = raw.slice(0, urlStart).trim();
    const sep = beforeUrl.lastIndexOf(':');
    if (sep === -1) return result;
    result.fileName = beforeUrl.slice(0, sep).trim().replace(/^\*\*|\*\*$/g, '');
    result.fileUrl = raw.slice(urlStart).trim();
    if (result.fileName && result.fileUrl.startsWith('http')) {
        result.isFileMsg = true;
    }
    return result;
}

let failed = 0;

function ok(cond, msg) {
    if (!cond) {
        console.error('FAIL:', msg);
        failed++;
    } else {
        console.log('OK:', msg);
    }
}

function deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

// Test 1: plain "fileName: https://..."
const r1 = parseFileMessageFromString('Cover Letter.pdf: https://res.cloudinary.com/dsph6hnfu/raw/upload/v1770547723/uploads/83f3ce53-1f4b-4775-937e-9baeeeb44585_cover-letter.pdf');
ok(r1.isFileMsg && r1.fileName === 'Cover Letter.pdf' && r1.fileUrl.startsWith('https://res.cloudinary.com'), 'plain fileName: https://...');

// Test 2: **fileName:** https://...
const r2 = parseFileMessageFromString('**Cover Letter.pdf:** https://res.cloudinary.com/dsph6hnfu/raw/upload/v1770547723/uploads/83f3ce53-1f4b-4775-937e-9baeeeb44585_cover-letter.pdf');
ok(r2.isFileMsg && r2.fileName === 'Cover Letter.pdf' && r2.fileUrl.includes('https://res.cloudinary.com'), '**fileName:** https://...');

// Test 3: fileName: http://...
const r3 = parseFileMessageFromString('Document.txt: http://example.com/doc.txt');
ok(r3.isFileMsg && r3.fileName === 'Document.txt' && r3.fileUrl === 'http://example.com/doc.txt', 'fileName: http://...');

// Test 4: no prefix
const r4 = parseFileMessageFromString('Check out https://example.com');
ok(!r4.isFileMsg && r4.fileName === '' && r4.fileUrl === '', 'no fileName prefix');

// Test 5: HTML link
const r5 = parseFileMessageFromString("<a href='https://example.com/doc.pdf'>doc.pdf</a>");
ok(r5.isFileMsg && r5.fileName === 'doc.pdf' && r5.fileUrl === 'https://example.com/doc.pdf', 'HTML link');

if (failed > 0) {
    console.error('\n' + failed + ' test(s) failed');
    process.exit(1);
}
console.log('\nAll 5 tests passed.');
process.exit(0);
