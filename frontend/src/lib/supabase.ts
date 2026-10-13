import { createClient } from '@supabase/supabase-js'

// Browser-side Supabase client. Only the publishable key lives here; it is public by design, and the database
// grants it read access to the six catalog tables only (RLS everywhere else).
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'missing-publishable-key',
)
