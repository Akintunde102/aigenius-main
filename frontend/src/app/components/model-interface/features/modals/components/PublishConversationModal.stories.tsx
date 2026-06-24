import type { Meta, StoryObj } from '@storybook/react';
import { PublishConversationModal as PublishConversationModal } from './PublishConversationModal';

const meta: Meta<typeof PublishConversationModal> = {
  title: 'Components/model-interface/features/modals/components/PublishConversationModal',
  component: PublishConversationModal,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof PublishConversationModal>;

export const Default: Story = {
  args: {},
};
