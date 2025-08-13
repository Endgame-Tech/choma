// Minimal ambient declaration to suppress TS7016 when TS fails to resolve
// bundled Chart.js v4 type definitions under current moduleResolution settings.
// NOTE: This provides 'any' types for chart.js symbols. If full typing is desired,
// investigate why the packaged dist/types.d.ts isn't being picked up and remove
// this file.
declare module 'chart.js';
