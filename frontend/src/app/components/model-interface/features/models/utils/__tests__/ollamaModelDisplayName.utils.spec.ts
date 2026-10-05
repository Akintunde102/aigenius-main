import {
    formatLocalRuntimeModelName,
    isOllamaCatalogId,
    withLocalRuntimeDisplayName,
} from '../ollamaModelDisplayName.utils';

describe('formatLocalRuntimeModelName', () => {
    it('prefixes a local Ollama tag with the app name', () => {
        expect(formatLocalRuntimeModelName('llama3:8b')).toBe('Ollama: llama3:8b');
    });

    it('prefixes a raw catalog id after stripping the technical prefix', () => {
        expect(formatLocalRuntimeModelName('ollama:qwen2.5:7b')).toBe('Ollama: qwen2.5:7b');
    });

    it('keeps a name that already starts with the app name', () => {
        expect(formatLocalRuntimeModelName('Ollama Cloud: GLM-5.1')).toBe('Ollama Cloud: GLM-5.1');
        expect(formatLocalRuntimeModelName('Ollama: llama3')).toBe('Ollama: llama3');
    });

    it('uses a custom runtime app name when one is provided', () => {
        expect(formatLocalRuntimeModelName('mistral:7b', 'LM Studio')).toBe('LM Studio: mistral:7b');
    });

    it('returns the app name when the raw name is empty', () => {
        expect(formatLocalRuntimeModelName('   ')).toBe('Ollama');
    });
});

describe('withLocalRuntimeDisplayName', () => {
    it('prefixes local running Ollama models', () => {
        expect(withLocalRuntimeDisplayName({
            id: 'ollama:llama3:latest',
            name: 'llama3:latest',
            provider: 'ollama',
        })).toEqual({
            id: 'ollama:llama3:latest',
            name: 'Ollama: llama3:latest',
            provider: 'ollama',
        });
    });

    it('leaves cloud catalog names that already include the prefix', () => {
        const model = {
            id: 'ollama:glm-5.1:cloud',
            name: 'Ollama Cloud: GLM-5.1',
            provider: 'ollama',
        };
        expect(withLocalRuntimeDisplayName(model)).toBe(model);
    });

    it('does not prefix hosted catalog models', () => {
        const model = { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openai' };
        expect(withLocalRuntimeDisplayName(model)).toBe(model);
    });
});

describe('isOllamaCatalogId', () => {
    it('matches ollama catalog ids', () => {
        expect(isOllamaCatalogId('ollama:llama3')).toBe(true);
        expect(isOllamaCatalogId('ollama/mistral')).toBe(true);
        expect(isOllamaCatalogId('openai/gpt-4o')).toBe(false);
        expect(isOllamaCatalogId(undefined)).toBe(false);
    });
});
