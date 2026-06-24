import type { Meta, StoryObj } from '@storybook/react';
import { WorkflowDynamicValueInserter as WorkflowDynamicValueInserter } from './WorkflowDynamicValueInserter';

const meta: Meta<typeof WorkflowDynamicValueInserter> = {
  title: 'Components/workflows/WorkflowDynamicValueInserter',
  component: WorkflowDynamicValueInserter,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof WorkflowDynamicValueInserter>;

export const Default: Story = {
  args: {},
};
