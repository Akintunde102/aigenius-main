import {
  buildOllamaCloudLiveCases,
} from './ollama-cloud.harness.js';
import {
  catalogIdToWireModel,
  formatOllamaCloudError,
  getOllamaRegistryModelName,
} from './ollama-cloud.js';

describe('Ollama Cloud naming', () => {
  it('maps every catalog id to wire and registry models', () => {
    expect(buildOllamaCloudLiveCases()).toEqual([
      {
        catalogId: 'ollama:glm-5.1:cloud',
        wireModel: 'glm-5.1:cloud',
        registryModel: 'glm-5.1:cloud',
      },
      {
        catalogId: 'ollama:qwen3-coder-next:cloud',
        wireModel: 'qwen3-coder-next:cloud',
        registryModel: 'qwen3-coder-next:cloud',
      },
      {
        catalogId: 'ollama:gpt-oss:120b-cloud',
        wireModel: 'gpt-oss:120b-cloud',
        registryModel: 'gpt-oss:120b-cloud',
      },
      {
        catalogId: 'ollama:deepseek-v3.2:cloud',
        wireModel: 'deepseek-v3.2:cloud',
        registryModel: 'deepseek-v3.2:cloud',
      },
      {
        catalogId: 'ollama:kimi-k2.6:cloud',
        wireModel: 'kimi-k2.6:cloud',
        registryModel: 'kimi-k2.6:cloud',
      },
    ]);
  });

  it('leaves local model names unchanged', () => {
    expect(catalogIdToWireModel('ollama:llama3.2')).toBe('llama3.2');
    expect(getOllamaRegistryModelName('llama3.2')).toBe('llama3.2');
  });

  it('maps unauthorized cloud errors to a sign-in hint', () => {
    expect(formatOllamaCloudError('{"error": "unauthorized"}')).toContain('ollama signin');
  });
});
