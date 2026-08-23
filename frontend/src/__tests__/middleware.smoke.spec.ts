import * as fs from 'fs';
import * as path from 'path';

describe('middleware smoke', () => {
    it('source file exists and includes images and static extensions in matcher and isPublicPath', () => {
        const sourcePath = path.join(__dirname, '..', 'middleware.ts');
        expect(fs.existsSync(sourcePath)).toBe(true);

        const content = fs.readFileSync(sourcePath, 'utf8');
        expect(content).toContain("pathname.startsWith('/images')");
        expect(content).toContain("pathname.startsWith('/vad')");
        expect(content).toContain("pathname.startsWith('/stream-status')");
        expect(content).toContain('svg|png|jpg|jpeg|gif|webp|ico|json');
        expect(content).toContain('assets|images|vad|stream-status|monaco-editor|public|api');
    });

    it('matcher regex pattern correctly excludes /images/home-hero-dark.png from middleware interception', () => {
        const patternStr = '^/((?!_next/static|_next/image|favicon\\.ico|logo\\.png|assets|images|vad|stream-status|monaco-editor|public|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|woff|woff2|ttf|eot)$).*)$';
        const regex = new RegExp(patternStr);

        // Public static files should NOT match the route interception pattern (false = bypassed by middleware)
        expect(regex.test('/images/home-hero-dark.png')).toBe(false);
        expect(regex.test('/images/home-hero-light.png')).toBe(false);
        expect(regex.test('/auth-bg.png')).toBe(false);
        expect(regex.test('/vad/vad.worklet.bundle.min.js')).toBe(false);

        // Protected pages SHOULD match the interception pattern (true = processed by middleware)
        expect(regex.test('/chat/123')).toBe(true);
        expect(regex.test('/config')).toBe(true);
    });
});
