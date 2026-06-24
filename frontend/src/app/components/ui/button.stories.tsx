import type { Meta, StoryObj } from '@storybook/react';
import button from './button';

const meta: Meta<typeof button> = {
  title: 'Components/ui/button',
  component: button,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof button>;

export const Default: Story = {
  args: {},
};
