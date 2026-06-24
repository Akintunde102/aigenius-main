import type { Meta, StoryObj } from '@storybook/react';
import { ModelSelectionFiltersNew as ModelSelectionFiltersNew } from './ModelSelectionFiltersNew';

const meta: Meta<typeof ModelSelectionFiltersNew> = {
  title: 'Components/model-interface/features/models/components/ModelSelectionFiltersNew',
  component: ModelSelectionFiltersNew,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ModelSelectionFiltersNew>;

export const Default: Story = {
  args: {},
};
