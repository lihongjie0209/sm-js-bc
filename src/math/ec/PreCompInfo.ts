/**
 * Base interface for precomputation data.
 * Precomputation data is stored in ECPoint's preCompTable for caching.
 */
export interface PreCompInfo {
  // Marker interface - implementations will add specific data
}

/**
 * Callback interface for lazy precomputation.
 */
export interface PreCompCallback {
  /**
   * Compute or reuse precomputation data.
   * @param existing Existing precomputation data (if any)
   * @returns New or existing precomputation data
   */
  precompute(existing: PreCompInfo | null): PreCompInfo;
}
