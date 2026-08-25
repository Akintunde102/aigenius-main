import type { Meta, StoryObj } from '@storybook/nextjs';
import ChatBoxStyles from './ChatBoxStyles';

const meta: Meta<typeof ChatBoxStyles> = {
  title: 'Components/ChatBoxInput/components/ChatBoxStyles',
  component: ChatBoxStyles,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ChatBoxStyles>;

export const Default: Story = {
  args: {},
};
