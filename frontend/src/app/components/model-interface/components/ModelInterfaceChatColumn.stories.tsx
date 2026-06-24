import type { Meta, StoryObj } from '@storybook/react';
import { ModelInterfaceChatColumn as ModelInterfaceChatColumn } from './ModelInterfaceChatColumn';

const meta: Meta<typeof ModelInterfaceChatColumn> = {
  title: 'Components/model-interface/components/ModelInterfaceChatColumn',
  component: ModelInterfaceChatColumn,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ModelInterfaceChatColumn>;

export const Default: Story = {
  args: {},
};
