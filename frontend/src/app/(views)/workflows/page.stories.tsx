import type { Meta, StoryObj } from '@storybook/nextjs';
import WorkflowsPage from './page';

const meta: Meta<typeof WorkflowsPage> = {
  title: 'Pages/workflows',
  component: WorkflowsPage,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof WorkflowsPage>;

export const Default: Story = {
  args: {},
};
