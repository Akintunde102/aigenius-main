import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SidebarFooter from '../SidebarFooter';

jest.mock('@/lib/providers/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: jest.fn() }),
}));

jest.mock('@/lib/hooks/useToolPermissions', () => ({
  useToolPermissions: () => ({
    state: { autoApproveAll: false },
    setAutoApproveAll: jest.fn(),
  }),
}));

describe('SidebarFooter', () => {
  it('opens menu with correct items when settings button is clicked', () => {
    const onAddCredits = jest.fn();
    const onShowSavedChats = jest.fn();
    const onOpenMyFiles = jest.fn();
    const onLogout = jest.fn();

    render(
      <SidebarFooter
        wallet={503.07}
        onAddCredits={onAddCredits}
        onShowSavedChats={onShowSavedChats}
        onOpenMyFiles={onOpenMyFiles}
        onLogout={onLogout}
      />
    );

    // Menu should be closed initially
    expect(screen.queryByText('Saved messages')).not.toBeInTheDocument();

    // Click settings button
    const settingsBtn = screen.getByRole('button', { name: /Settings/i });
    fireEvent.click(settingsBtn);

    // Menu items should now be visible
    expect(screen.getByText('Credits')).toBeInTheDocument();
    expect(screen.getByText('503.07')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add/i })).toBeInTheDocument();
    expect(screen.getByText('Saved messages')).toBeInTheDocument();
    expect(screen.getByText('My files')).toBeInTheDocument();
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
    expect(screen.getByText('Auto-approve')).toBeInTheDocument();

    // Clicking Add triggers onAddCredits
    fireEvent.click(screen.getByRole('button', { name: /Add/i }));
    expect(onAddCredits).toHaveBeenCalledTimes(1);
  });
});
