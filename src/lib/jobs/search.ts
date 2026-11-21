import type {Source} from './connectors';
export type SearchParam=string|string[]|undefined;
export const sources=['greenhouse','lever','lever_eu','ashby','smartrecruiters'] as const;
export function firstParam(value:SearchParam):string{return typeof value==='string'?value:Array.isArray(value)?value[0]||'':'';}
export function parseJobSearch(params:{q?:SearchParam;source?:SearchParam;sort?:SearchParam;page?:SearchParam}) {
 const q=firstParam(params.q).trim().slice(0,100);
 const rawSource=firstParam(params.source);const source=(sources as readonly string[]).includes(rawSource)?rawSource as Source:'';
 const sort=firstParam(params.sort)==='observed'?'observed':'date';const rawPage=firstParam(params.page);
 const parsed=/^[1-9]\d{0,4}$/.test(rawPage)?Number(rawPage):1;const page=parsed<=10000?parsed:1;
 return {q,source,sort,page};
}
export function jobSearchHref(search:ReturnType<typeof parseJobSearch>,page:number){const params=new URLSearchParams();if(search.q)params.set('q',search.q);if(search.source)params.set('source',search.source);if(search.sort==='observed')params.set('sort',search.sort);if(page>1)params.set('page',String(page));const query=params.toString();return `/jobs${query?`?${query}`:''}`;}
