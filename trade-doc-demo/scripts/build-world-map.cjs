/* Offline asset generator. Input: Natural Earth ne_110m_land.geojson (public domain).
 * https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson
 * Usage: node scripts/build-world-map.cjs /path/to/ne_110m_land.geojson > output.svg
 * Emits geometry only; never executed by the application. */
'use strict';
const fs = require('node:fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const project = ([lon, lat]) => [+(1000 * (lon + 180) / 360).toFixed(1), +(430 * (85 - lat) / 145).toFixed(1)];
function simplify(points, tolerance) {
  if (points.length <= 2) return points;
  const a = points[0], b = points.at(-1), dx = b[0] - a[0], dy = b[1] - a[1];
  let best = tolerance * tolerance, index = -1;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i], t = dx || dy ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy))) : 0;
    const d = (p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2;
    if (d > best) { best = d; index = i; }
  }
  return index < 0 ? [a, b] : simplify(points.slice(0, index + 1), tolerance).slice(0, -1).concat(simplify(points.slice(index), tolerance));
}
const paths = [];
for (const feature of data.features) {
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  for (const polygon of polygons) {
    if (polygon[0].every(p => p[1] < -60)) continue; // Antarctica is outside the displayed extent.
    paths.push(polygon.map(ring => {
      const points = simplify(ring.map(project), .65);
      return 'M' + points.map(p => p.join(',')).join('L') + 'Z';
    }).join(''));
  }
}
process.stdout.write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 430"><title>世界陆地点阵示意</title><desc>Made with Natural Earth. Public domain 110m land, simplified; no political boundaries.</desc><defs><pattern id="dots" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.05" fill="#b5a7d8"/></pattern></defs><path fill="url(#dots)" fill-rule="evenodd" d="' + paths.join('') + '"/></svg>\n');
