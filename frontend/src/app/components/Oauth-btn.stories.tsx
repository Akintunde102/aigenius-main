import type { Meta, StoryObj } from '@storybook/react';
import OAuthBtn from './Oauth-btn';

const meta: Meta<typeof OAuthBtn> = {
  title: 'Components/Oauth-btn/OAuthBtn',
  component: OAuthBtn,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof OAuthBtn>;

export const Default: Story = {
  args: {},
};
