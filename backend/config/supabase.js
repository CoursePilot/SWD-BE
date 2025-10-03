const { createClient } = require('@supabase/supabase-js');

// Supabase configuration for backend (using service role key for admin operations)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('ERROR: SUPABASE_URL environment variable is not set');
  throw new Error('SUPABASE_URL environment variable is not set');
}

if (!supabaseServiceKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
}

try {
  // Create Supabase client with service role key (for admin operations)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log(`Supabase initialized successfully with URL: ${supabaseUrl}`);
  
  // Test connection by checking if we can access storage
  supabase.storage.listBuckets()
    .then(({ data, error }) => {
      if (error) {
        console.error('Failed to connect to Supabase Storage:', error);
      } else {
        console.log('Successfully connected to Supabase Storage');
        console.log('Available buckets:', data.map(bucket => bucket.name));
      }
    })
    .catch(error => {
      console.error('Failed to test Supabase Storage connection:', error);
    });

  module.exports = supabase;
} catch (error) {
  console.error('Failed to initialize Supabase:', error);
  
  // Export dummy object to prevent crashes
  module.exports = {
    storage: {
      from: () => ({
        upload: async () => ({ error: 'Supabase not initialized properly' }),
        remove: async () => ({ error: 'Supabase not initialized properly' }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://placeholder-image-url.com/error' } })
      }),
      listBuckets: async () => ({ error: 'Supabase not initialized properly' })
    }
  };
}
