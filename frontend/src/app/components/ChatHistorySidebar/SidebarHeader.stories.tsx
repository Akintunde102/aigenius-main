import type { Meta, StoryObj } from '@storybook/react';
import SidebarHeader from './SidebarHeader';

const meta: Meta<typeof SidebarHeader> = {
  title: 'Components/ChatHistorySidebar/SidebarHeader',
  component: SidebarHeader,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof SidebarHeader>;

export const Default: Story = {
  args: {},
};
