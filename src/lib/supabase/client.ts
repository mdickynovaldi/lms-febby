"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase environment variables tidak ditemukan:", {
      url: supabaseUrl ? "ada" : "tidak ada",
      key: supabaseAnonKey ? "ada" : "tidak ada",
    });
    throw new Error(
      "Supabase URL atau Anon Key tidak dikonfigurasi. Periksa file .env"
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
