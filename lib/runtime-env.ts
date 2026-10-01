type RuntimeBinding = string | { get?: () => Promise<string> } | undefined;

export async function runtimeEnv(name: string): Promise<string | undefined> {
  const local = process.env[name]?.trim();
  if (local) return local;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = (await getCloudflareContext({ async: true })) as unknown as { env?: Record<string, RuntimeBinding> };
    const binding = context.env?.[name];
    if (typeof binding === "string") return binding.trim() || undefined;
    if (binding?.get) {
      const value = await binding.get();
      return value?.trim() || undefined;
    }
  } catch {
    // Local Next requests do not have a Cloudflare request context.
  }
  return undefined;
}
