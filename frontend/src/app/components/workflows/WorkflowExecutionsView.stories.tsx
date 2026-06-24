import type { Meta, StoryObj } from '@storybook/react';
import WorkflowExecutionsView from './WorkflowExecutionsView';

const meta: Meta<typeof WorkflowExecutionsView> = {
  title: 'Components/workflows/WorkflowExecutionsView',
  component: WorkflowExecutionsView,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof WorkflowExecutionsView>;

export const Default: Story = {
  args: {},
};
