import type { Meta, StoryObj } from '@storybook/react';
import BooleanIcon from './bool';

const meta: Meta<typeof BooleanIcon> = {
  title: 'Components/ContentType/bool/BooleanIcon',
  component: BooleanIcon,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof BooleanIcon>;

export const Default: Story = {
  args: {},
};
