jest.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: jest.fn(() => ''),
    getAppPath: jest.fn(() => ''),
  },
}));
