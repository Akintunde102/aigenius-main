import type { Meta, StoryObj } from '@storybook/react';
import FileUploader from './FileUploader';

const meta: Meta<typeof FileUploader> = {
  title: 'Components/file/FileUploader',
  component: FileUploader,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof FileUploader>;

export const Default: Story = {
  args: {},
};
