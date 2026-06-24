import type { Meta, StoryObj } from '@storybook/react';
import WorkflowExecutionsPage from './page';

const meta: Meta<typeof WorkflowExecutionsPage> = {
  title: 'Pages/workflow/[id]/executions',
  component: WorkflowExecutionsPage,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof WorkflowExecutionsPage>;

export const Default: Story = {
  args: {},
};
