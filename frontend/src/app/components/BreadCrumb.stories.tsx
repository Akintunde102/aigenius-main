import type { Meta, StoryObj } from '@storybook/react';
import { Breadcrumb as Breadcrumb } from './BreadCrumb';

const meta: Meta<typeof Breadcrumb> = {
  title: 'Components/BreadCrumb/Breadcrumb',
  component: Breadcrumb,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Breadcrumb>;

export const Default: Story = {
  args: {},
};
