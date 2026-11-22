'use client';
import {useState} from 'react';
import {emptyPreparationNotes,formatPreparationNotes,preparationPrompts} from '@/lib/interviews/preparation';

export function PreparationNotes({role,company}:{role:string;company:string}) {
 const [notes,setNotes]=useState({...emptyPreparationNotes});
 function download(){
  const blob=new Blob([formatPreparationNotes(role,company,notes)],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='interview-preparation.txt';document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 return <section className="panel form-section" aria-labelledby="prep-notes-title">
  <div className="overline">YOUR WORKING NOTES</div><h3 id="prep-notes-title">Prepare in your own words</h3>
  <p>These fixed prompts are a guide, not AI-generated advice. Your notes stay in this page and are not saved to your account. Download them before leaving or reloading.</p>
  {preparationPrompts.map(prompt=><label key={prompt.id}>{prompt.title}<span className="label-hint">{prompt.question}</span><textarea rows={4} maxLength={4000} value={notes[prompt.id]} onChange={event=>setNotes(previous=>({...previous,[prompt.id]:event.target.value}))}/></label>)}
  <button type="button" className="button button-dark" onClick={download}>Download notes as text ↓</button>
  <p className="disclaimer">The downloaded file may contain private information. Store and share it carefully.</p>
 </section>;
}
