import type { Meta, StoryObj } from '@storybook/react';
import { ChatTextarea as ChatTextarea } from './ChatTextarea';

const meta: Meta<typeof ChatTextarea> = {
  title: 'Components/ChatBoxInput/ChatTextarea',
  component: ChatTextarea,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ChatTextarea>;

export const Default: Story = {
  args: {},
};
