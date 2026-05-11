'use client';

import * as React from 'react';
import { Check, Minus } from 'lucide-react';
import { MonoLabel, cn } from '@levelup/ui';
import type { BillingIntervalChoice } from './pricing-toggle';

// ---------------------------------------------------------------------------
// Feature matrix — 5 tiers
// ---------------------------------------------------------------------------

type Tier = 'trial' | 'starter' | 'team' | 'growth' | 'enterprise';

type FeatureValue = boolean | string;

interface FeatureRow {
  label: string;
  trial: FeatureValue;
  starter: FeatureValue;
  team: FeatureValue;
  growth: FeatureValue;
  enterprise: FeatureValue;
}

const FEATURES: ReadonlyArray<FeatureRow> = [
  {
    label: 'Seats',
    trial: 'Up to 10',
    starter: 'Up to 25',
    team: '25–100',
    growth: '100–500',
    enterprise: '500+',
  },
  {
    label: 'Billing model',
    trial: 'Free · 14 days',
    starter: 'Flat',
    team: 'Per-seat',
    growth: 'Per-seat',
    enterprise: 'Per-seat · sales-led',
  },
  {
    label: 'Core AI learning paths',
    trial: true,
    starter: true,
    team: true,
    growth: true,
    enterprise: true,
  },
  {
    label: 'In-context AI coach',
    trial: true,
    starter: true,
    team: true,
    growth: true,
    enterprise: true,
  },
  {
    label: 'Admin dashboard',
    trial: true,
    starter: true,
    team: true,
    growth: true,
    enterprise: true,
  },
  {
    label: 'Basic reporting',
    trial: true,
    starter: true,
    team: true,
    growth: true,
    enterprise: true,
  },
  {
    label: 'Custom learning paths',
    trial: false,
    starter: false,
    team: true,
    growth: true,
    enterprise: true,
  },
  {
    label: 'Department reporting',
    trial: false,
    starter: false,
    team: true,
    growth: true,
    enterprise: true,
  },
  {
    label: 'Company AI policy integration',
    trial: false,
    starter: false,
    team: true,
    growth: true,
    enterprise: true,
  },
  {
    label: 'Completion certificates',
    trial: false,
    starter: false,
    team: true,
    growth: true,
    enterprise: true,
  },
  {
    label: 'SSO / SAML',
    trial: false,
    starter: false,
    team: false,
    growth: true,
    enterprise: true,
  },
  {
    label: 'SCIM provisioning',
    trial: false,
    starter: false,
    team: false,
    growth: false,
    enterprise: true,
  },
  {
    label: 'Advanced analytics',
    trial: false,
    starter: false,
    team: false,
    growth: true,
    enterprise: true,
  },
  {
    label: 'Dedicated success manager',
    trial: false,
    starter: false,
    team: false,
    growth: false,
    enterprise: true,
  },
  {
    label: 'SOC 2 attestation support',
    trial: false,
    starter: false,
    team: false,
    growth: false,
    enterprise: true,
  },
  {
    label: 'Custom DPA / MSA',
    trial: false,
    starter: false,
    team: false,
    growth: false,
    enterprise: true,
  },
  {
    label: 'Private deployment',
    trial: false,
    starter: false,
    team: false,
    growth: false,
    enterprise: true,
  },
  {
    label: 'Support',
    trial: 'Community',
    starter: 'Email',
    team: 'Email',
    growth: 'Priority email',
    enterprise: 'Custom · 24/7',
  },
];

// ---------------------------------------------------------------------------
// Header pricing — driven by interval
// ---------------------------------------------------------------------------

interface TierHeader {
  tier: Tier;
  name: string;
  pricing: { monthly: string; annual: string };
  highlight?: boolean;
}

const TIER_HEADERS: ReadonlyArray<TierHeader> = [
  { tier: 'trial', name: 'TRIAL', pricing: { monthly: '$0', annual: '$0' } },
  { tier: 'starter', name: 'STARTER', pricing: { monthly: '$599/mo', annual: '$5,990/yr' } },
  {
    tier: 'team',
    name: 'TEAM',
    pricing: { monthly: '$12/seat/mo', annual: '$10/seat/mo' },
    highlight: true,
  },
  { tier: 'growth', name: 'GROWTH', pricing: { monthly: '$15/seat/mo', annual: '$13/seat/mo' } },
  {
    tier: 'enterprise',
    name: 'ENTERPRISE',
    pricing: { monthly: 'From $25k/yr', annual: 'From $25k/yr' },
  },
];

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === true)
    return (
      <span className="flex justify-center">
        <Check className="h-4 w-4 text-signal" aria-label="Included" />
      </span>
    );
  if (value === false)
    return (
      <span className="flex justify-center text-paper-500">
        <Minus className="h-4 w-4" aria-label="Not included" />
      </span>
    );
  return (
    <span className="block text-center font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300">
      {value}
    </span>
  );
}

interface ComparisonTableProps {
  interval: BillingIntervalChoice;
  className?: string;
}

export function ComparisonTable({ interval, className }: ComparisonTableProps) {
  const priceKey = interval === 'ANNUAL' ? 'annual' : 'monthly';

  return (
    <div className={cn('space-y-10', className)}>
      {/* Desktop table — md+ */}
      <div className="hidden overflow-hidden border border-ink-600 rounded-data md:block">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="border-b border-ink-600 bg-ink-800">
              <th className="px-6 py-4 text-left font-mono text-mono-sm uppercase tracking-[0.05em] text-paper-300">
                Feature
              </th>
              {TIER_HEADERS.map((h) => (
                <th
                  key={h.tier}
                  className={cn(
                    'px-4 py-4 text-center font-mono text-mono-sm uppercase tracking-[0.05em]',
                    h.highlight ? 'text-signal' : 'text-paper-300',
                  )}
                >
                  <div>{h.name}</div>
                  <div className="mt-1 text-[10px] tabular-nums text-paper-500">
                    {h.pricing[priceKey]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-600">
            {FEATURES.map((row) => (
              <tr key={row.label} className="bg-ink-900 hover:bg-ink-800">
                <td className="px-6 py-3 text-body-sm text-paper-100">{row.label}</td>
                <td className="px-4 py-3">
                  <FeatureCell value={row.trial} />
                </td>
                <td className="px-4 py-3">
                  <FeatureCell value={row.starter} />
                </td>
                <td className="px-4 py-3 bg-ink-800/40">
                  <FeatureCell value={row.team} />
                </td>
                <td className="px-4 py-3">
                  <FeatureCell value={row.growth} />
                </td>
                <td className="px-4 py-3">
                  <FeatureCell value={row.enterprise} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile per-tier lists */}
      <div className="space-y-6 md:hidden">
        {TIER_HEADERS.map((h) => (
          <div key={h.tier} className="border border-ink-600 bg-ink-800 p-5 rounded-sm">
            <div className="mb-4 flex items-baseline justify-between border-b border-ink-600 pb-3">
              <MonoLabel tone={h.highlight ? 'signal' : 'default'}>{h.name}</MonoLabel>
              <span className="font-mono text-mono-sm uppercase tracking-[0.05em] tabular-nums text-paper-500">
                {h.pricing[priceKey]}
              </span>
            </div>
            <ul className="space-y-2">
              {FEATURES.map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between gap-4 text-body-sm"
                >
                  <span className="text-paper-300">{row.label}</span>
                  <FeatureCell value={row[h.tier]} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
