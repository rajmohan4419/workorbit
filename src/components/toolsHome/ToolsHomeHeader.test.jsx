// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {describe,expect,it,vi} from 'vitest';
import {ToolsHomeHeader} from './ToolsHomeHeader';
import {useAccountSession} from '../../lib/monetization/useAccountSession';
vi.mock('../../lib/monetization/useAccountSession',()=>({useAccountSession:vi.fn()}));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
describe('download account navigation',()=>{
 it('shows Account after sign-in and restores sign-in copy after sign-out',async()=>{
  const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
  try {
   vi.mocked(useAccountSession).mockReturnValue({loading:false,session:{user:{id:'synthetic'}}});
   await act(async()=>root.render(<MemoryRouter><ToolsHomeHeader/></MemoryRouter>));
   expect(container.querySelector('a[href="/account"]').textContent.trim()).toBe('Account');
   expect(container.textContent).not.toContain('Sign up');
   vi.mocked(useAccountSession).mockReturnValue({loading:false,session:null});
   await act(async()=>root.render(<MemoryRouter><ToolsHomeHeader/></MemoryRouter>));
   expect(container.querySelector('a[href="/account"]').textContent.trim()).toBe('Sign up / Sign in');
  } finally {await act(async()=>root.unmount());container.remove();}
 });
});
