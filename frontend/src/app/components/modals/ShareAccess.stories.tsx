import type { Meta, StoryObj } from '@storybook/react';
import ShareAccess from './ShareAccess';

const meta: Meta<typeof ShareAccess> = {
  title: 'Components/modals/ShareAccess',
  component: ShareAccess,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ShareAccess>;

export const Default: Story = {
  args: {},
};
