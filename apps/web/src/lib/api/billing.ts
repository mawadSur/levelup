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

// ---------------------------------------------------------------------------
// Per-seat add-on flow — used by the invite dialog when an invite trips the
// seat cap. /seats/preview returns a Stripe-prorated charge for the requested
// delta; /seats/add applies it and bills immediately.
// ---------------------------------------------------------------------------

export interface SeatProrationPreview {
  /** Net amount in cents the customer will be charged immediately. */
  amountDueCents: number;
  /** Currency lower-cased, e.g. "usd". */
  currency: string;
  /** Date the proration applies on (Unix epoch seconds). */
  prorationDate: number;
  /** New total seat count after applying the delta. */
  newQuantity: number;
}

export interface SeatAddResult {
  subscriptionId: string;
  newQuantity: number;
}

export async function previewSeats(delta: number): Promise<SeatProrationPreview> {
  return apiGet<SeatProrationPreview>('/billing/seats/preview', { params: { delta } });
}

export async function addSeats(quantity: number): Promise<SeatAddResult> {
  return apiPost<{ quantity: number }, SeatAddResult>('/billing/seats/add', { quantity });
}
