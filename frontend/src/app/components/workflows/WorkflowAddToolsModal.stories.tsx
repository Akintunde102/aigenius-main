import type { Meta, StoryObj } from '@storybook/react';
import { WorkflowAddToolsModal as WorkflowAddToolsModal } from './WorkflowAddToolsModal';

const meta: Meta<typeof WorkflowAddToolsModal> = {
  title: 'Components/workflows/WorkflowAddToolsModal',
  component: WorkflowAddToolsModal,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof WorkflowAddToolsModal>;

export const Default: Story = {
  args: {},
};
