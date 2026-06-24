import type { Meta, StoryObj } from '@storybook/react';
import ModelSelectionRecentlyPicked from './ModelSelectionRecentlyPicked';

const meta: Meta<typeof ModelSelectionRecentlyPicked> = {
  title: 'Components/model-interface/features/models/components/ModelSelectionRecentlyPicked',
  component: ModelSelectionRecentlyPicked,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ModelSelectionRecentlyPicked>;

export const Default: Story = {
  args: {},
};
