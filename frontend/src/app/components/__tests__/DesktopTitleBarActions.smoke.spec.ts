/** Smoke test and behavior tests for DesktopTitleBarActions. */
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import DesktopTitleBarActions from '../DesktopTitleBarActions';
import toast from 'react-hot-toast';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('DesktopTitleBarActions smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'DesktopTitleBarActions.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });

  describe('product name and menu behavior', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (window as any).aigeniusDesktop = {
        isDesktop: true,
        shellChrome: {
          titleBarTopPx: 36,
          contentLeftPx: 0,
          titleBarRightInsetPx: 138,
          platform: 'win32',
        },
        isWindowMaximized: jest.fn().mockResolvedValue(false),
        onWindowMaximizeChange: jest.fn().mockReturnValue(() => {}),
        getWindowOpacity: jest.fn().mockResolvedValue(1.0),
        setWindowOpacity: jest.fn(),
        onWindowOpacityChange: jest.fn().mockReturnValue(() => {}),
        minimizeWindow: jest.fn(),
        maximizeWindow: jest.fn(),
        closeWindow: jest.fn(),
        openNewWindow: jest.fn(),
      };
    });

    afterEach(() => {
      delete (window as any).aigeniusDesktop;
    });

    it('renders the product name "AIGenius" button on the top-left of the title bar', async () => {
      await act(async () => {
        render(React.createElement(DesktopTitleBarActions));
      });
      const productButton = screen.getByRole('button', { name: /aigenius product menu/i });
      expect(productButton).toBeInTheDocument();
      expect(productButton).toHaveTextContent('AIGenius');
    });

    it('opens a menu saying "We love you" when product button is clicked', async () => {
      await act(async () => {
        render(React.createElement(DesktopTitleBarActions));
      });
      const productButton = screen.getByRole('button', { name: /aigenius product menu/i });
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();

      fireEvent.click(productButton);

      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();

      const loveItem = screen.getByRole('menuitem');
      expect(loveItem).toHaveTextContent('We love you');
    });

    it('renders the opacity slider and updates window opacity when slider changes', async () => {
      await act(async () => {
        render(React.createElement(DesktopTitleBarActions));
      });
      const productButton = screen.getByRole('button', { name: /aigenius product menu/i });
      fireEvent.click(productButton);

      const slider = screen.getByRole('slider', { name: /window opacity slider/i });
      expect(slider).toBeInTheDocument();

      fireEvent.change(slider, { target: { value: '45' } });
      expect((window as any).aigeniusDesktop.setWindowOpacity).toHaveBeenCalledWith(0.45);
    });

    it('toggles opacity when Ctrl+Shift+O is pressed', async () => {
      await act(async () => {
        render(React.createElement(DesktopTitleBarActions));
      });

      // Press Ctrl+Shift+O to enter peek-through mode (drops from 100% to 70%)
      fireEvent.keyDown(window, { key: 'O', ctrlKey: true, shiftKey: true });
      expect((window as any).aigeniusDesktop.setWindowOpacity).toHaveBeenCalledWith(0.7);

      // Press again to restore full opacity (restores to 100%)
      fireEvent.keyDown(window, { key: 'O', ctrlKey: true, shiftKey: true });
      expect((window as any).aigeniusDesktop.setWindowOpacity).toHaveBeenCalledWith(1.0);
    });

    it('triggers toast and closes menu when "We love you" is clicked', async () => {
      await act(async () => {
        render(React.createElement(DesktopTitleBarActions));
      });
      const productButton = screen.getByRole('button', { name: /aigenius product menu/i });
      fireEvent.click(productButton);

      const loveItem = screen.getByRole('menuitem');
      fireEvent.click(loveItem);

      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('We love you'));
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('closes menu when Escape is pressed', async () => {
      await act(async () => {
        render(React.createElement(DesktopTitleBarActions));
      });
      const productButton = screen.getByRole('button', { name: /aigenius product menu/i });
      fireEvent.click(productButton);
      expect(screen.getByRole('menu')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('closes menu when clicking outside', async () => {
      await act(async () => {
        render(React.createElement(DesktopTitleBarActions));
      });
      const productButton = screen.getByRole('button', { name: /aigenius product menu/i });
      fireEvent.click(productButton);
      expect(screen.getByRole('menu')).toBeInTheDocument();

      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('renders Contact Us support info and copies email to clipboard', async () => {
      const writeTextMock = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      await act(async () => {
        render(React.createElement(DesktopTitleBarActions));
      });
      const productButton = screen.getByRole('button', { name: /aigenius product menu/i });
      fireEvent.click(productButton);

      expect(screen.getByText('nobox.hq@gmail.com')).toBeInTheDocument();
      expect(screen.getByText(/direct engineering support/i)).toBeInTheDocument();

      const copyButton = screen.getByRole('button', { name: /copy support email/i });
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(writeTextMock).toHaveBeenCalledWith('nobox.hq@gmail.com');
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('nobox.hq@gmail.com'), expect.anything());
    });

    it('opens Terms of Service, Privacy Policy, and Official Website links', async () => {
      const openExternalUrlMock = jest.fn().mockResolvedValue({ ok: true });
      (window as any).aigeniusDesktop.openExternalUrl = openExternalUrlMock;

      await act(async () => {
        render(React.createElement(DesktopTitleBarActions));
      });
      const productButton = screen.getByRole('button', { name: /aigenius product menu/i });
      fireEvent.click(productButton);

      // Terms of Service
      const termsButton = screen.getByText('Terms of Service').closest('button');
      expect(termsButton).toBeInTheDocument();
      fireEvent.click(termsButton!);
      expect(openExternalUrlMock).toHaveBeenCalledWith('https://aigenius.noboxlabs.xyz/docs/terms-and-conditions');

      // Re-open menu to test Privacy Policy
      fireEvent.click(productButton);
      const privacyButton = screen.getByText('Privacy Policy').closest('button');
      expect(privacyButton).toBeInTheDocument();
      fireEvent.click(privacyButton!);
      expect(openExternalUrlMock).toHaveBeenCalledWith('https://aigenius.noboxlabs.xyz/docs/privacy-policy');

      // Confirm Official Website row / icon is not present
      expect(screen.queryByText('Official Website')).toBeNull();
    });

    it('handles Email Support and Report Bug actions', async () => {
      const openExternalUrlMock = jest.fn().mockResolvedValue({ ok: true });
      (window as any).aigeniusDesktop.openExternalUrl = openExternalUrlMock;

      await act(async () => {
        render(React.createElement(DesktopTitleBarActions));
      });
      const productButton = screen.getByRole('button', { name: /aigenius product menu/i });
      fireEvent.click(productButton);

      const emailSupportButton = screen.getByRole('button', { name: /email support/i });
      fireEvent.click(emailSupportButton);
      expect(openExternalUrlMock).toHaveBeenCalledWith(expect.stringContaining('mailto:nobox.hq@gmail.com'));

      // Re-open menu to test Report Bug
      fireEvent.click(productButton);
      const reportBugButton = screen.getByRole('button', { name: /report bug/i });
      fireEvent.click(reportBugButton);
      expect(openExternalUrlMock).toHaveBeenCalledWith(expect.stringContaining('mailto:nobox.hq@gmail.com'));
    });
  });
});

