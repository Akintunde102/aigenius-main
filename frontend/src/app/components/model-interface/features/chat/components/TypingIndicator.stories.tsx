import type { Meta, StoryObj } from '@storybook/react';
import { TypingIndicator as TypingIndicator } from './TypingIndicator';

const meta: Meta<typeof TypingIndicator> = {
  title: 'Components/model-interface/features/chat/components/TypingIndicator',
  component: TypingIndicator,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof TypingIndicator>;

export const Default: Story = {
  args: {},
};
