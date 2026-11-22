import Link from 'next/link';
import { brand } from '@/config/brand';
export function Logo({light=false}:{light?:boolean}) { return <Link className={`logo ${light?'logo-light':''}`} href="/"><span className="logo-mark"><span>✳</span></span><span>{brand.name.toLowerCase()}<i>.</i></span></Link>; }
