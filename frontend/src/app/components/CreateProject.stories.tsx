import type { Meta, StoryObj } from '@storybook/react';
import CreateProject from './CreateProject';

const meta: Meta<typeof CreateProject> = {
  title: 'Components/CreateProject',
  component: CreateProject,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof CreateProject>;

export const Default: Story = {
  args: {},
};
