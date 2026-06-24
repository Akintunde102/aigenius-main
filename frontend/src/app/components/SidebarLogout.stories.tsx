import type { Meta, StoryObj } from '@storybook/react';
import SidebarLogout from './SidebarLogout';

const meta: Meta<typeof SidebarLogout> = {
  title: 'Components/SidebarLogout',
  component: SidebarLogout,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof SidebarLogout>;

export const Default: Story = {
  args: {},
};
