import type { Meta, StoryObj } from '@storybook/react';
import { ModelSelectionGrid as ModelSelectionGrid } from './ModelSelectionGrid';

const meta: Meta<typeof ModelSelectionGrid> = {
  title: 'Components/model-interface/features/models/components/ModelSelectionGrid',
  component: ModelSelectionGrid,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ModelSelectionGrid>;

export const Default: Story = {
  args: {},
};
