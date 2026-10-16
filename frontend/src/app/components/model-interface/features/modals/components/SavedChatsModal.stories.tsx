import type { Meta, StoryObj } from '@storybook/nextjs';
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
  args: {
    isOpen: true,
    onClose: () => {},
    savedChats: [],
    onInsertSaved: () => {},
    onRemoveSaved: () => {},
  },
};

export const WithSavedMessages: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onInsertSaved: () => {},
    onRemoveSaved: () => {},
    savedChats: [
      {
        id: '1',
        role: 'assistant',
        content:
          'The `client` directory is a full project with 26 entries. Let me check its README and package.json for more context.',
        timestamp: Date.now() - 60_000,
      },
      {
        id: '2',
        role: 'user',
        content: 'Summarize the architecture in three bullet points.',
        timestamp: Date.now() - 120_000,
      },
    ],
  },
};
