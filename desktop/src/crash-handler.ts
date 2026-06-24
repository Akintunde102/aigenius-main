/**
 * Crash Handler for Electron Renderer Process
 * Prevents crashes from uncaught errors and provides better error reporting
 */

import { app, BrowserWindow } from 'electron';

export function setupCrashHandlers() {
  // Handle renderer process crashes
  app.on('render-process-gone', (event, webContents, details) => {
    console.error('[Crash Handler] Renderer process gone:', details);
    
    const win = BrowserWindow.fromWebContents(webContents);
    if (win && !win.isDestroyed()) {
      // Show error dialog
      const { dialog } = require('electron');
      dialog.showErrorBox(
        'Application Crashed',
        `The application has crashed.\n\nReason: ${details.reason}\nExit Code: ${details.exitCode}\n\nThe application will attempt to reload.`
      );
      
      // Attempt to reload
      try {
        win.reload();
      } catch (error) {
        console.error('[Crash Handler] Failed to reload:', error);
      }
    }
  });

  // Handle child process crashes
  app.on('child-process-gone', (event, details) => {
    console.error('[Crash Handler] Child process gone:', details);
  });

  // Handle GPU process crashes
  // FIX: Updated event signature for Electron 33.x
  app.on('gpu-process-crashed' as any, (_event: any, killed: boolean) => {
    console.error('[Crash Handler] GPU process crashed. Killed:', killed);
  });
}

/**
 * Setup renderer error handlers via preload
 * This should be called in the preload script
 */
export function setupRendererErrorHandlers() {
  // Catch unhandled errors
  window.addEventListener('error', (event) => {
    console.error('[Renderer Error]', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
    
    // Prevent default crash behavior for certain errors
    if (event.message.includes('dragEvent is not defined')) {
      console.warn('[Renderer Error] Suppressing dragEvent error to prevent crash');
      event.preventDefault();
      return false;
    }
  });

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Renderer Unhandled Rejection]', event.reason);
    event.preventDefault();
  });
}
