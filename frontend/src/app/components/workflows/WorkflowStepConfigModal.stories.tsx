import type { Meta, StoryObj } from '@storybook/react';
import { WorkflowStepConfigModal as WorkflowStepConfigModal } from './WorkflowStepConfigModal';

const meta: Meta<typeof WorkflowStepConfigModal> = {
  title: 'Components/workflows/WorkflowStepConfigModal',
  component: WorkflowStepConfigModal,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof WorkflowStepConfigModal>;

export const Default: Story = {
  args: {},
};
