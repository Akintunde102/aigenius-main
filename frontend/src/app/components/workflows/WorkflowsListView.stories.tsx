import type { Meta, StoryObj } from '@storybook/react';
import WorkflowsListView from './WorkflowsListView';

const meta: Meta<typeof WorkflowsListView> = {
  title: 'Components/workflows/WorkflowsListView',
  component: WorkflowsListView,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof WorkflowsListView>;

export const Default: Story = {
  args: {},
};
