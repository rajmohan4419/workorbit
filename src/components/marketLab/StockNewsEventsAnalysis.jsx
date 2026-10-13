import { Newspaper, CalendarDays, Sparkles, ExternalLink, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

export function StockNewsEventsAnalysis({ news, events, analysis, analysisLoading, analysisError, onRetryAnalysis }) {
  return (
    <div className="mt-8 grid lg:grid-cols-12 gap-8">
      {/* Left Column (8 cols): AI Analysis Card & News List */}
      <div className="lg:col-span-8 space-y-8">

        {/* AI Analysis Card */}
        <section className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-stone-50 p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Sparkles size={160} className="text-violet-600" />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 border border-violet-200 text-violet-700">
                <Sparkles size={20} />
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-700">Gemini 2.5 Flash</span>
                <h2 className="text-2xl font-black text-stone-900">AI Evidence Summary</h2>
              </div>
            </div>
            {onRetryAnalysis && !analysisLoading && (
              <button
                type="button"
                onClick={onRetryAnalysis}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 shadow-sm hover:bg-stone-50"
              >
                <RefreshCw size={12} /> Retry
              </button>
            )}
          </div>

          {analysisLoading ? (
            <AnalysisSkeleton />
          ) : analysisError ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 flex items-start gap-3">
              <AlertCircle size={20} className="shrink-0 text-rose-600 mt-0.5" />
              <div>
                <strong className="block font-bold">Analysis Unavailable</strong>
                <p className="mt-1 text-xs text-rose-700">{analysisError}</p>
              </div>
            </div>
          ) : analysis ? (
            <div className="mt-6 space-y-6 text-stone-800">
              {/* Executive Summary */}
              <div className="rounded-2xl border border-stone-200 bg-white p-5 leading-relaxed text-sm sm:text-base">
                <h3 className="text-xs font-bold uppercase tracking-wider text-violet-700 mb-2">Executive Overview</h3>
                <p>{analysis.summary}</p>
              </div>

              {/* News Takeaways */}
              {analysis.news_takeaways && analysis.news_takeaways.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-violet-700 mb-3 flex items-center gap-2">
                    <CheckCircle2 size={14} /> Key News Insights & Citations
                  </h3>
                  <div className="space-y-2.5">
                    {analysis.news_takeaways.map((item, idx) => (
                      <div key={idx} className="rounded-xl border border-stone-200 bg-white p-3.5 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <span className="text-stone-700">{item.point}</span>
                        {item.source_url && item.source_url !== 'Public market record' && item.source_url.startsWith('http') ? (
                          <a
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 shrink-0 text-[11px] font-bold text-violet-700 hover:text-violet-900 underline"
                          >
                            Source <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="text-[10px] text-stone-500 font-semibold shrink-0">Public Record</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Event Timeline */}
              {analysis.timeline && analysis.timeline.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-violet-700 mb-3 flex items-center gap-2">
                    <CalendarDays size={14} /> Event Timeline
                  </h3>
                  <div className="space-y-2.5">
                    {analysis.timeline.map((item, idx) => (
                      <div key={idx} className="rounded-xl border border-stone-200 bg-white p-3.5 text-xs sm:text-sm flex items-start gap-3">
                        <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-700 shrink-0 mt-0.5 border border-stone-200">
                          {item.date}
                        </span>
                        <div className="flex-1 flex justify-between gap-2">
                          <span className="text-stone-700">{item.event}</span>
                          {item.source_url && item.source_url.startsWith('http') && (
                            <a
                              href={item.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-violet-700 hover:text-violet-900 text-xs shrink-0 inline-flex items-center gap-1 font-semibold"
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

              {/* Upcoming Scheduled Events */}
              {analysis.upcoming_events && analysis.upcoming_events.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-3 flex items-center gap-2">
                    <CalendarDays size={14} /> Scheduled Upcoming Events
                  </h3>
                  <div className="space-y-2 text-xs sm:text-sm rounded-xl border border-stone-200 bg-white p-4">
                    {analysis.upcoming_events.map((e, idx) => (
                      <div key={idx} className="flex justify-between items-center border-b border-stone-100 pb-2 last:border-b-0 last:pb-0">
                        <span className="font-semibold text-stone-800">{e.event}</span>
                        <span className="font-mono text-stone-500 text-xs">{e.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Gaps */}
              {analysis.data_gaps && analysis.data_gaps.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Data Gaps / Unverified Factors</h3>
                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 text-xs text-stone-600 space-y-1">
                    {analysis.data_gaps.map((gap, idx) => (
                      <p key={idx}>• {gap}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Regulatory / AI Disclaimer */}
              <div className="mt-6 pt-4 border-t border-stone-200 text-[11px] text-stone-500 leading-relaxed italic">
                Educational research summary generated by AI from public data. Not investment advice, a recommendation, or research analysis. OrbitBoard is not a SEBI-registered adviser. Data may be delayed or incomplete.
              </div>
            </div>
          ) : null}
        </section>

        {/* News List */}
        <section className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Newspaper size={20} className="text-stone-700" />
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">Recent News & Coverage</h2>
          </div>

          {news && news.length > 0 ? (
            <div className="space-y-3">
              {news.map((item, idx) => (
                <article
                  key={idx}
                  className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 transition hover:border-stone-300"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-stone-900 hover:text-violet-700">
                      <a href={item.url || item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5">
                        {item.title}
                        <ExternalLink size={14} className="shrink-0 text-stone-400" />
                      </a>
                    </h3>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
                    <span className="font-semibold text-stone-600">{item.publisher}</span>
                    <span>{item.publishedAt || item.published_at}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-sm text-stone-500 p-6 text-center border border-dashed border-stone-200 rounded-2xl bg-stone-50">
              No recent news articles available in current market record.
            </div>
          )}
        </section>
      </div>

      {/* Right Column (4 cols): Company Events */}
      <div className="lg:col-span-4">
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sticky top-20">
          <div className="flex items-center gap-2 mb-6">
            <CalendarDays size={20} className="text-stone-700" />
            <h2 className="text-xl font-black text-stone-900">Company Calendar</h2>
          </div>

          {events && (events.earnings?.length > 0 || events.dividends?.length > 0 || events.splits?.length > 0) ? (
            <div className="space-y-4 text-xs sm:text-sm">
              {events.earnings && events.earnings.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase text-amber-700 mb-2">Earnings</h3>
                  <div className="space-y-2">
                    {events.earnings.map((e, idx) => (
                      <div key={idx} className="rounded-xl border border-stone-200 bg-stone-50 p-3 flex justify-between items-center">
                        <span className="text-stone-800 font-semibold">{e.detail || e.event}</span>
                        <span className="text-stone-500 font-mono text-xs">{e.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {events.dividends && events.dividends.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase text-emerald-700 mb-2">Dividends</h3>
                  <div className="space-y-2">
                    {events.dividends.map((d, idx) => (
                      <div key={idx} className="rounded-xl border border-stone-200 bg-stone-50 p-3 flex justify-between items-center">
                        <span className="text-stone-800 font-semibold">{d.detail || d.event}</span>
                        <span className="text-stone-500 font-mono text-xs">{d.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {events.splits && events.splits.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase text-blue-700 mb-2">Splits</h3>
                  <div className="space-y-2">
                    {events.splits.map((s, idx) => (
                      <div key={idx} className="rounded-xl border border-stone-200 bg-stone-50 p-3 flex justify-between items-center">
                        <span className="text-stone-800 font-semibold">{s.detail || s.event}</span>
                        <span className="text-stone-500 font-mono text-xs">{s.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-stone-500 p-6 text-center border border-dashed border-stone-200 rounded-2xl bg-stone-50">
              No corporate events logged in current record.
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
      <div className="h-20 bg-stone-200/60 rounded-2xl" />
      <div className="h-16 bg-stone-200/40 rounded-xl" />
      <div className="h-16 bg-stone-200/40 rounded-xl" />
      <div className="h-12 bg-stone-200/30 rounded-xl" />
    </div>
  );
}
