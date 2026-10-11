import { Clock3 } from 'lucide-react';
import { ResultRow } from './ToolCard';

export function RecentToolsSection({ showExplore, recentTools, addRecent }) {
  if (!showExplore || recentTools.length === 0) return null;

  return (
    <div className="mt-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
          <Clock3 size={14} /> Continue where you left off
        </div>
        <span className="text-xs text-slate-700">{recentTools.length} recent</span>
      </div>
      <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {recentTools.map(tool => <ResultRow key={tool.slug} tool={tool} onUse={addRecent} compact />)}
      </div>
    </div>
  );
}
