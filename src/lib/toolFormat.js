// Formatting and download helpers shared by tool modules.

export const money = n => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.max(0, Number(n) || 0));
export const num = v => Math.max(0, Number(v) || 0);

export function downloadBlob(blob, filename) {
  if (typeof window !== 'undefined') {
    let isPro = false;
    try {
      const raw = localStorage.getItem('orbitboard_pro_session');
      if (raw) {
        const session = JSON.parse(raw);
        if (session?.expiresAt && new Date(session.expiresAt).getTime() > Date.now()) {
          isPro = true;
        }
      }
    } catch {
      isPro = false;
    }

    if (!isPro) {
      const slugMatch = window.location.pathname.match(/\/tools\/([^/?#]+)/);
      const toolSlug = slugMatch ? slugMatch[1] : 'general';
      try {
        const usageRaw = localStorage.getItem('orbitboard_tool_usage');
        const usageMap = usageRaw ? JSON.parse(usageRaw) : {};
        const usage = Number(usageMap[toolSlug] || 0);

        if (usage >= 1) {
          // Free usage consumed: trigger ₹19 Pro Upgrade Modal
          window.dispatchEvent(
            new CustomEvent('orbitboard:require-pro', {
              detail: { toolSlug, toolName: filename || 'this tool' },
            })
          );
          return false;
        }

        // 1st run is free: record usage and proceed
        usageMap[toolSlug] = 1;
        localStorage.setItem('orbitboard_tool_usage', JSON.stringify(usageMap));
        window.dispatchEvent(new Event('orbitboard:pro-change'));
      } catch (err) {
        console.warn('[OrbitBoard] Tool usage check error', err);
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
