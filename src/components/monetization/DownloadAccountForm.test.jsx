// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {beforeEach,afterEach,describe,expect,it,vi} from 'vitest';
import {DownloadAccountForm} from './DownloadAccountForm';
import {supabase} from '../../lib/supabase';
vi.mock('../../lib/supabase',()=>({supabase:{auth:{signInWithOAuth:vi.fn(),onAuthStateChange:vi.fn()}}}));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
describe('Google account sign-in',()=>{
 let root,container,popup,listener,unsubscribe;
 beforeEach(()=>{
  vi.stubEnv('VITE_SUPABASE_URL','https://synthetic.supabase.co');
  container=document.createElement('div');document.body.append(container);root=createRoot(container);
  popup={opener:{},location:{replace:vi.fn()},close:vi.fn(),closed:false};vi.spyOn(window,'open').mockReturnValue(popup);
  unsubscribe=vi.fn();
  supabase.auth.onAuthStateChange.mockImplementation(callback=>{listener=callback;return{data:{subscription:{unsubscribe}}};});
  supabase.auth.signInWithOAuth.mockResolvedValue({data:{url:'https://synthetic.supabase.co/auth/v1/authorize?provider=google'}});
 });
 afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.restoreAllMocks();vi.unstubAllEnvs();window.history.replaceState({},'','/');});
 const render=async props=>act(async()=>root.render(<MemoryRouter><DownloadAccountForm {...props}/></MemoryRouter>));
 const click=async()=>act(async()=>Array.from(container.querySelectorAll('button')).find(button=>button.textContent.includes('Continue with Google')).click());
 it('opens trusted Google OAuth separately and resumes the existing download on sign-in',async()=>{
  const done=vi.fn();await render({onSignedIn:done});await click();
  expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({provider:'google',options:{redirectTo:`${window.location.origin}/account`,skipBrowserRedirect:true,queryParams:{prompt:'select_account'}}});
  expect(popup.opener).toBeNull();expect(popup.location.replace).toHaveBeenCalledWith(expect.stringContaining('https://synthetic.supabase.co/auth/v1/authorize'));
  await act(async()=>listener('SIGNED_IN',{user:{id:'synthetic'}}));expect(done).toHaveBeenCalledOnce();
 });
 it('keeps email sign-in available when the popup is blocked',async()=>{
  window.open.mockReturnValue(null);await render();await click();
  expect(container.querySelector('[role="alert"]').textContent).toContain('Allow pop-ups');
  expect(container.querySelector('input[type="password"]')).not.toBeNull();
 });
 it('rejects untrusted OAuth URLs and recovers from provider errors',async()=>{
  supabase.auth.signInWithOAuth.mockResolvedValue({data:{url:'https://untrusted.example/auth/v1/authorize'}});
  await render();await click();expect(popup.location.replace).not.toHaveBeenCalled();expect(popup.close).toHaveBeenCalled();
  expect(container.querySelector('[role="alert"]').textContent).toContain('could not start');
 });
 it('shows a safe cancellation message without rendering provider error contents',async()=>{
  window.history.replaceState({},'','/account#error=access_denied&error_description=private-data');await render();
  expect(container.textContent).toContain('cancelled');expect(container.textContent).not.toContain('private-data');
 });
});
