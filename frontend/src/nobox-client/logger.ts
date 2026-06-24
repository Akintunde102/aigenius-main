/* eslint-disable @typescript-eslint/no-explicit-any */

const showLogs = false;
const showCompulsoryLogs = true;

export const Logger = {
  ...console,
  log: (...args: any[]) => {
    // Logging disabled
  },
  sLog: (...args: any[]) => {
    // Logging disabled
  },
};
export const cLogger = {
  ...console,
  log: (...args: any[]) => {
    // Logging disabled
  },
  sLog: (...args: any[]) => {
    // Logging disabled
  },
};
