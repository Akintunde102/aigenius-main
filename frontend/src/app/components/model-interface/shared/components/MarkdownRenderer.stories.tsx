import type { Meta, StoryObj } from '@storybook/react';
import { MarkdownRenderer as MarkdownRenderer } from './MarkdownRenderer';

const meta: Meta<typeof MarkdownRenderer> = {
  title: 'Components/model-interface/shared/components/MarkdownRenderer',
  component: MarkdownRenderer,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof MarkdownRenderer>;

export const Default: Story = {
  args: {},
};
