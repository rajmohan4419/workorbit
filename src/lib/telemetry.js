import { supabase } from './supabase';

const VISITOR_KEY = 'orbitboard:visitor-id';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

function generateUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getVisitorId() {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing && isValidUuid(existing)) return existing;
    const id = generateUuid();
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return null;
  }
}

function sanitizePath(path) {
  if (!path || typeof path !== 'string') return '/';
  const trimmed = path.trim().slice(0, 500);
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export async function recordVisit(path = window.location.pathname) {
  if (!supabase) return null;
  const visitorId = getVisitorId();
  if (!visitorId) return null;

  try {
    const { data, error } = await supabase.rpc('record_visit', {
      p_visitor_id: visitorId,
      p_path: sanitizePath(path)
    });
    if (error) throw error;
    return Number(data);
  } catch (error) {
    console.warn('[OrbitBoard telemetry] visitor recording failed', error?.message, error?.hint);
    return null;
  }
}

export async function logEvent(eventName, metadata = {}, level = 'info') {
  if (!supabase) return;
  const visitorId = getVisitorId();
  try {
    const { error } = await supabase.rpc('log_app_event', {
      p_event_name: eventName,
      p_level: level,
      p_path: sanitizePath(window.location.pathname),
      p_visitor_id: visitorId,
      p_metadata: metadata
    });
    if (error) throw error;
  } catch (error) {
    console.warn('[OrbitBoard telemetry] event logging failed', error?.message, error?.hint);
  }
}

export { getVisitorId };
