'use client';

import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Input, Label, Separator } from '@levelup/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApprovedTool {
  name: string;
  vendor: string;
  approvedFor: string[]; // data classes
}

export interface ApprovedToolsTier {
  tier: 'consumer' | 'enterprise' | 'internal';
  tools: ApprovedTool[];
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ApprovedToolsEditorProps {
  tiers: ApprovedToolsTier[];
  onChange: (tiers: ApprovedToolsTier[]) => void;
}

const TIER_LABELS: Record<ApprovedToolsTier['tier'], string> = {
  consumer: 'Consumer',
  enterprise: 'Enterprise',
  internal: 'Internal',
};

const DATA_CLASSES = ['Public', 'Internal', 'Confidential', 'Restricted'] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ApprovedToolsEditor({ tiers, onChange }: ApprovedToolsEditorProps) {
  function updateTool(
    tierIdx: number,
    toolIdx: number,
    field: keyof ApprovedTool,
    value: string | string[],
  ) {
    const next = tiers.map((t, ti) =>
      ti !== tierIdx
        ? t
        : {
            ...t,
            tools: t.tools.map((tool, idx) =>
              idx !== toolIdx ? tool : { ...tool, [field]: value },
            ),
          },
    );
    onChange(next);
  }

  function addTool(tierIdx: number) {
    const next = tiers.map((t, ti) =>
      ti !== tierIdx ? t : { ...t, tools: [...t.tools, { name: '', vendor: '', approvedFor: [] }] },
    );
    onChange(next);
  }

  function removeTool(tierIdx: number, toolIdx: number) {
    const next = tiers.map((t, ti) =>
      ti !== tierIdx ? t : { ...t, tools: t.tools.filter((_, idx) => idx !== toolIdx) },
    );
    onChange(next);
  }

  function toggleClass(tierIdx: number, toolIdx: number, cls: string) {
    const tool = tiers[tierIdx]?.tools[toolIdx];
    if (!tool) return;
    const next = tool.approvedFor.includes(cls)
      ? tool.approvedFor.filter((c) => c !== cls)
      : [...tool.approvedFor, cls];
    updateTool(tierIdx, toolIdx, 'approvedFor', next);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Approved tools</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Define which tools are approved by tier and data class.
        </p>
      </div>
      {tiers.map((tier, tierIdx) => (
        <div key={tier.tier} className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge
              variant={
                tier.tier === 'consumer'
                  ? 'secondary'
                  : tier.tier === 'enterprise'
                    ? 'default'
                    : 'outline'
              }
            >
              {TIER_LABELS[tier.tier]}
            </Badge>
            <Separator className="flex-1" />
          </div>

          {tier.tools.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No tools in this tier yet.</p>
          )}

          {tier.tools.map((tool, toolIdx) => (
            <div key={toolIdx} className="rounded-lg border border-border p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tool name</Label>
                  <Input
                    placeholder="e.g. ChatGPT"
                    value={tool.name}
                    onChange={(e) => updateTool(tierIdx, toolIdx, 'name', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Vendor</Label>
                  <Input
                    placeholder="e.g. OpenAI"
                    value={tool.vendor}
                    onChange={(e) => updateTool(tierIdx, toolIdx, 'vendor', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Approved for data classes</Label>
                <div className="flex flex-wrap gap-1.5">
                  {DATA_CLASSES.map((cls) => {
                    const active = tool.approvedFor.includes(cls);
                    return (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => toggleClass(tierIdx, toolIdx, cls)}
                        className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                          active
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-border text-muted-foreground hover:border-indigo-400'
                        }`}
                      >
                        {cls}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-destructive hover:text-destructive h-7 px-2 text-xs"
                  onClick={() => removeTool(tierIdx, toolIdx)}
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1 h-7 text-xs"
            onClick={() => addTool(tierIdx)}
          >
            <Plus className="h-3 w-3" />
            Add tool to {TIER_LABELS[tier.tier]}
          </Button>
        </div>
      ))}
    </div>
  );
}
