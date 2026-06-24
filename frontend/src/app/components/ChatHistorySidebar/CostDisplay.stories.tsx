import type { Meta, StoryObj } from '@storybook/react';
import CostDisplay from './CostDisplay';

const meta: Meta<typeof CostDisplay> = {
  title: 'Components/ChatHistorySidebar/CostDisplay',
  component: CostDisplay,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof CostDisplay>;

export const Default: Story = {
  args: {},
};
