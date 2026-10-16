/** Main-process toolbox feature flag (do not import from preload). */

export function isDesktopToolboxEnabledInMain(): boolean {
  const v = process.env.AIGENIUS_ENABLE_TOOLBOX;
  return v === '1' || v === 'true';
}
