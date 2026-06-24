import type { Meta, StoryObj } from '@storybook/react';
import SidebarLink from './SidebarLink';

const meta: Meta<typeof SidebarLink> = {
  title: 'Components/SidebarLink',
  component: SidebarLink,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof SidebarLink>;

export const Default: Story = {
  args: {},
};
