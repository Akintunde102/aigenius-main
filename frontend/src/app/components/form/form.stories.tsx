import type { Meta, StoryObj } from '@storybook/react';
import form from './form';

const meta: Meta<typeof form> = {
  title: 'Components/form/form',
  component: form,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof form>;

export const Default: Story = {
  args: {},
};
