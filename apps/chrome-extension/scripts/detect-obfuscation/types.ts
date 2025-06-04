export interface ObfuscationMatch {
  patternName: string;
  line: number;
  excerpt: string;
  detectedPackage?: string;
  base64Content?: string;
}

export interface FileAnalysis {
  filePath: string;
  matches: ObfuscationMatch[];
  suspiciousScore: number;
  detectedPackages: Set<string>;
}

export interface FileGroup {
  filePath: string;
  packageName: string;
  matches: ObfuscationMatch[];
}
