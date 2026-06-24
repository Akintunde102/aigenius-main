import type { Meta, StoryObj } from '@storybook/react';
import { TextMessage as TextMessage } from './TextMessage';

const meta: Meta<typeof TextMessage> = {
  title: 'Components/model-interface/features/message-types/components/TextMessage',
  component: TextMessage,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof TextMessage>;

export const Default: Story = {
  args: {},
};
