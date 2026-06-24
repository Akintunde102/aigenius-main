import type { Meta, StoryObj } from '@storybook/react';
import { MobileSidebarContext as MobileSidebarContext } from './MobileSidebarContext';

const meta: Meta<typeof MobileSidebarContext> = {
  title: 'Components/MobileSidebarContext',
  component: MobileSidebarContext,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof MobileSidebarContext>;

export const Default: Story = {
  args: {},
};
