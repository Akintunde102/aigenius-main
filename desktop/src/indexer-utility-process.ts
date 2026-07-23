import { utilityProcess, type UtilityProcess } from 'electron';

import fs from 'fs';

import path from 'path';

import { loadLastCodeProject } from './last-code-project';



let indexerChild: UtilityProcess | null = null;

let appQuitting = false;

let lastStartOpts: {

  desktopServerDir: string;

  userDataPath: string;

  modelsDir: string;

  secretToken: string;

  ipcPort: string;

  logsDir: string;

} | null = null;

let restartTimer: NodeJS.Timeout | null = null;



function indexerEntryPath(desktopServerDir: string): string {

  const dist = path.join(desktopServerDir, 'dist', 'indexer-main.js');

  if (fs.existsSync(dist)) return dist;

  return path.join(desktopServerDir, 'indexer-main.js');

}



function forkIndexer(opts: {

  desktopServerDir: string;

  userDataPath: string;

  modelsDir: string;

  secretToken: string;

  ipcPort: string;

  logsDir: string;

}): UtilityProcess {

  const last = loadLastCodeProject(opts.userDataPath);

  const entry = indexerEntryPath(opts.desktopServerDir);

  const logPath = path.join(opts.logsDir, 'indexer.log');

  let logStream: fs.WriteStream | null = null;

  try {

    logStream = fs.createWriteStream(logPath, { flags: 'a' });

  } catch (err) {

    console.warn('[aigenius-desktop] Could not open indexer log:', err);

  }



  const env: Record<string, string> = {

    ...Object.fromEntries(

      Object.entries(process.env).filter(([, v]) => typeof v === 'string') as [string, string][],

    ),

    AIGENIUS_INDEXER_IPC_PORT: opts.ipcPort,

    AIGENIUS_USER_DATA_PATH: opts.userDataPath,

    AIGENIUS_MODELS_DIR: opts.modelsDir,

    AIGENIUS_SECRET_TOKEN: opts.secretToken,

    AIGENIUS_HOMEDIR_INDEX: process.env.AIGENIUS_HOMEDIR_INDEX ?? '1',

    ...(process.env.AIGENIUS_SEARCH_WORKERS

      ? { AIGENIUS_SEARCH_WORKERS: process.env.AIGENIUS_SEARCH_WORKERS }

      : {}),

    AIGENIUS_SEARCH_IMAGES: process.env.AIGENIUS_SEARCH_IMAGES ?? '1',

    NODE_ENV: process.env.NODE_ENV ?? 'production',

  };



  if (last) {

    env.AIGENIUS_BOOT_PROJECT_ID = last.projectId;

    env.AIGENIUS_BOOT_PROJECT_ROOT = last.rootPath;

  }



  const child = utilityProcess.fork(entry, [], {

    serviceName: 'aigenius-indexer',

    env,

    stdio: logStream ? 'pipe' : 'inherit',

  });



  if (logStream && child.stdout && child.stderr) {

    child.stdout.on('data', (chunk: Buffer) => {

      process.stdout.write(chunk);

      if (logStream?.writable) logStream.write(chunk);

    });

    child.stderr.on('data', (chunk: Buffer) => {

      process.stderr.write(chunk);

      if (logStream?.writable) logStream.write(chunk);

    });

    child.on('exit', () => logStream?.end());

  }



  child.on('exit', (code) => {

    console.warn('[aigenius-desktop] Indexer utility process exited:', code);

    indexerChild = null;

    if (appQuitting) return;

    if (restartTimer) clearTimeout(restartTimer);

    restartTimer = setTimeout(() => {

      restartTimer = null;

      if (appQuitting || indexerChild || !lastStartOpts) return;

      console.info('[aigenius-desktop] Restarting indexer utility process…');

      indexerChild = forkIndexer(lastStartOpts);

    }, 2_500);

  });



  console.info('[aigenius-desktop] Indexer utility process started:', entry);

  return child;

}



export function markIndexerAppQuitting(): void {

  appQuitting = true;

  if (restartTimer) {

    clearTimeout(restartTimer);

    restartTimer = null;

  }

}



export function startIndexerUtilityProcess(opts: {

  desktopServerDir: string;

  userDataPath: string;

  modelsDir: string;

  secretToken: string;

  ipcPort: string;

  logsDir: string;

}): UtilityProcess {

  if (indexerChild) {

    return indexerChild;

  }



  lastStartOpts = opts;

  indexerChild = forkIndexer(opts);

  return indexerChild;

}



export function getIndexerUtilityProcess(): UtilityProcess | null {

  return indexerChild;

}


