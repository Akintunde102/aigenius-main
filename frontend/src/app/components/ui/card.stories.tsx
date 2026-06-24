import type { Meta, StoryObj } from '@storybook/react';
import card from './card';

const meta: Meta<typeof card> = {
  title: 'Components/ui/card',
  component: card,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof card>;

export const Default: Story = {
  args: {},
};
