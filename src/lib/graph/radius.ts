/**
 * Node radius from centrality: 6 px for an isolated node, 18 px for the most
 * connected one, on a square-root scale so mid-degree nodes stay readable.
 * Shared by the build-time layout (collision radius) and the island (render
 * radius); kept free of d3 so the island does not bundle d3-force.
 */
export function nodeRadius(centrality: number): number {
  return 6 + 12 * Math.sqrt(Math.max(0, Math.min(1, centrality)));
}
