import type { Meta, StoryObj } from '@storybook/react';
import { MessageHandlers as MessageHandlers } from './MessageHandlers';

const meta: Meta<typeof MessageHandlers> = {
  title: 'Components/model-interface/features/messages/components/MessageHandlers',
  component: MessageHandlers,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof MessageHandlers>;

export const Default: Story = {
  args: {},
};
