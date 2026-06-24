import type { Meta, StoryObj } from '@storybook/react';
import { ModelSelectionCard as ModelSelectionCard } from './ModelSelectionCard';

const meta: Meta<typeof ModelSelectionCard> = {
  title: 'Components/model-interface/features/models/components/ModelSelectionCard',
  component: ModelSelectionCard,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ModelSelectionCard>;

export const Default: Story = {
  args: {},
};
