import type { Meta, StoryObj } from '@storybook/nextjs';
import AddToWallet from './AddToWallet';

const meta: Meta<typeof AddToWallet> = {
  title: 'Components/modals/AddToWallet',
  component: AddToWallet,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof AddToWallet>;

export const Default: Story = {
  args: {},
};
