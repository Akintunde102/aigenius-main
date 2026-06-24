import type { Meta, StoryObj } from '@storybook/react';
import { DynamicInputComponent as DynamicInputComponent } from './SubmitRecord';

const meta: Meta<typeof DynamicInputComponent> = {
  title: 'Components/SubmitRecord/DynamicInputComponent',
  component: DynamicInputComponent,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof DynamicInputComponent>;

export const Default: Story = {
  args: {},
};
