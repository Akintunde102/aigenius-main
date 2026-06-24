import type { Meta, StoryObj } from '@storybook/react';
import { SidebarCollapsedRail as SidebarCollapsedRail } from './SidebarCollapsedRail';

const meta: Meta<typeof SidebarCollapsedRail> = {
  title: 'Components/ChatHistorySidebar/SidebarCollapsedRail',
  component: SidebarCollapsedRail,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof SidebarCollapsedRail>;

export const Default: Story = {
  args: {},
};
