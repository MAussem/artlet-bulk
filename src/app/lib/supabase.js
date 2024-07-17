import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cbawuudpsscpblpbfzsi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiYXd1dWRwc3NjcGJscGJmenNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY1OTE2MTksImV4cCI6MjAyMjE2NzYxOX0.81B_uqxRgjbWwDCZTmEq1521BdM8Mp5bgLl1RMBemvk';
const supabase = createClient(supabaseUrl, supabaseKey);

// export const supabaseStorage = supabase.storage;
// export const supabaseAuth = supabase.auth;