const SC_TRACK_URL_PATTERNS = [
  /^https?:\/\/(www\.)?soundcloud\.com\/[\w-]+\/[\w-]+/,
  /^https?:\/\/on\.soundcloud\.com\/[\w]+/,
];

export function validateSoundCloudUrl(url: string): boolean {
  return SC_TRACK_URL_PATTERNS.some((p) => p.test(url));
}
