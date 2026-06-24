import type { Meta, StoryObj } from '@storybook/react';
import { ModelLine as ModelLine } from './ModelLine';

const meta: Meta<typeof ModelLine> = {
  title: 'Components/ChatBoxInput/ModelLine',
  component: ModelLine,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ModelLine>;

export const Default: Story = {
  args: {},
};
