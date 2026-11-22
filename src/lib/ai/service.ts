/** Server-only AI gateway. Credentials and model configuration must never reach a client. */
import 'server-only';
import { z, type ZodType } from 'zod';
import {validAiModelName} from './config';
export type Provider = 'groq' | 'openai' | 'anthropic' | 'google';
export type Task = 'extraction' | 'matching' | 'cv' | 'cover_letter' | 'email' | 'interview';
export interface GenerateRequest { system: string; prompt: string; maxTokens?: number }
export interface GenerateResult { text: string; provider: Provider; model: string; inputTokens?: number; outputTokens?: number }
export interface Adapter { readonly capabilities: { text: boolean; structured: boolean; streaming: boolean; tools: boolean; vision: boolean; embeddings: boolean }; generate(request: GenerateRequest): Promise<GenerateResult> }
const providerSchema=z.enum(['groq','openai','anthropic','google']);
const settingNames: Record<Provider,{key:string;model:string}> = {groq:{key:'GROQ_API_KEY',model:'GROQ_MODEL'},openai:{key:'OPENAI_API_KEY',model:'OPENAI_MODEL'},anthropic:{key:'ANTHROPIC_API_KEY',model:'ANTHROPIC_MODEL'},google:{key:'GOOGLE_API_KEY',model:'GOOGLE_MODEL'}};
export function resolveConfig(task:Task, env:Record<string,string|undefined>=process.env) {
 const prefix=`AI_${task.toUpperCase()}`;
 const defaultProvider=providerSchema.parse(env.AI_DEFAULT_PROVIDER || 'groq');
 const provider=providerSchema.parse(env[`${prefix}_PROVIDER`] || defaultProvider);
 // A default model belongs to the default provider; never silently send it to
 // a different provider selected by a task override.
 const model=(env[`${prefix}_MODEL`] || env[settingNames[provider].model] || (provider===defaultProvider?env.AI_DEFAULT_MODEL:undefined))?.trim();
 const key=env[settingNames[provider].key]?.trim();
 if(!validAiModelName(model) || !key) throw new Error(`AI provider ${provider} is not configured with a valid key and model.`);
 return {provider,model,key};
}
const caps={text:true,structured:true,streaming:false,tools:false,vision:false,embeddings:false} as const;
const MAX_PROVIDER_RESPONSE=2*1024*1024;
async function readProviderJson(response:Response):Promise<unknown> {
 const length=response.headers.get('content-length');if(length&&/^\d+$/.test(length)&&Number(length)>MAX_PROVIDER_RESPONSE)throw new Error('Provider response too large');
 if(!response.body)throw new Error('Provider response missing');const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_PROVIDER_RESPONSE){await reader.cancel();throw new Error('Provider response too large');}chunks.push(value);}}finally{reader.releaseLock();}
 const buffer=new Uint8Array(size);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.byteLength;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(buffer));
}
export class HttpAdapter implements Adapter {
 readonly capabilities=caps;
 constructor(private config:{provider:Provider;model:string;key:string}, private transport:typeof fetch=fetch) {}
 async generate(request:GenerateRequest):Promise<GenerateResult> {
  const {provider,model,key}=this.config; let url:string; let headers:Record<string,string>={'content-type':'application/json'}; let body:unknown;
  if(provider==='anthropic') {url='https://api.anthropic.com/v1/messages'; headers={...headers,'x-api-key':key,'anthropic-version':'2023-06-01'}; body={model,max_tokens:request.maxTokens??2048,system:request.system,messages:[{role:'user',content:request.prompt}]};}
  else if(provider==='google') {url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`; headers={...headers,'x-goog-api-key':key}; body={systemInstruction:{parts:[{text:request.system}]},contents:[{role:'user',parts:[{text:request.prompt}]}],generationConfig:{maxOutputTokens:request.maxTokens??2048}};}
  else {url=provider==='groq'?'https://api.groq.com/openai/v1/chat/completions':'https://api.openai.com/v1/chat/completions'; headers={...headers,authorization:`Bearer ${key}`}; body={model,messages:[{role:'system',content:request.system},{role:'user',content:request.prompt}],max_tokens:request.maxTokens??2048};}
  let response:Response; try {response=await this.transport(url,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(30000),redirect:'error'});} catch {throw new Error(`AI provider ${provider} could not be reached or timed out.`);} if(!response.ok) throw new Error(`AI provider ${provider} returned HTTP ${response.status}.`);
  let data:unknown;try{data=await readProviderJson(response);}catch{throw new Error(`AI provider ${provider} returned an invalid or oversized response.`);} let text:string|undefined; let inputTokens:number|undefined; let outputTokens:number|undefined;
  const tokens=z.number().int().nonnegative().max(100_000_000).optional();
  let finishReason:string|undefined;
  if(provider==='anthropic'){const parsed=z.object({stop_reason:z.string().nullable().optional(),content:z.array(z.object({type:z.string(),text:z.string().optional()})).optional(),usage:z.object({input_tokens:tokens,output_tokens:tokens}).optional()}).safeParse(data);if(!parsed.success)throw new Error(`AI provider ${provider} returned an invalid response.`);finishReason=parsed.data.stop_reason??undefined;text=parsed.data.content?.filter(p=>p.type==='text').map(p=>p.text||'').join('');inputTokens=parsed.data.usage?.input_tokens;outputTokens=parsed.data.usage?.output_tokens;}
  else if(provider==='google'){const parsed=z.object({candidates:z.array(z.object({finishReason:z.string().optional(),content:z.object({parts:z.array(z.object({text:z.string().optional(),thought:z.boolean().optional()})).optional()}).optional()})).optional(),usageMetadata:z.object({promptTokenCount:tokens,candidatesTokenCount:tokens}).optional()}).safeParse(data);if(!parsed.success)throw new Error(`AI provider ${provider} returned an invalid response.`);finishReason=parsed.data.candidates?.[0]?.finishReason;text=parsed.data.candidates?.[0]?.content?.parts?.filter(p=>p.thought!==true).map(p=>p.text||'').join('');inputTokens=parsed.data.usageMetadata?.promptTokenCount;outputTokens=parsed.data.usageMetadata?.candidatesTokenCount;}
  else {const parsed=z.object({choices:z.array(z.object({finish_reason:z.string().nullable().optional(),message:z.object({content:z.string().nullable().optional()}).optional()})).optional(),usage:z.object({prompt_tokens:tokens,completion_tokens:tokens}).nullable().optional()}).safeParse(data);if(!parsed.success)throw new Error(`AI provider ${provider} returned an invalid response.`);finishReason=parsed.data.choices?.[0]?.finish_reason??undefined;text=parsed.data.choices?.[0]?.message?.content??undefined;inputTokens=parsed.data.usage?.prompt_tokens;outputTokens=parsed.data.usage?.completion_tokens;}
  if(typeof text!=='string'||!text.trim()) throw new Error(`AI provider ${provider} returned no text.`);
  // A truncated, filtered, tool-use or unknown completion must not be saved as
  // a finished CV, cover letter or structured analysis. Do not echo its reason
  // or response body, which are provider-controlled and may contain user data.
  const complete=provider==='anthropic'?finishReason==='end_turn'||finishReason==='stop_sequence':provider==='google'?finishReason==='STOP':finishReason==='stop';
  if(!complete)throw new Error(`AI provider ${provider} did not return a complete response.`);
  return {text,provider,model,inputTokens,outputTokens};
 }
}
export function aiForTask(task:Task):{adapter:Adapter;provider:Provider;model:string} { const config=resolveConfig(task);return {adapter:new HttpAdapter(config),provider:config.provider,model:config.model}; }
export function aiForProvider(provider:Provider):{adapter:Adapter;provider:Provider;model:string} { const names=settingNames[provider]; const key=process.env[names.key]?.trim();const model=(process.env[names.model] || ((process.env.AI_DEFAULT_PROVIDER || 'groq')===provider ? process.env.AI_DEFAULT_MODEL : undefined))?.trim();if(!key||!validAiModelName(model))throw new Error(`AI provider ${provider} is not configured with a valid key and model.`);return {adapter:new HttpAdapter({provider,key,model}),provider,model}; }
export async function generateStructured<T>(adapter:Adapter,request:GenerateRequest,schema:ZodType<T>):Promise<{value:T;usage:GenerateResult}> { const usage=await adapter.generate({...request,system:`${request.system}\nReturn only a valid JSON object, with no markdown.`}); let json:unknown; try{json=JSON.parse(usage.text);}catch{throw new Error('AI provider returned invalid JSON.');} const parsed=schema.safeParse(json); if(!parsed.success) throw new Error('AI provider returned an invalid structured response.'); return {value:parsed.data,usage}; }
