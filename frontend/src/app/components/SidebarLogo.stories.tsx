import type { Meta, StoryObj } from '@storybook/react';
import SidebarLogo from './SidebarLogo';

const meta: Meta<typeof SidebarLogo> = {
  title: 'Components/SidebarLogo',
  component: SidebarLogo,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof SidebarLogo>;

export const Default: Story = {
  args: {},
};
