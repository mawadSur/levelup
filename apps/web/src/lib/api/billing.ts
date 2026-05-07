import { apiGet, apiPost } from './client';
import {
  createCheckoutSessionSchema,
  checkoutSessionResponseSchema,
  type CreateCheckoutSessionInput,
  type CheckoutSessionResponse,
} from '@levelup/types';

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------
export interface BillingInfo {
  plan: string;
  seats: number;
  usedSeats: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  status: string;
  cancelAtPeriodEnd: boolean;
}

export interface PlanPreview {
  plan: string;
  seats: number;
  unitPrice: number;
  totalPrice: number;
  proratedCharge: number | null;
  effectiveDate: string;
}

export interface BillingPortalResponse {
  url: string;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function getMyBilling(): Promise<BillingInfo> {
  return apiGet<BillingInfo>('/billing/me');
}

export async function createCheckout(
  input: CreateCheckoutSessionInput,
): Promise<CheckoutSessionResponse> {
  const parsed = createCheckoutSessionSchema.parse(input);
  const json = await apiPost<CreateCheckoutSessionInput, unknown>('/billing/checkout', parsed);
  return checkoutSessionResponseSchema.parse(json);
}

export async function createPortal(): Promise<BillingPortalResponse> {
  return apiPost<Record<string, never>, BillingPortalResponse>('/billing/portal', {});
}

export async function previewPlan(opts: { plan: string; seats: number }): Promise<PlanPreview> {
  return apiGet<PlanPreview>('/billing/preview', { params: opts });
}
