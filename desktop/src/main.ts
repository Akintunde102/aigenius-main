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
    // Packaged apps use 8001 by default, Tilt dev uses 28001
    // By injecting this into the env before any other files are imported, 
    // the rest of the application will synchronously read this safe dynamic port.
    const defaultStartPort = process.env.DEV_SIDECAR_PORT ? 28001 : 8001;
    const port = await getFreePort(defaultStartPort);
    
    process.env.AIGENIUS_MINI_SERVER_PORT = port.toString();
    console.info(`[aigenius-desktop] Dynamic sidecar port allocated: ${port}`);
    
    // Boot the main application
    require('./main-app');
  } catch (err) {
    console.error('[aigenius-desktop] Failed to find free port for sidecar:', err);
    process.exit(1);
  }
}

boot();
