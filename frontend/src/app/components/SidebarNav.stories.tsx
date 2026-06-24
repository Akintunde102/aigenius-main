import type { Meta, StoryObj } from '@storybook/react';
import SidebarNav from './SidebarNav';

const meta: Meta<typeof SidebarNav> = {
  title: 'Components/SidebarNav',
  component: SidebarNav,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof SidebarNav>;

export const Default: Story = {
  args: {},
};
