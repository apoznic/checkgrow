// Helper to fetch a decrypted integration key for a cluster
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decrypt } from "./crypto.ts";

export async function getIntegrationKey(
  clusterId: string,
  serviceName: string,
  fallbackEnvVar?: string
): Promise<{ key: string | null; config: Record<string, unknown> }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data } = await supabase
    .from("cluster_integrations")
    .select("encrypted_key, config, is_active")
    .eq("cluster_id", clusterId)
    .eq("service_name", serviceName)
    .single();

  if (data && data.is_active && data.encrypted_key) {
    try {
      const decryptedKey = await decrypt(data.encrypted_key);
      return { key: decryptedKey, config: (data.config as Record<string, unknown>) || {} };
    } catch (e) {
      console.error(`Failed to decrypt key for ${serviceName}:`, e);
    }
  }

  // Fallback to global env var (for backward compatibility during migration)
  if (fallbackEnvVar) {
    const envKey = Deno.env.get(fallbackEnvVar);
    if (envKey) return { key: envKey, config: {} };
  }

  return { key: null, config: {} };
}
