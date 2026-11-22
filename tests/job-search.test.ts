import {describe,it,expect} from 'vitest';
import {parseJobSearch,jobSearchHref} from '../src/lib/jobs/search';
describe('job discovery search',()=>{
 it('normalizes filters and preserves them in page links',()=>{const search=parseJobSearch({q:'  data & research ',source:'lever',sort:'observed',page:'3'});expect(search).toEqual({q:'data & research',source:'lever',sort:'observed',page:3});expect(jobSearchHref(search,4)).toBe('/jobs?q=data+%26+research&source=lever&sort=observed&page=4');});
 it('rejects invalid sources, sorting and pages',()=>{expect(parseJobSearch({source:'unknown',sort:'other',page:'-2'})).toEqual({q:'',source:'',sort:'date',page:1});expect(parseJobSearch({page:'10001'}).page).toBe(1);expect(parseJobSearch({page:'1e3'}).page).toBe(1);});
 it('bounds search and handles repeated parameters',()=>{const parsed=parseJobSearch({q:['a'.repeat(110),'ignored'],source:['ashby','lever']});expect(parsed.q).toHaveLength(100);expect(parsed.source).toBe('ashby');expect(jobSearchHref(parsed,1)).not.toContain('page=');});
 it('keeps Lever EU distinct from the global source',()=>{const parsed=parseJobSearch({source:'lever_eu'});expect(parsed.source).toBe('lever_eu');expect(jobSearchHref(parsed,2)).toBe('/jobs?source=lever_eu&page=2');});
});
