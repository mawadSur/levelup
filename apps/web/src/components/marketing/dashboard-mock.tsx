export function DashboardMock() {
  return (
    <div className="relative w-full max-w-xl mx-auto select-none" aria-hidden="true">
      {/* Browser chrome */}
      <div className="rounded-xl overflow-hidden border border-border shadow-2xl bg-background">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/40">
          <span className="w-3 h-3 rounded-full bg-red-400/80" />
          <span className="w-3 h-3 rounded-full bg-yellow-400/80" />
          <span className="w-3 h-3 rounded-full bg-green-400/80" />
          <div className="flex-1 mx-4 h-5 rounded-md bg-muted text-[10px] text-muted-foreground flex items-center px-3">
            app.levelup.ai/learn
          </div>
        </div>

        {/* App shell */}
        <div className="flex" style={{ height: 320 }}>
          {/* Sidebar */}
          <div className="w-40 border-r border-border bg-muted/30 flex flex-col py-4 gap-1 px-2 shrink-0">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md mb-2">
              <div className="w-5 h-5 rounded bg-indigo-600" />
              <span className="text-[11px] font-semibold text-foreground">LevelUp</span>
            </div>
            {[
              { label: 'My Learning', active: true },
              { label: 'AI Coach', active: false },
              { label: 'Prompts', active: false },
              { label: 'Certificates', active: false },
            ].map(({ label, active }) => (
              <div
                key={label}
                className={`px-2 py-1.5 rounded-md text-[11px] font-medium ${
                  active ? 'bg-indigo-600/10 text-indigo-600' : 'text-muted-foreground'
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 p-4 overflow-hidden">
            {/* Header row */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[13px] font-semibold text-foreground">
                  Good afternoon, Jordan
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  3 lessons remaining this week
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-700">
                  JL
                </div>
              </div>
            </div>

            {/* Progress card */}
            <div className="rounded-lg border border-border bg-card p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-foreground">
                  AI Fundamentals for Marketing
                </span>
                <span className="text-[10px] font-semibold text-indigo-600">68%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-indigo-600" style={{ width: '68%' }} />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-muted-foreground">9 of 13 lessons complete</span>
                <span className="text-[10px] text-muted-foreground">Est. 40 min left</span>
              </div>
            </div>

            {/* Next lesson row */}
            <div className="rounded-lg border border-border bg-card p-3 mb-3 flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-indigo-600/10 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <polygon points="3,2 11,7 3,12" fill="hsl(239 84% 45%)" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-foreground truncate">
                  Writing effective prompts for campaign briefs
                </div>
                <div className="text-[10px] text-muted-foreground">Lesson 10 · 12 min</div>
              </div>
              <div className="text-[10px] font-medium text-indigo-600 shrink-0">Continue</div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Streak', value: '14d' },
                { label: 'Score avg', value: '84%' },
                { label: 'Cert ready', value: '1' },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-lg border border-border bg-card p-2 text-center"
                >
                  <div className="text-[13px] font-bold text-foreground">{value}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating coach badge */}
      <div className="absolute -bottom-4 -right-4 rounded-xl border border-border shadow-lg bg-background p-3 flex items-center gap-2 w-52">
        <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 1C3.24 1 1 3.24 1 6s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 2.5c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm0 5.5c-1.25 0-2.36-.63-3-1.58.02-.98 2-1.52 3-1.52.99 0 2.98.54 3 1.52A3.49 3.49 0 016 9z"
              fill="white"
            />
          </svg>
        </div>
        <div>
          <div className="text-[10px] font-semibold text-foreground">AI Coach ready</div>
          <div className="text-[9px] text-muted-foreground">Ask me anything about AI</div>
        </div>
      </div>
    </div>
  );
}
