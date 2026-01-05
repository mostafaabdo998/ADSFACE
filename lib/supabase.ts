
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const supabaseUrl = 'https://hqswcazkyaybweduhsvr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhxc3djYXpreWF5YndlZHVoc3ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1OTk0MjUsImV4cCI6MjA4MzE3NTQyNX0.iKE5XoaK5JwO5C_yTZt_5M6FqJEI4capAPz7RdNGHkw';

export const supabase = createClient(supabaseUrl, supabaseKey);
