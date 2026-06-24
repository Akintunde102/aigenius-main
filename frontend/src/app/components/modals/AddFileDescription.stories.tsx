import type { Meta, StoryObj } from '@storybook/react';
import AddFileDescription from './AddFileDescription';

const meta: Meta<typeof AddFileDescription> = {
  title: 'Components/modals/AddFileDescription',
  component: AddFileDescription,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof AddFileDescription>;

export const Default: Story = {
  args: {},
};
