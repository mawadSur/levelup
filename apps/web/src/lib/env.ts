import { z } from 'zod';

const clientSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_CLIENT: z.enum(['kapitus', 'ceolawyer', 'default']).optional(),
});

const serverSchema = clientSchema.extend({
  SUPABASE_URL: z.string().min(1).optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

function validateEnv() {
  const isServer = typeof window === 'undefined';
  const schema = isServer ? serverSchema : clientSchema;

  const parsed = schema.safeParse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_CLIENT: process.env.NEXT_PUBLIC_CLIENT,
    ...(isServer && {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    }),
  });

  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables. Check the console for details.');
  }

  return parsed.data;
}

export const env = validateEnv();
