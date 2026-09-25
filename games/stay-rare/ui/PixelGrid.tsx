/** Pixel-art grids as SVG rects: '#' ink, 'y' signal, 'p' paper, 'r' red, '.' / ' ' empty. */
const FILL: Record<string, string> = { '#': 'var(--ink)', y: 'var(--signal)', p: 'var(--paper)', g: 'var(--ink-30)', r: '#e8202a' };

export function PixelGrid({ rows, x = 0, y = 0 }: { rows: readonly string[]; x?: number; y?: number }) {
  return <>{rows.flatMap((row, dy) => [...row].map((c, dx) => FILL[c]
    ? <rect key={`${dx}-${dy}`} x={x + dx} y={y + dy} width={1} height={1} fill={FILL[c]} /> : null))}</>;
}

export function PixelIcon({ rows, className }: { rows: readonly string[]; className?: string }) {
  const size = rows.length;
  return <svg className={className} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" aria-hidden="true"><PixelGrid rows={rows} /></svg>;
}
