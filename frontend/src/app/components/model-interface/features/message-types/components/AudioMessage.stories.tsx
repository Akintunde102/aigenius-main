import type { Meta, StoryObj } from '@storybook/react';
import { AudioMessage as AudioMessage } from './AudioMessage';

const meta: Meta<typeof AudioMessage> = {
  title: 'Components/model-interface/features/message-types/components/AudioMessage',
  component: AudioMessage,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof AudioMessage>;

export const Default: Story = {
  args: {},
};
