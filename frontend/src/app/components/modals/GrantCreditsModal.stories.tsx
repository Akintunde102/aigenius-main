import type { Meta, StoryObj } from '@storybook/react';
import GrantCreditsModal from './GrantCreditsModal';

const meta: Meta<typeof GrantCreditsModal> = {
  title: 'Components/modals/GrantCreditsModal',
  component: GrantCreditsModal,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof GrantCreditsModal>;

export const Default: Story = {
  args: {},
};
