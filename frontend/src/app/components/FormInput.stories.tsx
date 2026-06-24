import type { Meta, StoryObj } from '@storybook/react';
import FormInput from './FormInput';

const meta: Meta<typeof FormInput> = {
  title: 'Components/FormInput',
  component: FormInput,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof FormInput>;

export const Default: Story = {
  args: {},
};
