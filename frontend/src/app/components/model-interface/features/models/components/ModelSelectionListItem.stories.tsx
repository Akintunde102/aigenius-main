import type { Meta, StoryObj } from '@storybook/react';
import ModelSelectionListItem from './ModelSelectionListItem';

const meta: Meta<typeof ModelSelectionListItem> = {
  title: 'Components/model-interface/features/models/components/ModelSelectionListItem',
  component: ModelSelectionListItem,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ModelSelectionListItem>;

export const Default: Story = {
  args: {},
};
