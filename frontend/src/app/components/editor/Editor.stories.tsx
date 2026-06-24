import type { Meta, StoryObj } from '@storybook/react';
import Editor from './Editor';

const meta: Meta<typeof Editor> = {
  title: 'Components/editor/Editor',
  component: Editor,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Editor>;

export const Default: Story = {
  args: {},
};
