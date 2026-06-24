import type { Meta, StoryObj } from '@storybook/react';
import LightweightModal from './LightweightModal';

const meta: Meta<typeof LightweightModal> = {
  title: 'Components/LightweightModal',
  component: LightweightModal,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof LightweightModal>;

export const Default: Story = {
  args: {},
};
