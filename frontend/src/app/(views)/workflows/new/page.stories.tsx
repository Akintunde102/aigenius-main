import type { Meta, StoryObj } from '@storybook/nextjs';
import WorkflowNewPage from './page';

const meta: Meta<typeof WorkflowNewPage> = {
  title: 'Pages/workflows/new',
  component: WorkflowNewPage,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof WorkflowNewPage>;

export const Default: Story = {
  args: {},
};
