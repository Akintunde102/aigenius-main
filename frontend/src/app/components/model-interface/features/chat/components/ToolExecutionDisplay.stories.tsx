import type { Meta, StoryObj } from '@storybook/react';
import { ToolExecutionDisplay as ToolExecutionDisplay } from './ToolExecutionDisplay';

const meta: Meta<typeof ToolExecutionDisplay> = {
  title: 'Components/model-interface/features/chat/components/ToolExecutionDisplay',
  component: ToolExecutionDisplay,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ToolExecutionDisplay>;

export const Default: Story = {
  args: {},
};
