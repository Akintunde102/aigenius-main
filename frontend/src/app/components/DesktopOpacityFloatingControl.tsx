'use client';

import React, { useLayoutEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function DesktopOpacityFloatingControl() {
  const [mounted, setMounted] = useState(false);
  const [opacity, setOpacity] = useState(100);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDarwin, setIsDarwin] = useState(false);

  useLayoutEffect(() => {
    setMounted(true);

    if (typeof window !== 'undefined') {
      const platform =
        window.aigeniusDesktop?.shellChrome?.platform ||
        (navigator.userAgent.includes('Mac') ? 'darwin' : 'win32');
      setIsDarwin(platform === 'darwin');

      // Hydrate initial opacity from main process
      void window.aigeniusDesktop?.getWindowOpacity?.().then((op) => {
        if (typeof op === 'number') {
          const val = Math.round(op * 100);
          setOpacity(val);
        }
      });

      // Listen for opacity changes from anywhere (titlebar menu, shortcut, etc.)
      const unsub = window.aigeniusDesktop?.onWindowOpacityChange?.((op) => {
        if (typeof op === 'number') {
          const val = Math.round(op * 100);
          setOpacity(val);
          if (val < 100) {
            setIsExpanded(true);
          }
        }
      });

      return () => {
        unsub?.();
      };
    }
  }, []);

  const isTransparent = opacity < 100;

  // Only render when the app is in transparent mode (< 100%)
  if (!mounted || !window.aigeniusDesktop || !isTransparent) {
    return null;
  }

  const handleOpacityChange = (newVal: number) => {
    const clamped = Math.max(20, Math.min(100, newVal));
    setOpacity(clamped);
    window.aigeniusDesktop?.setWindowOpacity?.(clamped / 100);
  };

  const snapOut = () => {
    setOpacity(100);
    window.aigeniusDesktop?.setWindowOpacity?.(1.0);
    toast.success('Snapped out to 100% full opacity', {
      icon: '🪟',
      id: 'window-opacity-toast',
      duration: 1500,
    });
  };

  const shortcutLabel = isDarwin ? '⌘⇧O' : 'Ctrl+Shift+O';

  return (
    <div
      role="region"
      aria-label="Window opacity controller"
      className="fixed bottom-4 left-4 z-[9999] select-none pointer-events-auto"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {isExpanded ? (
        /* Expanded Solid HUD Card — 100% solid opacity with light & dark theme */
        <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-white dark:bg-[#16161a] text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 shadow-2xl min-w-[250px] max-w-[290px] transition-all">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-semibold text-xs text-zinc-900 dark:text-zinc-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              <span>Peek Mode Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 px-1.5 py-0.5 rounded-md">
                {opacity}%
              </span>
              <button
                type="button"
                aria-label="Collapse opacity control"
                onClick={() => setIsExpanded(false)}
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-xs"
                title="Collapse to pill"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Slider */}
          <div className="flex flex-col gap-1">
            <input
              type="range"
              role="slider"
              id="floating-opacity-slider"
              aria-label="Floating window opacity slider"
              aria-valuemin={20}
              aria-valuemax={100}
              aria-valuenow={opacity}
              min={20}
              max={100}
              step={5}
              value={opacity}
              onChange={(e) => handleOpacityChange(Number(e.target.value))}
              className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 dark:text-zinc-400 font-mono px-0.5">
              <span>20% (See-through)</span>
              <span>100% (Solid)</span>
            </div>
          </div>

          {/* Presets and Snap Out Button */}
          <div className="flex items-center justify-between gap-1.5 pt-0.5">
            {[30, 50, 70].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleOpacityChange(preset)}
                className={`flex-1 py-1 text-[11px] rounded-lg font-mono font-medium transition-colors text-center cursor-pointer border ${
                  opacity === preset
                    ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800/90 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700'
                }`}
              >
                {preset}%
              </button>
            ))}
            <button
              type="button"
              onClick={snapOut}
              aria-label="Snap out to 100% opacity"
              className="flex-1 py-1 px-1.5 text-[11px] rounded-lg font-semibold transition-all text-center cursor-pointer bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white shadow-xs hover:scale-[1.02] active:scale-[0.98]"
            >
              Snap Out
            </button>
          </div>

          {/* Snap Out Guide & Shortcut Hint */}
          <div className="flex flex-col gap-1 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-700 dark:text-zinc-300">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">⚡ Snap Out Guide:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono text-[10px] font-bold text-zinc-900 dark:text-zinc-100 shadow-xs">
                {shortcutLabel}
              </kbd>
            </div>
            <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 leading-snug">
              Press <span className="font-mono text-zinc-900 dark:text-zinc-100 font-semibold">{shortcutLabel}</span> or click{' '}
              <button
                type="button"
                onClick={snapOut}
                className="underline text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold cursor-pointer"
              >
                Snap Out
              </button>{' '}
              to return to full 100% solid opacity.
            </p>
          </div>
        </div>
      ) : (
        /* Collapsed Solid Pill Button */
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          aria-label="Expand window opacity controls"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full font-sans text-xs font-semibold shadow-xl border cursor-pointer transition-all bg-white dark:bg-[#16161a] text-zinc-900 dark:text-zinc-100 border-blue-500/80 ring-2 ring-blue-500/20 hover:border-blue-600"
          title="Click to adjust opacity or snap out"
        >
          <span className="flex items-center gap-1.5">
            <span>👻</span>
            <span>Peek: {opacity}%</span>
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
            Snap Out
          </span>
        </button>
      )}
    </div>
  );
}
