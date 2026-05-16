export { storageConfig, isStubMode, isR2Configured } from './config';
export type { StorageConfig } from './config';

export {
  getR2Client,
  uploadObject as r2UploadObject,
  getSignedDownloadUrl as r2GetSignedDownloadUrl,
} from './r2-client';
export type { R2UploadOptions } from './r2-client';

export { uploadCertificatePdf, getCertificateSignedUrl } from './certificates';
export type { CertificateUploadResult } from './certificates';

export { uploadPolicyFile, getPolicyFileSignedUrl } from './policies';
export type { PolicyUploadResult } from './policies';

export { uploadGovernanceReport, getGovernanceReportSignedUrl } from './governance';
export type { GovernanceReportUploadResult } from './governance';

export { uploadSceneAsset } from './scene-assets';
export type { SceneAssetUploadResult } from './scene-assets';

export { uploadLessonImage } from './lesson-images';
export type { LessonImageUploadResult } from './lesson-images';

export { stubGetCertificateLocalFilePath } from './stub';
