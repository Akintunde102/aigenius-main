import type { Meta, StoryObj } from '@storybook/react';
import { WorkflowSuiteInfoIcon as WorkflowSuiteInfoIcon } from './WorkflowSuiteInfoIcon';

const meta: Meta<typeof WorkflowSuiteInfoIcon> = {
  title: 'Components/workflows/WorkflowSuiteInfoIcon',
  component: WorkflowSuiteInfoIcon,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof WorkflowSuiteInfoIcon>;

export const Default: Story = {
  args: {},
};
