import type { Meta, StoryObj } from '@storybook/react';
import { AddUserModal as AddUserModal } from './AddUserModal';

const meta: Meta<typeof AddUserModal> = {
  title: 'Components/modals/AddUserModal',
  component: AddUserModal,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof AddUserModal>;

export const Default: Story = {
  args: {},
};
