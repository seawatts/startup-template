// Map of named patterns that might indicate obfuscation
export const obfuscationPatterns = new Map([
  ['suspiciousHex', /[a-f0-9]{64,}/i],
  ['suspiciousBase64', /['"`](?:[A-Za-z0-9+/]{100,}(?:==?)?)['"`]/],
  [
    'encodedEval',
    /['"`](?:\\x65\\x76\\x61\\x6C|\u0065\u0076\u0061\u006C)['"`]/,
  ],
  ['suspiciousNames', /\b[a-zA-Z_$](?:_|\$){5,}[a-zA-Z0-9_$]*\b/],
  ['directEval', /\beval\s*\(\s*(?:['"`]|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*/],
  ['hexStrings', /\\x[0-9a-f]{2}(?:\\x[0-9a-f]{2}){5,}/i],
  ['unicodeEscapes', /(?:\\u[0-9a-f]{4}){5,}/i],
  [
    'stringSplitting',
    /['"`][^'"`]+['"`]\s*\+\s*['"`][^'"`]+['"`](?:\s*\+\s*['"`][^'"`]+['"`]){3,}/,
  ],
  [
    'functionConstruction',
    /\bFunction\s*\(\s*['"`]|new\s+Function\s*\(\s*['"`]/,
  ],
  [
    'hiddenEval',
    /\[['"`]e['"`]\s*\+\s*['"`]v['"`]\s*\+\s*['"`]a['"`]\s*\+\s*['"`]l['"`]\]/,
  ],
  [
    'blobFromBase64',
    /(?:new\s+Blob\s*\(|Blob\s*\()?\s*\[?\s*Uint8Array\.from\s*\(\s*atob\s*\([^)]+\)\s*\)/,
  ],
  ['directBase64Decode', /atob\s*\(\s*["'`][A-Za-z0-9+/=]+["'`]\s*\)/],
]);

// Common package signatures to identify source
export const packageSignatures = new Map([
  [
    'react',
    /React(\.__SECRET_INTERNALS_DO_NOT_USE|\.createElement|\.Component)/,
  ],
  ['lodash', /\b_\.(isArray|merge|get|set|has|forEach)\b/],
  ['jquery', /jQuery|jquery|\$\.fn\./],
  ['moment', /moment(\.(js|min|locale))?/],
  ['axios', /axios(\.(min|defaults|interceptors))?/],
  ['rrweb', /rrweb(\.(recording|player|types))?/],
  ['webpack', /webpack(\.[a-zA-Z]+)?/],
  ['parcel', /parcel(\.[a-zA-Z]+)?/],
  ['babel', /@babel\/runtime/],
]);

// Known legitimate minified packages that shouldn't trigger warnings
export const knownMinifiedPackages = new Set([
  'react',
  'react-dom',
  'lodash',
  'jquery',
  'moment',
  'axios',
  'rrweb',
]);

// Known patterns that should NOT trigger warnings (common in minified code)
export const allowedPatterns = new Set([
  // Common minified variable names
  /^[a-z_$][0-9]$/,
  // Common webpack patterns
  /^__webpack_/,
  // Common babel helpers
  /^_(?:createClass|classCallCheck|possibleConstructorReturn|inherits)$/,
  // Common terser patterns
  /^[a-z_$][0-9a-z_$]{1,2}$/,
  // Source map URLs
  /^\/\/# sourceMappingURL=/,
]);

// Known legitimate uses of base64 that should NOT trigger warnings
export const allowedBase64Patterns = new Set([
  // Image data URLs
  /^data:image\/(jpeg|png|gif|webp|svg\+xml);base64,/,
  // Source maps
  /^\/\/# sourceMappingURL=data:application\/json;base64,/,
  // Web fonts
  /^data:font\/(woff2?|ttf|otf);base64,/,
]);
