// Supabase Auth Middleware for TanStack Start Server Functions
// Uses client middleware to inject token, server middleware to validate
import { createMiddleware } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Client-Server middleware that:
 * 1. On client: gets the Supabase access token and sends it via context
 * 2. On server: validates the token and creates authenticated Supabase client
 */
export const requireSupabaseAuth = createMiddleware({ type: 'function' })
  .client(async ({ next }) => {
    // Dynamically import client to avoid SSR issues
    const { supabase } = await import('./client');
    
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Bạn cần đăng nhập để thực hiện thao tác này');
    }
    
    // Send the token to the server via sendContext
    return next({
      sendContext: {
        accessToken: session.access_token,
      },
    });
  })
  .server(async ({ next, context }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Response(
        'Missing Supabase environment variables. Ensure SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are set.',
        { status: 500 }
      );
    }

    // Get token from client-sent context first
    let token: string | null = (context as { accessToken?: string }).accessToken || null;
    
    // Fallback: try Authorization header (for API calls)
    if (!token) {
      const headers = getRequestHeaders();
      const authHeader = headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.replace('Bearer ', '');
      }
    }

    if (!token) {
      throw new Response('Unauthorized: No valid session found', { status: 401 });
    }

    const supabase = createClient<Database>(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      throw new Response('Unauthorized: Invalid or expired session', { status: 401 });
    }

    return next({
      context: {
        supabase,
        userId: data.user.id,
        user: data.user,
      },
    });
  })
