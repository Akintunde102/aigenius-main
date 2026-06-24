import type { Meta, StoryObj } from '@storybook/react';
import { StructuredMessage as StructuredMessage } from './ImageMessage';

const meta: Meta<typeof StructuredMessage> = {
  title: 'Components/model-interface/features/message-types/components/ImageMessage/StructuredMessage',
  component: StructuredMessage,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof StructuredMessage>;

export const Default: Story = {
  args: {},
};
