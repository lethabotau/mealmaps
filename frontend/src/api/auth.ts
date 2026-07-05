let tokenGetter: (() => Promise<string | null>) | null = null;

export function configureAuthTokenGetter(
  getter: () => Promise<string | null>,
): void {
  tokenGetter = getter;
}

export async function authHeadersForPost(): Promise<Record<string, string>> {
  if (!tokenGetter) return {};
  const token = await tokenGetter();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
