import { roleLabel } from '@/lib/roles';
import { routeRegistry, type RoleCode } from '@/lib/routes';

export type HelpScreen = { key: string; label: string; role: RoleCode; roleLabel: string };

export const helpScreens: readonly HelpScreen[] = routeRegistry
  .filter((route) => route.component !== undefined && route.requiresAuth === true && route.roles?.length === 1 && !route.aliasOf && route.layout === undefined)
  .map((route) => {
    const role = route.roles?.[0] as RoleCode;
    return { key: route.path, label: route.breadcrumb ?? route.name, role, roleLabel: roleLabel(role) };
  });
