import type { Meta, StoryObj } from '@storybook/nextjs';
import DocsIndexPage from './page';

const meta: Meta<typeof DocsIndexPage> = {
  title: 'Pages/docs',
  component: DocsIndexPage,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof DocsIndexPage>;

export const Default: Story = {
  args: {},
};
