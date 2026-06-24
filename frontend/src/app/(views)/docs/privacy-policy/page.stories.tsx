import type { Meta, StoryObj } from '@storybook/react';
import PrivacyPolicyPage from './page';

const meta: Meta<typeof PrivacyPolicyPage> = {
  title: 'Pages/docs/privacy-policy',
  component: PrivacyPolicyPage,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof PrivacyPolicyPage>;

export const Default: Story = {
  args: {},
};
