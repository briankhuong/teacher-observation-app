// src/supabaseClient.ts

import { createClient } from "@supabase/supabase-js";

// VITE makes environment variables available via import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL or Anon Key is missing in environment variables.");
}

// Initialize the Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);