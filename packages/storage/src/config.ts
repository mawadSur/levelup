/**
 * @levelup/storage configuration.
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment.
 * Falls back to local-filesystem stub mode when either is missing or starts
 * with `PLACEHOLDER_`. In production, missing-or-placeholder throws at boot.
 */

const PLACEHOLDER_PREFIX = 'PLACEHOLDER_';

export interface StorageConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  certificatesBucket: string;
  policyFilesBucket: string;
  governanceReportsBucket: string;
  sceneAssetsBucket: string;
  lessonImagesBucket: string;
  /** Where the local-fs stub writes cert PDFs (also where the legacy worker wrote them). */
  certOutputDir: string;
  /** Where the local-fs stub writes policy uploads. */
  policyOutputDir: string;
  /** Where the local-fs stub writes governance evidence reports. */
  governanceOutputDir: string;
  /** Where the local-fs stub writes scenario scene images. */
  sceneAssetsOutputDir: string;
  /** Where the local-fs stub writes per-lesson `[image]` directives. */
  lessonImagesOutputDir: string;
  // ---------------------------------------------------------------------------
  // Cloudflare R2 (CR.26) — optional; preferred over Supabase Storage for
  // certificate PDFs when configured. Leaving any of the required fields unset
  // or PLACEHOLDER_* keeps the existing Supabase/local-fs path active.
  // ---------------------------------------------------------------------------
  r2AccountId: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2Bucket: string;
  /** Optional public base URL (e.g., custom domain in front of the bucket). */
  r2PublicBaseUrl: string;
  nodeEnv: string;
}

function readEnv(): StorageConfig {
  return {
    supabaseUrl: process.env['SUPABASE_URL'] ?? '',
    supabaseServiceRoleKey: process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '',
    certificatesBucket: process.env['SUPABASE_CERTIFICATES_BUCKET'] ?? 'certificates',
    policyFilesBucket: process.env['SUPABASE_POLICY_FILES_BUCKET'] ?? 'policy-files',
    governanceReportsBucket:
      process.env['SUPABASE_GOVERNANCE_REPORTS_BUCKET'] ?? 'governance-reports',
    sceneAssetsBucket: process.env['SUPABASE_SCENE_ASSETS_BUCKET'] ?? 'scene-assets',
    lessonImagesBucket: process.env['SUPABASE_LESSON_IMAGES_BUCKET'] ?? 'lesson-images',
    certOutputDir:
      process.env['CERT_OUTPUT_DIR'] ??
      // Two levels up from packages/storage/dist → repo root → apps/api/.cert-output
      `${process.cwd()}/.cert-output`,
    policyOutputDir: process.env['POLICY_OUTPUT_DIR'] ?? `${process.cwd()}/.policy-uploads`,
    governanceOutputDir:
      process.env['GOVERNANCE_OUTPUT_DIR'] ?? `${process.cwd()}/.governance-reports`,
    sceneAssetsOutputDir:
      process.env['SCENE_ASSETS_OUTPUT_DIR'] ?? `${process.cwd()}/.scene-assets`,
    lessonImagesOutputDir:
      process.env['LESSON_IMAGES_OUTPUT_DIR'] ?? `${process.cwd()}/.lesson-images`,
    r2AccountId: process.env['R2_ACCOUNT_ID'] ?? '',
    r2AccessKeyId: process.env['R2_ACCESS_KEY_ID'] ?? '',
    r2SecretAccessKey: process.env['R2_SECRET_ACCESS_KEY'] ?? '',
    r2Bucket: process.env['R2_BUCKET'] ?? '',
    r2PublicBaseUrl: process.env['R2_PUBLIC_BASE_URL'] ?? '',
    nodeEnv: process.env['NODE_ENV'] ?? 'development',
  };
}

export const storageConfig: StorageConfig = readEnv();

export function isStubMode(): boolean {
  const url = storageConfig.supabaseUrl;
  const key = storageConfig.supabaseServiceRoleKey;
  if (!url || !key) return true;
  if (key.startsWith(PLACEHOLDER_PREFIX) || url.startsWith(PLACEHOLDER_PREFIX)) {
    return true;
  }
  return false;
}

/**
 * R2 mode is active when all four required fields are present and non-placeholder.
 * The R2_PUBLIC_BASE_URL is optional — when unset we always sign URLs.
 */
export function isR2Configured(): boolean {
  const { r2AccountId, r2AccessKeyId, r2SecretAccessKey, r2Bucket } = storageConfig;
  if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2Bucket) {
    return false;
  }
  return ![r2AccountId, r2AccessKeyId, r2SecretAccessKey, r2Bucket].some((v) =>
    v.startsWith(PLACEHOLDER_PREFIX),
  );
}

let _stubWarned = false;

(function enforceStubModePolicy(): void {
  if (!isStubMode()) return;
  if (storageConfig.nodeEnv === 'production') {
    throw new Error(
      '[@levelup/storage] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing or a PLACEHOLDER_ value in production. ' +
        'Set real Supabase credentials.',
    );
  }
  if (!_stubWarned) {
    _stubWarned = true;

    console.warn(
      '[storage] STUB MODE — set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for real Supabase Storage; falling back to local filesystem.',
    );
  }
})();
