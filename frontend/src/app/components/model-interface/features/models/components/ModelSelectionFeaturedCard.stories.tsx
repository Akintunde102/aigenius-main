import type { Meta, StoryObj } from '@storybook/react';
import ModelSelectionFeaturedCard from './ModelSelectionFeaturedCard';

const meta: Meta<typeof ModelSelectionFeaturedCard> = {
  title: 'Components/model-interface/features/models/components/ModelSelectionFeaturedCard',
  component: ModelSelectionFeaturedCard,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ModelSelectionFeaturedCard>;

export const Default: Story = {
  args: {},
};
