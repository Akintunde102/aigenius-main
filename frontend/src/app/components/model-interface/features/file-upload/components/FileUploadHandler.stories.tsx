import type { Meta, StoryObj } from '@storybook/react';
import { FileUploadHandler as FileUploadHandler } from './FileUploadHandler';

const meta: Meta<typeof FileUploadHandler> = {
  title: 'Components/model-interface/features/file-upload/components/FileUploadHandler',
  component: FileUploadHandler,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof FileUploadHandler>;

export const Default: Story = {
  args: {},
};
