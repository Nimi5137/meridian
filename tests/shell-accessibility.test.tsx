import {describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
vi.mock('@/app/actions',()=>({signOut:async()=>{}}));
import {Shell} from '../src/components/Shell';
describe('workspace navigation accessibility',()=>{
 it('provides a skip target and identifies the current page in both navigation variants',()=>{const html=renderToStaticMarkup(<Shell active="/profile" email="user@example.org">Profile content</Shell>);expect(html).toContain('href="#workspace-main"');expect(html).toContain('<main id="workspace-main" tabindex="-1"');expect((html.match(/aria-current="page"/g)||[])).toHaveLength(2);expect((html.match(/aria-label="Workspace"/g)||[])).toHaveLength(2);});
});
