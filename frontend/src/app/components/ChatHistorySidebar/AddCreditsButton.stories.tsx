import type { Meta, StoryObj } from '@storybook/react';
import AddCreditsButton from './AddCreditsButton';

const meta: Meta<typeof AddCreditsButton> = {
  title: 'Components/ChatHistorySidebar/AddCreditsButton',
  component: AddCreditsButton,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof AddCreditsButton>;

export const Default: Story = {
  args: {},
};
