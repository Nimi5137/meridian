import Link from 'next/link';
import {ArrowUpRight, CheckCircle2, Circle, CircleHelp} from 'lucide-react';
import type {OnboardingStep} from '@/lib/onboarding';

/** A guide, not a required checklist or an automated assessment of the candidate. */
export function OnboardingSteps({steps}:{steps:OnboardingStep[]}) {
 return <section className="panel" aria-labelledby="onboarding-heading">
  <div className="panel-title"><div><div className="overline">A PLACE TO BEGIN</div><h3 id="onboarding-heading">Your next steps</h3></div></div>
  <p>These steps are optional. Your saved records determine the status shown here.</p>
  <div className="step-list">{steps.map(step=><Link href={step.href} key={step.id}>
   <span className="step-icon" aria-hidden="true">{step.state==='done'?<CheckCircle2 size={18}/>:step.state==='unknown'?<CircleHelp size={18}/>:<Circle size={18}/>}</span>
   <span><strong>{step.title}</strong><small>{step.description} <b>{step.state==='done'?'Saved':step.state==='todo'?'Not yet saved':'Status unavailable'}</b></small></span><ArrowUpRight size={17} aria-hidden="true"/>
  </Link>)}</div>
 </section>;
}
