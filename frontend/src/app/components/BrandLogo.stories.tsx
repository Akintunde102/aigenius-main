import type { Meta, StoryObj } from '@storybook/react';
import { BrandLogo as BrandLogo } from './BrandLogo';

const meta: Meta<typeof BrandLogo> = {
  title: 'Components/BrandLogo',
  component: BrandLogo,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof BrandLogo>;

export const Default: Story = {
  args: {},
};
