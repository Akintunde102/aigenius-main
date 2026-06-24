import type { Meta, StoryObj } from '@storybook/react';
import TermsAndConditionsPage from './page';

const meta: Meta<typeof TermsAndConditionsPage> = {
  title: 'Pages/docs/terms-and-conditions',
  component: TermsAndConditionsPage,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof TermsAndConditionsPage>;

export const Default: Story = {
  args: {},
};
