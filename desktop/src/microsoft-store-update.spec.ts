import { resolveMicrosoftStorePdpUrl } from './microsoft-store-update';

describe('resolveMicrosoftStorePdpUrl', () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it('prefers AIGENIUS_MS_STORE_URL when set', () => {
    process.env.AIGENIUS_MS_STORE_URL = 'ms-windows-store://pdp/?productid=9TEST';
    delete process.env.AIGENIUS_MS_STORE_PRODUCT_ID;
    expect(resolveMicrosoftStorePdpUrl()).toBe('ms-windows-store://pdp/?productid=9TEST');
  });

  it('builds productid URL from AIGENIUS_MS_STORE_PRODUCT_ID', () => {
    delete process.env.AIGENIUS_MS_STORE_URL;
    process.env.AIGENIUS_MS_STORE_PRODUCT_ID = '9ABCDEF';
    expect(resolveMicrosoftStorePdpUrl()).toBe('ms-windows-store://pdp/?productid=9ABCDEF');
  });

  it('defaults to the AIGenius Store product id', () => {
    delete process.env.AIGENIUS_MS_STORE_URL;
    delete process.env.AIGENIUS_MS_STORE_PRODUCT_ID;
    expect(resolveMicrosoftStorePdpUrl()).toBe(
      'ms-windows-store://pdp/?productid=9NGQQ3GF2WHL',
    );
  });
});
