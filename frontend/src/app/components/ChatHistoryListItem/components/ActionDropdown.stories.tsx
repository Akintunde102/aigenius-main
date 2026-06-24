import type { Meta, StoryObj } from '@storybook/react';
import { ActionDropdown as ActionDropdown } from './ActionDropdown';

const meta: Meta<typeof ActionDropdown> = {
  title: 'Components/ChatHistoryListItem/components/ActionDropdown',
  component: ActionDropdown,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ActionDropdown>;

export const Default: Story = {
  args: {},
};
