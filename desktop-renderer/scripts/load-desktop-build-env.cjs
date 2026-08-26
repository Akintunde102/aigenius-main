/**
 * Merges payment/auth NEXT_PUBLIC_* vars for the desktop Vite bundle.
 * Sources (later wins): package.env → .env → .env.local → process.env
 */
const fs = require('fs');
const path = require('path');

const CLIENT_ROOT = path.join(__dirname, '..', '..');
const PACKAGE_ENV_PATH = path.join(CLIENT_ROOT, 'desktop', 'package.env');

const KEYS = [
  'NEXT_PUBLIC_PAYAZA_PUBLIC_KEY',
  'NEXT_PUBLIC_PAYAZA_CHECKOUT_BUSINESS_NAME',
  'NEXT_PUBLIC_WALLET_PAYMENT_PROVIDER',
  'NEXT_PUBLIC_PAYSTACK_KEY',
  'NEXT_PUBLIC_APP_ORIGIN',
  'PAYAZA_PUBLIC_KEY',
  'PAYAZA_CHECKOUT_BUSINESS_NAME',
  'WALLET_PAYMENT_PROVIDER',
  'PAYSTACK_PUBLIC_KEY',
  'AIGENIUS_APP_ORIGIN',
];

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) {
    return out;
  }
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key) out[key] = value;
  }
  return out;
}

function loadDesktopBuildEnv() {
  const merged = {
    ...parseEnvFile(PACKAGE_ENV_PATH),
    ...parseEnvFile(path.join(CLIENT_ROOT, '.env')),
    ...parseEnvFile(path.join(CLIENT_ROOT, '.env.local')),
  };

  for (const key of KEYS) {
    if (process.env[key]?.trim()) {
      merged[key] = process.env[key].trim();
    }
  }

  const payazaPublic =
    merged.NEXT_PUBLIC_PAYAZA_PUBLIC_KEY?.trim()
    || merged.PAYAZA_PUBLIC_KEY?.trim()
    || '';
  const payazaBusiness =
    merged.NEXT_PUBLIC_PAYAZA_CHECKOUT_BUSINESS_NAME?.trim()
    || merged.PAYAZA_CHECKOUT_BUSINESS_NAME?.trim()
    || '';
  const walletProvider =
    merged.NEXT_PUBLIC_WALLET_PAYMENT_PROVIDER?.trim()
    || merged.WALLET_PAYMENT_PROVIDER?.trim()
    || '';
  const paystackKey =
    merged.NEXT_PUBLIC_PAYSTACK_KEY?.trim()
    || merged.PAYSTACK_PUBLIC_KEY?.trim()
    || '';
  const appOrigin =
    merged.NEXT_PUBLIC_APP_ORIGIN?.trim()
    || merged.AIGENIUS_APP_ORIGIN?.trim()
    || 'https://aigenius.noboxlabs.xyz';

  return {
    NEXT_PUBLIC_PAYAZA_PUBLIC_KEY: payazaPublic,
    NEXT_PUBLIC_PAYAZA_CHECKOUT_BUSINESS_NAME: payazaBusiness,
    NEXT_PUBLIC_WALLET_PAYMENT_PROVIDER: walletProvider,
    NEXT_PUBLIC_PAYSTACK_KEY: paystackKey,
    NEXT_PUBLIC_APP_ORIGIN: appOrigin,
  };
}

module.exports = { loadDesktopBuildEnv, KEYS };
