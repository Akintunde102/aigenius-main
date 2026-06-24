import type { Meta, StoryObj } from '@storybook/react';
import { SubmitButton as SubmitButton } from './SubmitButton';

const meta: Meta<typeof SubmitButton> = {
  title: 'Components/ChatBoxInput/SubmitButton',
  component: SubmitButton,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof SubmitButton>;

export const Default: Story = {
  args: {},
};
