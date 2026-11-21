import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
export async function requireUser() {
  const db = await createClient();
  const {data: {user}, error} = await db.auth.getUser();
  if (error || !user) redirect('/login');
  return {db,user};
}
