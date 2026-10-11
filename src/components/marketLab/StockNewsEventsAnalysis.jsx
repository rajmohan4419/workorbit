import { Newspaper, CalendarDays, Sparkles, ExternalLink, AlertCircle, CheckCircle2, Eye } from 'lucide-react';

export function StockNewsEventsAnalysis({ news, events, analysis, analysisLoading, analysisError }) {
  return (
    <div className="mt-8 grid lg:grid-cols-12 gap-8">
      {/* Left Column (8 cols): AI Analysis Card & News List */}
      <div className="lg:col-span-8 space-y-8">
        
        {/* AI Analysis Card */}
        <section className="rounded-3xl border border-violet-900/60 bg-gradient-to-br from-violet-950/40 via-slate-900 to-slate-950 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Sparkles size={160} className="text-violet-400" />
          </div>

          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600/30 border border-violet-500/40 text-violet-300">
              <Sparkles size={20} />
            </span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Gemini 2.5 Flash</span>
              <h2 className="text-2xl font-black text-white">AI Research Summary</h2>
            </div>
          </div>

          {analysisLoading ? (
            <AnalysisSkeleton />
          ) : analysisError ? (
            <div className="mt-6 rounded-2xl border border-rose-900/60 bg-rose-950/20 p-5 text-sm text-rose-300 flex items-start gap-3">
              <AlertCircle size={20} className="shrink-0 text-rose-400 mt-0.5" />
              <div>
                <strong className="block font-bold">Analysis Unavailable</strong>
                <p className="mt-1 text-xs text-rose-300/80">{analysisError}</p>
              </div>
            </div>
          ) : analysis ? (
            <div className="mt-6 space-y-6 text-slate-200">
              {/* Executive Summary */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 leading-relaxed text-sm sm:text-base">
                <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400 mb-2">Executive Overview</h3>
                <p>{analysis.summary}</p>
              </div>

              {/* News Takeaways */}
              {analysis.news_takeaways && analysis.news_takeaways.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400 mb-3 flex items-center gap-2">
                    <CheckCircle2 size={14} /> Key News Insights & Citations
                  </h3>
                  <div className="space-y-2.5">
                    {analysis.news_takeaways.map((item, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <span className="text-slate-300">{item.point}</span>
                        {item.source_url && item.source_url !== 'Public market record' && item.source_url.startsWith('http') ? (
                          <a
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 shrink-0 text-[11px] font-bold text-violet-400 hover:text-violet-300 underline"
                          >
                            Source <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-semibold shrink-0">Public Record</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Event Timeline */}
              {analysis.timeline && analysis.timeline.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400 mb-3 flex items-center gap-2">
                    <CalendarDays size={14} /> Event Timeline
                  </h3>
                  <div className="space-y-2.5">
                    {analysis.timeline.map((item, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 text-xs sm:text-sm flex items-start gap-3">
                        <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-300 shrink-0 mt-0.5">
                          {item.date}
                        </span>
                        <div className="flex-1 flex justify-between gap-2">
                          <span className="text-slate-300">{item.event}</span>
                          {item.source_url && item.source_url.startsWith('http') && (
                            <a
                              href={item.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-violet-400 hover:text-violet-300 text-xs shrink-0 inline-flex items-center gap-1 font-semibold"
                            >
                              Link <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Things to Watch */}
              {analysis.things_to_watch && analysis.things_to_watch.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
                    <Eye size={14} /> Things to Watch
                  </h3>
                  <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-slate-300 rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
                    {analysis.things_to_watch.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Data Gaps */}
              {analysis.data_gaps && analysis.data_gaps.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Data Gaps / Unverified Factors</h3>
                  <div className="rounded-xl border border-slate-800/60 bg-slate-950/50 p-3.5 text-xs text-slate-400 space-y-1">
                    {analysis.data_gaps.map((gap, idx) => (
                      <p key={idx}>• {gap}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </section>

        {/* News List */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <Newspaper size={20} className="text-blue-400" />
            <h2 className="text-xl sm:text-2xl font-black text-white">Recent News & Coverage</h2>
          </div>

          {news && news.length > 0 ? (
            <div className="space-y-3">
              {news.map((item, idx) => (
                <article
                  key={idx}
                  className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 transition hover:border-slate-700"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-slate-100 hover:text-violet-300">
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5">
                        {item.title}
                        <ExternalLink size={14} className="shrink-0 text-slate-500" />
                      </a>
                    </h3>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-400">{item.publisher}</span>
                    <span>{item.published_at}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500 p-6 text-center border border-dashed border-slate-800 rounded-2xl">
              No recent news articles found in public record.
            </div>
          )}
        </section>
      </div>

      {/* Right Column (4 cols): Company Events */}
      <div className="lg:col-span-4">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl sticky top-20">
          <div className="flex items-center gap-2 mb-6">
            <CalendarDays size={20} className="text-amber-400" />
            <h2 className="text-xl font-black text-white">Company Calendar</h2>
          </div>

          {events && (events.earnings?.length > 0 || events.dividends?.length > 0 || events.splits?.length > 0) ? (
            <div className="space-y-4 text-xs sm:text-sm">
              {events.earnings && events.earnings.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase text-amber-400 mb-2">Earnings</h3>
                  <div className="space-y-2">
                    {events.earnings.map((e, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950 p-3 flex justify-between items-center">
                        <span className="text-slate-300 font-semibold">{e.event}</span>
                        <span className="text-slate-400 font-mono text-xs">{e.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {events.dividends && events.dividends.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase text-emerald-400 mb-2">Dividends</h3>
                  <div className="space-y-2">
                    {events.dividends.map((d, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950 p-3 flex justify-between items-center">
                        <span className="text-slate-300 font-semibold">{d.event}</span>
                        <span className="text-slate-400 font-mono text-xs">{d.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {events.splits && events.splits.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase text-blue-400 mb-2">Splits</h3>
                  <div className="space-y-2">
                    {events.splits.map((s, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950 p-3 flex justify-between items-center">
                        <span className="text-slate-300 font-semibold">{s.event}</span>
                        <span className="text-slate-400 font-mono text-xs">{s.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-slate-500 p-6 text-center border border-dashed border-slate-800 rounded-2xl">
              No corporate events logged in record.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="mt-6 space-y-4 animate-pulse">
      <div className="h-20 bg-slate-800/60 rounded-2xl" />
      <div className="h-16 bg-slate-800/40 rounded-xl" />
      <div className="h-16 bg-slate-800/40 rounded-xl" />
      <div className="h-12 bg-slate-800/30 rounded-xl" />
    </div>
  );
}
