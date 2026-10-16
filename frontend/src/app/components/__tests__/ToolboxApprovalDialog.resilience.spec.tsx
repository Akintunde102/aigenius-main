import React from 'react';
import { render, screen } from '@testing-library/react';
import { ToolboxApprovalDialog } from '../ToolboxApprovalDialog';

describe('ToolboxApprovalDialog resilience', () => {
  it('renders file content as plain text without crashing', () => {
    render(
      <ToolboxApprovalDialog
        payload={{
          kind: 'save',
          toolName: 'demo',
          scopeLabel: 'global/demo',
          files: [{ path: 'main.js', content: 'console.log("hi");' }],
          capabilityLabels: ['Writes files'],
          undeclaredFlags: ['writes-files'],
        }}
        onDecision={() => undefined}
      />,
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/console\.log/)).toBeInTheDocument();
  });
});
