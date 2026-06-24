import type { Meta, StoryObj } from '@storybook/react';
import { ModelFilters as ModelFilters } from './ModelFilters';

const meta: Meta<typeof ModelFilters> = {
  title: 'Components/model-interface/features/models/components/ModelFilters',
  component: ModelFilters,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ModelFilters>;

export const Default: Story = {
  args: {},
};
