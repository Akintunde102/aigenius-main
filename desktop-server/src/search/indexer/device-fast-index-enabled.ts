/** Desktop/Documents/Downloads fast pocket — separate from full-home background indexing. */
export function isDeviceFastIndexEnabled(): boolean {
  return process.env.AIGENIUS_DEVICE_FAST_INDEX !== '0';
}
