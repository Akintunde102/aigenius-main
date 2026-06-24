import type { Meta, StoryObj } from '@storybook/react';
import { FileMessage as FileMessage } from './FileMessage';

const meta: Meta<typeof FileMessage> = {
  title: 'Components/model-interface/features/message-types/components/FileMessage',
  component: FileMessage,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof FileMessage>;

export const Default: Story = {
  args: {},
};
