import type { Meta, StoryObj } from '@storybook/react';
import { BooleanField as BooleanField } from './BooleanInputField';

const meta: Meta<typeof BooleanField> = {
  title: 'Components/form/BooleanInputField/BooleanField',
  component: BooleanField,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof BooleanField>;

export const Default: Story = {
  args: {},
};
