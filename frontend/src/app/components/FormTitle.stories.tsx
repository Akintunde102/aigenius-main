import type { Meta, StoryObj } from '@storybook/react';
import FormTitle from './FormTitle';

const meta: Meta<typeof FormTitle> = {
  title: 'Components/FormTitle',
  component: FormTitle,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof FormTitle>;

export const Default: Story = {
  args: {},
};
