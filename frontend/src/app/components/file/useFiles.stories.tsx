import type { Meta, StoryObj } from '@storybook/react';
import { useFiles as useFiles } from './useFiles';

const meta: Meta<typeof useFiles> = {
  title: 'Components/file/useFiles',
  component: useFiles,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof useFiles>;

export const Default: Story = {
  args: {},
};
