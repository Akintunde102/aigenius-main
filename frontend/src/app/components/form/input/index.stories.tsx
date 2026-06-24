import type { Meta, StoryObj } from '@storybook/react';
import index from './index';

const meta: Meta<typeof index> = {
  title: 'Components/form/input/index',
  component: index,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof index>;

export const Default: Story = {
  args: {},
};
