import type { Meta, StoryObj } from '@storybook/react';
import WorkflowNewRedirect from './WorkflowNewRedirect';

const meta: Meta<typeof WorkflowNewRedirect> = {
  title: 'Components/workflows/WorkflowNewRedirect',
  component: WorkflowNewRedirect,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof WorkflowNewRedirect>;

export const Default: Story = {
  args: {},
};
