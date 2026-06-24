import type { Meta, StoryObj } from '@storybook/react';
import { ChatControls as ChatControls } from './ChatControls';

const meta: Meta<typeof ChatControls> = {
  title: 'Components/ChatBoxInput/ChatControls',
  component: ChatControls,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ChatControls>;

export const Default: Story = {
  args: {},
};
