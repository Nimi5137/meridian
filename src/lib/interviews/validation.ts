import {Temporal} from '@js-temporal/polyfill';
import {z} from 'zod';
const fields=z.object({title:z.string().trim().min(1).max(200),localTime:z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),timezone:z.string().trim().min(1).max(100),location:z.string().trim().max(500),notes:z.string().trim().max(6000)});
export function parseInterview(input:unknown){
 const result=fields.safeParse(input);if(!result.success)return null;
 const {title,localTime,timezone,location,notes}=result.data;
 try{
  if(timezone!=='UTC'&&!/^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+.-]+)+$/.test(timezone))return null;
  // Reject dates in daylight-saving gaps or overlaps rather than guessing which instant was meant.
  const plain=Temporal.PlainDateTime.from(localTime,{overflow:'reject'});
  const instant=plain.toZonedDateTime(timezone,{disambiguation:'reject'}).toInstant();
  const startsAt=instant.toString();
  if(instant.epochMilliseconds<Date.parse('2000-01-01T00:00:00Z')||instant.epochMilliseconds>=Date.parse('2101-01-01T00:00:00Z'))return null;
  return {title,starts_at:startsAt,timezone,location,notes};
 }catch{return null;}
}
/** A corrupt or obsolete timezone never crashes the application page. */
export function interviewLocalTime(startsAt:string,timezone:string){try{return Temporal.Instant.from(startsAt).toZonedDateTimeISO(timezone).toPlainDateTime().toString({smallestUnit:'minute'});}catch{return null;}}
