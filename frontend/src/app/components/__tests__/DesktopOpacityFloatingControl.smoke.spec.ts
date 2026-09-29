import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import DesktopOpacityFloatingControl from '../DesktopOpacityFloatingControl';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('DesktopOpacityFloatingControl', () => {
  let opacityChangeCallback: ((op: number) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    opacityChangeCallback = undefined;
    (window as any).aigeniusDesktop = {
      isDesktop: true,
      shellChrome: {
        titleBarTopPx: 36,
        contentLeftPx: 0,
        titleBarRightInsetPx: 138,
        platform: 'win32',
      },
      getWindowOpacity: jest.fn().mockResolvedValue(1.0),
      setWindowOpacity: jest.fn(),
      onWindowOpacityChange: jest.fn().mockImplementation((cb) => {
        opacityChangeCallback = cb;
        return () => {};
      }),
    };
  });

  afterEach(() => {
    delete (window as any).aigeniusDesktop;
  });

  it('does NOT render when opacity is 100% (solid mode)', async () => {
    await act(async () => {
      render(React.createElement(DesktopOpacityFloatingControl));
    });

    expect(screen.queryByRole('region', { name: /window opacity controller/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /expand window opacity controls/i })).not.toBeInTheDocument();
  });

  it('renders automatically when opacity drops below 100% (transparent mode)', async () => {
    (window as any).aigeniusDesktop.getWindowOpacity = jest.fn().mockResolvedValue(0.35);

    await act(async () => {
      render(React.createElement(DesktopOpacityFloatingControl));
    });

    expect(screen.getByRole('region', { name: /window opacity controller/i })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /floating window opacity slider/i })).toBeInTheDocument();
    expect(screen.getByText(/peek mode active/i)).toBeInTheDocument();
    expect(screen.getByText(/35%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/snap out/i).length).toBeGreaterThan(0);
  });

  it('appears when window-opacity-change event fires with < 1.0', async () => {
    await act(async () => {
      render(React.createElement(DesktopOpacityFloatingControl));
    });

    // Initially hidden
    expect(screen.queryByRole('region', { name: /window opacity controller/i })).not.toBeInTheDocument();

    // Trigger transparent mode
    await act(async () => {
      opacityChangeCallback?.(0.4);
    });

    expect(screen.getByRole('region', { name: /window opacity controller/i })).toBeInTheDocument();
    expect(screen.getByText(/40%/i)).toBeInTheDocument();
  });

  it('changes opacity when slider is adjusted in transparent mode', async () => {
    (window as any).aigeniusDesktop.getWindowOpacity = jest.fn().mockResolvedValue(0.5);

    await act(async () => {
      render(React.createElement(DesktopOpacityFloatingControl));
    });

    const slider = screen.getByRole('slider', { name: /floating window opacity slider/i });
    fireEvent.change(slider, { target: { value: '25' } });

    expect((window as any).aigeniusDesktop.setWindowOpacity).toHaveBeenCalledWith(0.25);
  });

  it('snaps out to 100% when 100% Snap button is clicked and disappears', async () => {
    (window as any).aigeniusDesktop.getWindowOpacity = jest.fn().mockResolvedValue(0.3);

    await act(async () => {
      render(React.createElement(DesktopOpacityFloatingControl));
    });

    const snapButton = screen.getByRole('button', { name: /snap out to 100% opacity/i });
    fireEvent.click(snapButton);

    expect((window as any).aigeniusDesktop.setWindowOpacity).toHaveBeenCalledWith(1.0);
    // Component disappears once opacity reaches 100%
    expect(screen.queryByRole('region', { name: /window opacity controller/i })).not.toBeInTheDocument();
  });
});
