import type { Meta, StoryObj } from '@storybook/react';
import { MessageHeader as MessageHeader } from './MessageHeader';

const meta: Meta<typeof MessageHeader> = {
  title: 'Components/model-interface/features/messages/components/MessageHeader',
  component: MessageHeader,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof MessageHeader>;

export const Default: Story = {
  args: {},
};
