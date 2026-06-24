import type { Meta, StoryObj } from '@storybook/react';
import ChatBoxInput from './ChatBoxInput';

const meta: Meta<typeof ChatBoxInput> = {
  title: 'Components/ChatBoxInput/ChatBoxInput',
  component: ChatBoxInput,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ChatBoxInput>;

export const Default: Story = {
  args: {},
};
