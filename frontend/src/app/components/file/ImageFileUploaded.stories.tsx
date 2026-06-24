import type { Meta, StoryObj } from '@storybook/react';
import FileUploaded from './ImageFileUploaded';

const meta: Meta<typeof FileUploaded> = {
  title: 'Components/file/ImageFileUploaded/FileUploaded',
  component: FileUploaded,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof FileUploaded>;

export const Default: Story = {
  args: {},
};
