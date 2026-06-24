import type { Meta, StoryObj } from '@storybook/react';
import HeaderCrumbSection from './HeaderCrumbSection';

const meta: Meta<typeof HeaderCrumbSection> = {
  title: 'Components/HeaderCrumbSection',
  component: HeaderCrumbSection,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof HeaderCrumbSection>;

export const Default: Story = {
  args: {},
};
