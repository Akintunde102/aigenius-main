import type { Meta, StoryObj } from '@storybook/react';
import { PlainTextMessageContent as PlainTextMessageContent } from './PlainTextMessageContent';

const meta: Meta<typeof PlainTextMessageContent> = {
  title: 'Components/model-interface/shared/components/PlainTextMessageContent',
  component: PlainTextMessageContent,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof PlainTextMessageContent>;

export const Default: Story = {
  args: {},
};
