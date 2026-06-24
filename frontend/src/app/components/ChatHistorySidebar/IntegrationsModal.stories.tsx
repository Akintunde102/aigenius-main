import type { Meta, StoryObj } from '@storybook/react';
import IntegrationsModal from './IntegrationsModal';

const meta: Meta<typeof IntegrationsModal> = {
  title: 'Components/ChatHistorySidebar/IntegrationsModal',
  component: IntegrationsModal,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof IntegrationsModal>;

export const Default: Story = {
  args: {},
};
