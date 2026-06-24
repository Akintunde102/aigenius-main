import type { Meta, StoryObj } from '@storybook/react';
import MyFilesModal from './MyFilesModal';

const meta: Meta<typeof MyFilesModal> = {
  title: 'Components/ChatHistorySidebar/MyFilesModal',
  component: MyFilesModal,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof MyFilesModal>;

export const Default: Story = {
  args: {},
};
