import maplibregl from 'maplibre-gl';

export const KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
export const ST: Record<string, string> = { dark: 'dataviz-dark', sat: 'hybrid', d3: 'streets-v2-dark' };
export const PIT: Record<string, number> = { dark: 45, sat: 62, d3: 68 };
export const styleUrl = (k: string) => KEY ? `https://api.maptiler.com/maps/${ST[k]}/style.json?key=${KEY}` : 'https://demotiles.maplibre.org/style.json';

export const brg = (a: number[], b: number[]) => {
  const r = Math.PI / 180, y = Math.sin((b[0] - a[0]) * r) * Math.cos(b[1] * r);
  const x = Math.cos(a[1] * r) * Math.sin(b[1] * r) - Math.sin(a[1] * r) * Math.cos(b[1] * r) * Math.cos((b[0] - a[0]) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
};

const line = (c: number[][]) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: c } });
const pt = (c: number[], col: string, r: number) => ({ type: 'Feature' as const, properties: { c: col, r }, geometry: { type: 'Point' as const, coordinates: c } });
const points = (C: number[][], head: number[]) => ({ type: 'FeatureCollection' as const, features: [pt(C[0], '#2ecc71', 9), pt(C[C.length - 1], '#e74c3c', 9), pt(head, '#fc4c02', 11)] });

/** Pasang rute, titik start/finish/pelari, medan 3D dan gedung. Dipanggil setiap style selesai dimuat. */
export function setupLayers(m: maplibregl.Map, C: number[][], sty: string) {
  if (KEY && sty !== 'dark' && !m.getSource('dem')) {
    m.addSource('dem', { type: 'raster-dem', url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${KEY}`, tileSize: 256 });
    m.setTerrain({ source: 'dem', exaggeration: 1.5 });
  }
  if (sty === 'd3' && m.getSource('openmaptiles') && !m.getLayer('bld3d'))
    m.addLayer({ id: 'bld3d', type: 'fill-extrusion', source: 'openmaptiles', 'source-layer': 'building', minzoom: 14, paint: { 'fill-extrusion-color': '#2d3340', 'fill-extrusion-height': ['get', 'render_height'], 'fill-extrusion-base': ['get', 'render_min_height'], 'fill-extrusion-opacity': .85 } } as any);
  m.addSource('full', { type: 'geojson', data: line(C) });
  m.addSource('prog', { type: 'geojson', data: line([C[0]]) });
  m.addSource('pts', { type: 'geojson', data: points(C, C[0]) });
  const lay = { 'line-cap': 'round', 'line-join': 'round' } as any;
  m.addLayer({ id: 'full', type: 'line', source: 'full', layout: lay, paint: { 'line-color': '#ffffff', 'line-opacity': .35, 'line-width': 4 } });
  m.addLayer({ id: 'prog-glow', type: 'line', source: 'prog', layout: lay, paint: { 'line-color': '#fc4c02', 'line-width': 12, 'line-blur': 8, 'line-opacity': .7 } });
  m.addLayer({ id: 'prog', type: 'line', source: 'prog', layout: lay, paint: { 'line-color': '#ff7a3d', 'line-width': 5 } });
  m.addLayer({ id: 'pts', type: 'circle', source: 'pts', paint: { 'circle-color': ['get', 'c'], 'circle-radius': ['get', 'r'], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 } });
}

/** Update garis progres dan posisi pelari untuk p (0..1). */
export function setProgress(m: maplibregl.Map, C: number[][], p: number) {
  const n = C.length - 1, f = p * n, i = Math.min(n - 1, Math.floor(f)), t = f - i;
  const A = C[i], B = C[i + 1] || A, cur = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
  (m.getSource('prog') as maplibregl.GeoJSONSource)?.setData(line([...C.slice(0, i + 1), cur]));
  (m.getSource('pts') as maplibregl.GeoJSONSource)?.setData(points(C, cur));
  return { cur, i };
}

/** Kamera sinematik mengikuti pelari, mengarah ke titik di depannya. */
export function follow(m: maplibregl.Map, C: number[][], cur: number[], i: number, st: { bear: number | null }, sty: string, k = .08) {
  const n = C.length - 1, ahead = C[Math.min(n, i + Math.max(3, Math.round(n * .02)))], tb = brg(cur, ahead);
  if (st.bear == null) st.bear = tb;
  const d = ((tb - st.bear + 540) % 360) - 180;
  st.bear = (st.bear + d * k + 360) % 360;
  m.jumpTo({ center: cur as [number, number], bearing: st.bear, pitch: PIT[sty], zoom: 15.3 });
}
