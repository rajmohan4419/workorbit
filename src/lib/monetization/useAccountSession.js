import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export function useAccountSession() {
  const [state, setState] = useState({ session: null, loading: Boolean(supabase?.auth) });
  useEffect(() => {
    if (!supabase?.auth) return;
    let live = true;
    let authChanged = false;
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      authChanged = true;
      if (live) setState({ session, loading: false });
    });
    supabase.auth.getSession().then(({ data: sessionData }) => {
      if (live && !authChanged) setState({ session: sessionData?.session || null, loading: false });
    }).catch(() => { if (live) setState({ session: null, loading: false }); });
    return () => { live = false; authListener?.subscription?.unsubscribe(); };
  }, []);
  return state;
}
