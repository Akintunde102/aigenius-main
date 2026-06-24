import type { Meta, StoryObj } from '@storybook/react';
import { ModelSearchBar as ModelSearchBar } from './ModelSearchBar';

const meta: Meta<typeof ModelSearchBar> = {
  title: 'Components/model-interface/features/models/components/ModelSearchBar',
  component: ModelSearchBar,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ModelSearchBar>;

export const Default: Story = {
  args: {},
};
