import { MonoLabel, NumberedSection } from '@levelup/ui';

const FEATURES = [
  {
    code: 'F01',
    title: 'Role-based learning paths',
    description:
      'Eight purpose-built paths — Sales, Marketing, Support, HR, Finance, Managers, Execs, Engineering. Each one covers the tools and workflows that role actually uses.',
  },
  {
    code: 'F02',
    title: 'Built-in AI coach',
    description:
      'Operators ask the coach to review their prompts, explain a concept, or suggest a better approach — in context, without leaving the platform.',
  },
  {
    code: 'F03',
    title: 'Company policy upload',
    description:
      'Drop in your AI acceptable-use policy as PDF or plain text. The coach references it in every session, so guidance reflects your rules — not generic advice.',
  },
  {
    code: 'F04',
    title: 'Sensitive-data guardrails',
    description:
      'Automatic detection of PII, financial data, and confidential patterns in coach inputs. Operators see a warning before sending; admins see a flag in the risk report.',
  },
  {
    code: 'F05',
    title: 'Department reporting',
    description:
      'A live heatmap shows completion and scores by department and role. Filter by team, date range, or AI level. Export to CSV for your own tools.',
  },
  {
    code: 'F06',
    title: 'Certificates and badges',
    description:
      'Operators earn a verifiable certificate on completion of each path. Badges shareable on LinkedIn. Certificates stored, signed, and auditable.',
  },
];

export function FeatureGrid() {
  return (
    <div id="features" className="border-b border-ink-600 bg-ink-900 py-24 lg:py-32">
      <div className="mx-auto max-w-content px-6 lg:px-8">
        <NumberedSection numeral="IV." eyebrow="THE OUTPUT">
          <div className="mb-16 grid gap-8 lg:grid-cols-[7fr,5fr] lg:items-end">
            <h2 className="font-serif text-display-lg text-paper-100">
              Everything ships in <em className="italic text-signal">one instrument.</em>
            </h2>
            <p className="text-body-lg text-paper-300">
              No stitching together a course platform, an LMS, a policy wiki, and a reporting tool.
              The whole stack is one workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-ink-600 bg-ink-600 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ code, title, description }) => (
              <article
                key={code}
                className="group bg-ink-800 p-8 transition-colors duration-200 ease-mission hover:bg-ink-700"
              >
                <div className="mb-6 flex items-baseline justify-between border-b border-ink-600 pb-3">
                  <MonoLabel className="text-paper-500">{code}</MonoLabel>
                  <MonoLabel
                    tone="signal"
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    →
                  </MonoLabel>
                </div>
                <h3 className="font-sans text-h2 font-medium text-paper-100">{title}</h3>
                <p className="mt-4 text-body-sm text-paper-300">{description}</p>
              </article>
            ))}
          </div>
        </NumberedSection>
      </div>
    </div>
  );
}
