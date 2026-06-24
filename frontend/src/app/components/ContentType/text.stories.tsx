import type { Meta, StoryObj } from '@storybook/react';
import InputText from './text';

const meta: Meta<typeof InputText> = {
  title: 'Components/ContentType/text/InputText',
  component: InputText,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof InputText>;

export const Default: Story = {
  args: {},
};
