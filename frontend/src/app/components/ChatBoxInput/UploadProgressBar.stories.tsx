import type { Meta, StoryObj } from '@storybook/react';
import { UploadProgressBar as UploadProgressBar } from './UploadProgressBar';

const meta: Meta<typeof UploadProgressBar> = {
  title: 'Components/ChatBoxInput/UploadProgressBar',
  component: UploadProgressBar,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof UploadProgressBar>;

export const Default: Story = {
  args: {},
};
