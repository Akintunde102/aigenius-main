import type { Meta, StoryObj } from '@storybook/react';
import { AreYouSure as AreYouSure } from './AreYouSure';

const meta: Meta<typeof AreYouSure> = {
  title: 'Components/modals/AreYouSure',
  component: AreYouSure,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof AreYouSure>;

export const Default: Story = {
  args: {},
};
