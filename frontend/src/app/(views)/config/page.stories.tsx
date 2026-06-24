import type { Meta, StoryObj } from '@storybook/react';
import ConfigPage from './page';

const meta: Meta<typeof ConfigPage> = {
  title: 'Pages/config',
  component: ConfigPage,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ConfigPage>;

export const Default: Story = {
  args: {},
};
