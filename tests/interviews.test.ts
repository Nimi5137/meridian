import {describe,it,expect} from 'vitest';
import {parseInterview,interviewLocalTime} from '../src/lib/interviews/validation';
const base={title:'Technical interview',localTime:'2027-02-04T15:30',timezone:'Europe/Budapest',location:'Video call',notes:'Prepare questions'};
describe('manual interview validation',()=>{
 it('converts a wall time using its specified timezone and roundtrips',()=>{const parsed=parseInterview(base);expect(parsed?.starts_at).toBe('2027-02-04T14:30:00Z');expect(interviewLocalTime(parsed!.starts_at,parsed!.timezone)).toBe(base.localTime);});
 it('handles summer time accurately',()=>{expect(parseInterview({...base,localTime:'2027-07-04T15:30'})?.starts_at).toBe('2027-07-04T13:30:00Z');});
 it('rejects daylight-saving gaps and repeated ambiguous times',()=>{expect(parseInterview({...base,localTime:'2027-03-28T02:30'})).toBeNull();expect(parseInterview({...base,localTime:'2027-10-31T02:30'})).toBeNull();});
 it('rejects invalid dates, offsets, timezones, and overlong or empty fields',()=>{for(const changes of [{localTime:'2027-02-30T10:00'},{localTime:'2027-04-01T11:00Z'},{timezone:'+02:00'},{timezone:'Not/AZone'},{title:' '},{notes:'x'.repeat(6001)},{localTime:'2102-01-01T10:00'}])expect(parseInterview({...base,...changes})).toBeNull();expect(interviewLocalTime('2027-01-01T00:00:00Z','bad timezone')).toBeNull();});
});
