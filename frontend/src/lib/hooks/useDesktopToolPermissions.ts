import type { ToolPermissionState } from '@/lib/tool-permissions/resolve';

export type DesktopToolPermissionEntry = ToolPermissionState['tools'][number];

export { useToolPermissions } from '@/lib/hooks/useToolPermissions';
