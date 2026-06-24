import type { Meta, StoryObj } from '@storybook/react';
import SidebarContent from './SidebarContent';

const meta: Meta<typeof SidebarContent> = {
  title: 'Components/ChatHistorySidebar/SidebarContent',
  component: SidebarContent,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof SidebarContent>;

export const Default: Story = {
  args: {},
};
