import type { Meta, StoryObj } from '@storybook/nextjs';
import { useState } from 'react';
import { ModelSelectionFiltersNew } from './ModelSelectionFiltersNew';
import type { ModelOrderBy, ModelOrderDir } from '@/app/components/model-interface/shared/utils';

const meta: Meta<typeof ModelSelectionFiltersNew> = {
  title: 'Components/model-interface/features/models/components/ModelSelectionFiltersNew',
  component: ModelSelectionFiltersNew,
  parameters: {
    layout: 'padded',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ModelSelectionFiltersNew>;

function FiltersDemo() {
  const [showFilterSortRow, setShowFilterSortRow] = useState(true);
  const [orderBy, setOrderBy] = useState<ModelOrderBy>('default');
  const [orderDir, setOrderDir] = useState<ModelOrderDir>('asc');
  const [imageFilterOnly, setImageFilterOnly] = useState(false);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [showWebSearch, setShowWebSearch] = useState(false);

  return (
    <div className="app-modal max-w-3xl rounded-xl border p-4" style={{ borderColor: 'var(--modal-border)', background: 'var(--modal-bg-muted)' }}>
      <ModelSelectionFiltersNew
        showFilterSortRow={showFilterSortRow}
        setShowFilterSortRow={setShowFilterSortRow}
        orderBy={orderBy}
        setOrderBy={setOrderBy}
        orderDir={orderDir}
        setOrderDir={setOrderDir}
        imageFilterOnly={imageFilterOnly}
        setImageFilterOnly={setImageFilterOnly}
        selectedProviders={selectedProviders}
        setSelectedProviders={setSelectedProviders}
        showWebSearch={showWebSearch}
        setShowWebSearch={setShowWebSearch}
        majorProviders={['google', 'x-ai', 'openai', 'anthropic', 'meta', 'deepseek', 'perplexity']}
      />
    </div>
  );
}

export const Default: Story = {
  render: () => <FiltersDemo />,
};
