import type { Meta, StoryObj } from '@storybook/react';
import WorkflowByIdPage from './page';

const meta: Meta<typeof WorkflowByIdPage> = {
  title: 'Pages/workflow/[id]',
  component: WorkflowByIdPage,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof WorkflowByIdPage>;

export const Default: Story = {
  args: {},
};
