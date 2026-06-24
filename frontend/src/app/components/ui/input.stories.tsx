import type { Meta, StoryObj } from '@storybook/react';
import input from './input';

const meta: Meta<typeof input> = {
  title: 'Components/ui/input',
  component: input,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof input>;

export const Default: Story = {
  args: {},
};
