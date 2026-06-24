import type { Meta, StoryObj } from '@storybook/react';
import { ActionIcons as ActionIcons } from './ActionIcons';

const meta: Meta<typeof ActionIcons> = {
  title: 'Components/model-interface/features/messages/components/ActionIcons',
  component: ActionIcons,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ActionIcons>;

export const Default: Story = {
  args: {},
};
