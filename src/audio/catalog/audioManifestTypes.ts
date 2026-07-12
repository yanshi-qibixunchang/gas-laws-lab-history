export interface ThirdPartyAudioSourceManifest {
  assetId: string;
  originalFileName: string;
  sourceTitle: string;
  author: string;
  freesoundSoundId: number;
  sourceUrl: string;
  license: 'CC0-1.0';
  licenseUrl: string;
  downloadedAt: string;
  sourceSha256: string;
}

export interface ProcessedAudioAssetManifest {
  audioId: string;
  finalFileName: string | null;
  kind: 'third-party-derived' | 'first-party-procedural';
  sourceAssetId: string | null;
  outputSha256: string | null;
  sampleRateHz: number | null;
  channels: number | null;
  bitsPerSample: number | null;
  durationS: number | null;
  edit: string;
}

export interface ExperimentAudioManifest {
  schemaVersion: 1;
  experimentId: string;
  generatedAt: string;
  sources: ThirdPartyAudioSourceManifest[];
  assets: ProcessedAudioAssetManifest[];
}
