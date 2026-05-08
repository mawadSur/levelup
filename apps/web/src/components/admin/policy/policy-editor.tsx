'use client';

import * as React from 'react';
import { Loader2, Save } from 'lucide-react';
import {
  Button,
  Label,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from '@levelup/ui';
import { policies } from '@/lib/api';
import type { PolicyVersion } from '@/lib/api/policies';
import { MarkdownPreview } from './markdown-preview';
import { ApprovedToolsEditor, type ApprovedToolsTier } from './approved-tools-editor';

// ---------------------------------------------------------------------------
// Sample policy seed
// ---------------------------------------------------------------------------

export const SAMPLE_POLICY_TEXT = `# AI Usage Policy

## Purpose

This policy establishes guidelines for the responsible use of artificial intelligence (AI) tools across all departments.

## Scope

Applies to all employees, contractors, and partners who use AI tools in connection with company work.

## Approved Use Cases

- Drafting and editing internal documents
- Summarising research and meeting notes
- Writing and reviewing code (non-production secrets)
- Generating marketing copy for internal review

## Prohibited Use Cases

- Processing personally identifiable information (PII) in consumer AI tools
- Sharing client data, financial data, or source code with unapproved tools
- Autonomous decision-making without human oversight

## Data Classification Rules

| Classification | Approved tools |
|---|---|
| Public | Any approved tool |
| Internal | Enterprise tier and above |
| Confidential | Internal tools only |
| Restricted | Not permitted in AI tools |

## Compliance

Violations of this policy must be reported to your manager and to the AI Governance team.
`;

const SAMPLE_APPROVED_TOOLS: ApprovedToolsTier[] = [
  {
    tier: 'consumer',
    tools: [{ name: 'ChatGPT (free)', vendor: 'OpenAI', approvedFor: ['Public'] }],
  },
  {
    tier: 'enterprise',
    tools: [
      {
        name: 'ChatGPT Enterprise',
        vendor: 'OpenAI',
        approvedFor: ['Public', 'Internal'],
      },
      {
        name: 'Claude for Work',
        vendor: 'Anthropic',
        approvedFor: ['Public', 'Internal', 'Confidential'],
      },
    ],
  },
  {
    tier: 'internal',
    tools: [
      {
        name: 'Internal LLM Gateway',
        vendor: 'Internal',
        approvedFor: ['Public', 'Internal', 'Confidential', 'Restricted'],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PolicyEditorProps {
  initialPolicy: PolicyVersion | null;
  onPublished: (policy: PolicyVersion) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PolicyEditor({ initialPolicy, onPublished }: PolicyEditorProps) {
  const [text, setText] = React.useState(initialPolicy?.policyText ?? '');
  const [tiers, setTiers] = React.useState<ApprovedToolsTier[]>(() =>
    SAMPLE_APPROVED_TOOLS.map((t) => ({ ...t, tools: [...t.tools] })),
  );
  const [saving, setSaving] = React.useState(false);

  function loadSample() {
    setText(SAMPLE_POLICY_TEXT);
    setTiers(SAMPLE_APPROVED_TOOLS.map((t) => ({ ...t, tools: [...t.tools] })));
  }

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      // Flatten the tiered editor model to the contract shape:
      //   Array<{ name, tier: 'approved'|'caution'|'banned', notes? }>
      // The editor's "consumer/enterprise/internal" axis is about capability
      // tier; we map it onto the governance tier expected by the contract:
      //   - consumer    → caution (free / unvetted accounts)
      //   - enterprise  → approved
      //   - internal    → approved
      // Vendor + approved-for data classes are preserved in `notes`.
      const approvedTools = tiers.flatMap((tier) =>
        tier.tools
          .filter((t) => t.name.trim())
          .map<{ name: string; tier: 'approved' | 'caution' | 'banned'; notes?: string }>((t) => {
            const governanceTier: 'approved' | 'caution' | 'banned' =
              tier.tier === 'consumer' ? 'caution' : 'approved';
            const noteParts: string[] = [];
            if (t.vendor) noteParts.push(`Vendor: ${t.vendor}`);
            noteParts.push(`Capability tier: ${tier.tier}`);
            if (t.approvedFor.length > 0) {
              noteParts.push(`Approved for: ${t.approvedFor.join(', ')}`);
            }
            return {
              name: t.name.trim(),
              tier: governanceTier,
              notes: noteParts.join(' · '),
            };
          }),
      );
      const result = await policies.publishPolicy({
        policyText: text.trim(),
        approvedTools,
      });
      toast({ title: `Policy v${result.version} published.` });
      onPublished(result);
    } catch (err) {
      toast({
        title: 'Publish failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Markdown editor + preview */}
      <div>
        <Label className="mb-2 block text-sm font-semibold">Policy document</Label>
        <Tabs defaultValue="write">
          <TabsList className="mb-2">
            <TabsTrigger value="write">Markdown editor</TabsTrigger>
            <TabsTrigger value="preview">Live preview</TabsTrigger>
          </TabsList>
          <TabsContent value="write">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste or write your AI policy in Markdown…"
              rows={20}
              className="font-mono text-sm resize-y"
            />
          </TabsContent>
          <TabsContent value="preview">
            <div className="min-h-[24rem] rounded-md border border-ink-600 bg-ink-900 p-4 overflow-auto">
              <MarkdownPreview content={text} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Separator />

      {/* Approved tools */}
      <ApprovedToolsEditor tiers={tiers} onChange={setTiers} />

      <Separator />

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        {!initialPolicy && (
          <Button type="button" variant="outline" onClick={loadSample}>
            Use sample policy
          </Button>
        )}
        <div className="flex-1" />
        <Button onClick={handleSave} disabled={saving || !text.trim()} className="gap-2">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Publishing…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Publish policy
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
