import type { Meta, StoryObj } from '@storybook/react';
import SidebarFooter from './SidebarFooter';

const meta: Meta<typeof SidebarFooter> = {
  title: 'Components/ChatHistorySidebar/SidebarFooter',
  component: SidebarFooter,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof SidebarFooter>;

export const Default: Story = {
  args: {},
};
