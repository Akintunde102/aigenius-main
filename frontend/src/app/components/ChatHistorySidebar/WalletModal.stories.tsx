import type { Meta, StoryObj } from '@storybook/react';
import WalletModal from './WalletModal';

const meta: Meta<typeof WalletModal> = {
  title: 'Components/ChatHistorySidebar/WalletModal',
  component: WalletModal,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof WalletModal>;

export const Default: Story = {
  args: {},
};
