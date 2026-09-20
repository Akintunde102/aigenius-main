import net from 'net';

function getFreePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
        resolve(getFreePort(startPort + 1));
      } else {
        reject(err);
      }
    });

    server.listen(startPort, '127.0.0.1', () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => {
        resolve(port);
      });
    });
  });
}

async function boot() {
  try {
    // When an external mini-server is already running (e.g. Tilt's desktop-sidecar
    // resource), Electron connects to it rather than spawning its own process.
    // In that case we must NOT overwrite AIGENIUS_MINI_SERVER_PORT — the external
    // sidecar is already bound to the port passed in via the env and finding a
    // different "free" port would point Electron at nothing, causing a health-check
    // timeout and the window never opening.
    if (process.env.AIGENIUS_EXTERNAL_MINI_SERVER === '1') {
      // Use the port the external sidecar is already listening on.
      const sidecarPort =
        process.env.AIGENIUS_MINI_SERVER_PORT ??
        process.env.DEV_SIDECAR_PORT ??
        '28001';
      process.env.AIGENIUS_MINI_SERVER_PORT = sidecarPort;
      console.info(`[aigenius-desktop] External mini-server mode — using sidecar port ${sidecarPort}`);
    } else {
      // Electron will spawn the mini-server itself; find a free port first so
      // the child process and the health-check use the same one.
      const defaultStartPort = process.env.DEV_SIDECAR_PORT
        ? parseInt(process.env.DEV_SIDECAR_PORT, 10)
        : 8001;
      const port = await getFreePort(defaultStartPort);
      process.env.AIGENIUS_MINI_SERVER_PORT = port.toString();
      console.info(`[aigenius-desktop] Dynamic sidecar port allocated: ${port}`);
    }

    // Boot the main application
    require('./main-app');
  } catch (err) {
    console.error('[aigenius-desktop] Failed to allocate sidecar port:', err);
    process.exit(1);
  }
}

boot();

