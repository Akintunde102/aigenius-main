import type { Meta, StoryObj } from '@storybook/react';
import { AttachmentPreview as AttachmentPreview } from './AttachmentPreview';

const meta: Meta<typeof AttachmentPreview> = {
  title: 'Components/ChatBoxInput/AttachmentPreview',
  component: AttachmentPreview,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof AttachmentPreview>;

export const Default: Story = {
  args: {},
};
