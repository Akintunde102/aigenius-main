import type { Meta, StoryObj } from '@storybook/react';
import { UserFilesBrowser as UserFilesBrowser } from './UserFilesBrowser';

const meta: Meta<typeof UserFilesBrowser> = {
  title: 'Components/user-files/UserFilesBrowser',
  component: UserFilesBrowser,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof UserFilesBrowser>;

export const Default: Story = {
  args: {},
};
