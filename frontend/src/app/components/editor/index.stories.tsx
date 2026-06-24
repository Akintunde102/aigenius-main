import type { Meta, StoryObj } from '@storybook/react';
import EditorPage from './index';

const meta: Meta<typeof EditorPage> = {
  title: 'Components/editor/index/EditorPage',
  component: EditorPage,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof EditorPage>;

export const Default: Story = {
  args: {},
};
