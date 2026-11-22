/** Resume storage cleanup only for a claimed job whose auth account is already absent. Never deletes accounts. */
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {z} from 'zod';
import {removeUserObjects} from '../src/lib/account/delete-storage';
async function main(){
 const parsed=z.string().uuid().safeParse(process.argv[2]);
 if(!parsed.success||process.argv.length!==3)throw new Error('Usage: npm run reconcile-deletion -- USER_UUID');
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error('Missing server-side Supabase configuration');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),user=parsed.data,token=randomUUID();
 const claim=await db.rpc('claim_account_deletion',{p_user:user,p_token:token});
 if(claim.error)throw new Error('Unable to claim job');
 if(!claim.data)throw new Error('No job available or job is leased; retry later');
 try{
  const exists=await db.rpc('account_user_exists',{p_user:user});
  if(exists.error||typeof exists.data!=='boolean')throw new Error('Unable to verify account status');
  if(exists.data)throw new Error('Account still exists; this command cannot delete it. User must retry or contact support.');
  await removeUserObjects(db.storage.from('career-documents'),user);
  const finish=await db.rpc('finish_account_deletion_job',{p_user:user,p_token:token});
  if(finish.error||!finish.data)throw new Error('Unable to finalize job or lease expired');
  console.log('Completed reconciliation of an already-deleted account.');
 }finally{const release=await db.rpc('release_account_deletion_lease',{p_user:user,p_token:token});if(release.error)console.error('Could not release lease; it will expire.');}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Reconciliation failed');process.exitCode=1;});
