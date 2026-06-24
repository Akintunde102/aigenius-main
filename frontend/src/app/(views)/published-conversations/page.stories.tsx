import type { Meta, StoryObj } from '@storybook/react';
import async from './page';

const meta: Meta<typeof async> = {
  title: 'Pages/published-conversations',
  component: async,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof async>;

export const Default: Story = {
  args: {},
};
