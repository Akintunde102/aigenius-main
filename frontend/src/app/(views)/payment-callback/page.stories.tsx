import type { Meta, StoryObj } from '@storybook/react';
import PaymentCallbackPage from './page';

const meta: Meta<typeof PaymentCallbackPage> = {
  title: 'Pages/payment-callback',
  component: PaymentCallbackPage,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof PaymentCallbackPage>;

export const Default: Story = {
  args: {},
};
