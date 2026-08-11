const DRAWER_STACK_ROUTES = new Set([
  "rules",
  "monsters",
  "npcs",
  "notes",
  "campaign",
  "encounters",
  "maps",
  "settings",
]);

export type DrawerParams = Record<string, unknown> & { screen?: unknown };

export function drawerTarget(
  name: string,
  params?: object
): { name: string; params?: DrawerParams } {
  const drawerParams = params as DrawerParams | undefined;
  if (DRAWER_STACK_ROUTES.has(name)) {
    return { name, params: { ...drawerParams, screen: "index" } };
  }
  return drawerParams ? { name, params: drawerParams } : { name };
}
