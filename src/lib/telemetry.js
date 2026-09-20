import { supabase } from './supabase';

const VISITOR_KEY = 'orbitboard:visitor-id';

function getVisitorId() {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return null;
  }
}

export async function recordVisit(path = window.location.pathname) {
  const visitorId = getVisitorId();
  if (!visitorId) return null;

  try {
    const { data, error } = await supabase.rpc('record_visit', {
      p_visitor_id: visitorId,
      p_path: path
    });
    if (error) throw error;
    return Number(data);
  } catch (error) {
    console.warn('[OrbitBoard telemetry] visitor recording failed', error);
    return null;
  }
}

export async function logEvent(eventName, metadata = {}, level = 'info') {
  const visitorId = getVisitorId();
  try {
    const { error } = await supabase.rpc('log_app_event', {
      p_event_name: eventName,
      p_level: level,
      p_path: window.location.pathname,
      p_visitor_id: visitorId,
      p_metadata: metadata
    });
    if (error) throw error;
  } catch (error) {
    console.warn('[OrbitBoard telemetry] event logging failed', error);
  }
}

export { getVisitorId };
