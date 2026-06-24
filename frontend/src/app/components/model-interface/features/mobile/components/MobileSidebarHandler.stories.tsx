import type { Meta, StoryObj } from '@storybook/react';
import { MobileSidebarHandler as MobileSidebarHandler } from './MobileSidebarHandler';

const meta: Meta<typeof MobileSidebarHandler> = {
  title: 'Components/model-interface/features/mobile/components/MobileSidebarHandler',
  component: MobileSidebarHandler,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof MobileSidebarHandler>;

export const Default: Story = {
  args: {},
};
