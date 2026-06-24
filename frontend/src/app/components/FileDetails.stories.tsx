import type { Meta, StoryObj } from '@storybook/react';
import FileDetails from './FileDetails';

const meta: Meta<typeof FileDetails> = {
  title: 'Components/FileDetails',
  component: FileDetails,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof FileDetails>;

export const Default: Story = {
  args: {},
};
