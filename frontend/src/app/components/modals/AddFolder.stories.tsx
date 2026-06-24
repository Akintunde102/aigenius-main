import type { Meta, StoryObj } from '@storybook/react';
import AddFolder from './AddFolder';

const meta: Meta<typeof AddFolder> = {
  title: 'Components/modals/AddFolder',
  component: AddFolder,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof AddFolder>;

export const Default: Story = {
  args: {},
};
