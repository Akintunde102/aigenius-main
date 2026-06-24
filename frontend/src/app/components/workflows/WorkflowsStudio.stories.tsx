import type { Meta, StoryObj } from '@storybook/react';
import WorkflowsStudio from './WorkflowsStudio';

const meta: Meta<typeof WorkflowsStudio> = {
  title: 'Components/workflows/WorkflowsStudio',
  component: WorkflowsStudio,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof WorkflowsStudio>;

export const Default: Story = {
  args: {},
};
