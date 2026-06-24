import type { Meta, StoryObj } from '@storybook/react';
import PreviewRenderer from './PreviewRenderer';

const meta: Meta<typeof PreviewRenderer> = {
  title: 'Components/editor/PreviewRenderer',
  component: PreviewRenderer,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof PreviewRenderer>;

export const Default: Story = {
  args: {},
};
