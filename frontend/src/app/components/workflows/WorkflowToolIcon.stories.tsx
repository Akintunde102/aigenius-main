import type { Meta, StoryObj } from '@storybook/react';
import { WorkflowToolIcon as WorkflowToolIcon } from './WorkflowToolIcon';

const meta: Meta<typeof WorkflowToolIcon> = {
  title: 'Components/workflows/WorkflowToolIcon',
  component: WorkflowToolIcon,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof WorkflowToolIcon>;

export const Default: Story = {
  args: {},
};
