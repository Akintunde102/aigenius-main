import type { Meta, StoryObj } from '@storybook/react';
import { SavedChatsModal as SavedChatsModal } from './SavedChatsModal';

const meta: Meta<typeof SavedChatsModal> = {
  title: 'Components/model-interface/features/modals/components/SavedChatsModal',
  component: SavedChatsModal,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof SavedChatsModal>;

export const Default: Story = {
  args: {},
};
