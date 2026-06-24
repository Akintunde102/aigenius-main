import type { Meta, StoryObj } from '@storybook/react';
import { workflowShellBgStyle as workflowShellBgStyle } from './workflow-info';

const meta: Meta<typeof workflowShellBgStyle> = {
  title: 'Components/workflows/workflow-info/workflowShellBgStyle',
  component: workflowShellBgStyle,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof workflowShellBgStyle>;

export const Default: Story = {
  args: {},
};
