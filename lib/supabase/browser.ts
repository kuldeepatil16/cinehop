"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

let browserClient: SupabaseClient<Database> | null = null;

function requirePublicEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

export function createSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;
  const url = requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = requirePublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  browserClient = createClient<Database>(url, anon);
  return browserClient;
}

