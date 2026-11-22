import { AuthForm } from '@/components/AuthForm';
export default async function Page({searchParams}:{searchParams:Promise<{error?:string;message?:string}>}) { const p=await searchParams; return <AuthForm mode="signup" error={p.error} message={p.message}/>; }
