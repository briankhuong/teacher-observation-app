// src/db/profiles.ts
import { supabase } from "../supabaseClient";

interface UserProfile {
    id: string;
    email: string;
    full_name: string | null;
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name') 
        .eq('id', userId)
        .single();
    
    // Ignore 'No row found' error (PGRST116) as it's expected if the user is new
    if (error && error.code !== 'PGRST116') { 
        console.error("[DB] Failed to fetch user profile:", error);
        return null;
    }
    
    return data as UserProfile | null;
}