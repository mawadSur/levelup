'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@levelup/ui';
import { billing } from '@/lib/api';
import type { CreateCheckoutSessionInput } from '@levelup/types';

interface CheckoutButtonProps {
  plan: CreateCheckoutSessionInput['plan'];
  label: string;
  variant?: 'default' | 'outline';
  className?: string;
}

export function CheckoutButton({
  plan,
  label,
  variant = 'default',
  className,
}: CheckoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const { url } = await billing.createCheckout({
        plan,
        seats: 1,
        successUrl: `${window.location.origin}/admin`,
        cancelUrl: window.location.href,
      });
      router.push(url);
    } catch {
      setLoading(false);
    }
  }

  return (
    <Button variant={variant} className={className} disabled={loading} onClick={handleClick}>
      {loading ? 'Redirecting…' : label}
    </Button>
  );
}
