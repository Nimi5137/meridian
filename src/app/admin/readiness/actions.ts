'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {requireUser} from '@/lib/auth';
import {isIntegrationAdmin} from '@/lib/readiness';
import {adminClient} from '@/lib/supabase/admin';
import {aiForProvider} from '@/lib/ai/service';
import {trackedAdapter} from '@/lib/ai/usage';
export async function checkAiProvider(form:FormData){const {db,user}=await requireUser();if(!isIntegrationAdmin(user.id))redirect('/dashboard');const parsed=z.enum(['groq','openai','anthropic','google']).safeParse(form.get('provider'));if(!parsed.success)redirect('/admin/readiness?error=Invalid%20provider');let config;try{config=aiForProvider(parsed.data);adminClient();}catch{redirect('/admin/readiness?error=Provider%20or%20server%20database%20credentials%20are%20not%20configured');}
 let adapter;try{adapter=await trackedAdapter(db,'readiness',config);}catch{redirect('/admin/readiness?error=Check%20limit%20reached%20or%20usage%20tracking%20unavailable');}let outcome:'success'|'error'='success';try{await adapter.generate({system:'Reply briefly.',prompt:'Reply OK.',maxTokens:32});}catch{outcome='error';}
 const saved=await adminClient().from('integration_checks').insert({integration:parsed.data,model:config.model,outcome,checked_by:user.id});if(saved.error)redirect('/admin/readiness?error=Could%20not%20save%20the%20check%20result');revalidatePath('/admin/readiness');redirect(`/admin/readiness?checked=${outcome}`);}
