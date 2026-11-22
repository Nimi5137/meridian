'use client';
import {useActionState,useState} from 'react';
import {saveCareerEntry} from '../../entry-actions';
import {careerKinds,type CareerEntryFormState} from '@/lib/cv/career-entry';
type Values={kind:string;title:string;organization:string;start_date:string;end_date:string;description:string};
const initialState:CareerEntryFormState={kind:'idle',message:''};
export function CareerEntryForm({id,version,initial}:{id:string;version:string;initial:Values}) {
 const [values,setValues]=useState(initial);const [state,action,pending]=useActionState(saveCareerEntry,initialState);
 const set=(field:keyof Values)=>(event:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>)=>setValues(previous=>({...previous,[field]:event.target.value}));
 return <form action={action}>
  <input type="hidden" name="id" value={id}/>{id&&<input type="hidden" name="version" value={version}/>}
  {state.message&&<div role="alert" className="alert error">{state.message}</div>}
  <label>Type<select name="kind" value={values.kind} onChange={set('kind')}>{careerKinds.map(kind=><option value={kind} key={kind}>{kind[0].toUpperCase()+kind.slice(1)}</option>)}</select></label>
  <label>Title<input name="title" maxLength={200} required value={values.title} onChange={set('title')} placeholder="Role, degree, project or achievement"/></label>
  <label>Organization<input name="organization" maxLength={200} value={values.organization} onChange={set('organization')} placeholder="Company, school or organization (optional)"/></label>
  <div className="form-grid"><label>Start date<input type="date" name="start_date" value={values.start_date} onChange={set('start_date')}/></label><label>End date<input type="date" name="end_date" value={values.end_date} onChange={set('end_date')}/></label></div>
  <label>Details<textarea name="description" maxLength={6000} rows={7} value={values.description} onChange={set('description')} placeholder="Responsibilities, accomplishments, context or results"/></label>
  <button className="button button-dark" disabled={pending||state.kind==='conflict'}>{pending?'Saving…':'Save entry'}</button>
 </form>;
}
