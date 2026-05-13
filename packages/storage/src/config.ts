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
  /** Where the local-fs stub writes cert PDFs (also where the legacy worker wrote them). */
  certOutputDir: string;
  /** Where the local-fs stub writes policy uploads. */
  policyOutputDir: string;
  /** Where the local-fs stub writes governance evidence reports. */
  governanceOutputDir: string;
  /** Where the local-fs stub writes scenario scene images. */
  sceneAssetsOutputDir: string;
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
    certOutputDir:
      process.env['CERT_OUTPUT_DIR'] ??
      // Two levels up from packages/storage/dist → repo root → apps/api/.cert-output
      `${process.cwd()}/.cert-output`,
    policyOutputDir: process.env['POLICY_OUTPUT_DIR'] ?? `${process.cwd()}/.policy-uploads`,
    governanceOutputDir:
      process.env['GOVERNANCE_OUTPUT_DIR'] ?? `${process.cwd()}/.governance-reports`,
    sceneAssetsOutputDir:
      process.env['SCENE_ASSETS_OUTPUT_DIR'] ?? `${process.cwd()}/.scene-assets`,
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
