# Natural Earth land (public domain) -> compact rings for the map (clipped, 0.01 deg ints) and the globe (0.1 deg ints)
import json, sys, math
def rings_of(fc):
    for f in fc['features']:
        g = f['geometry']
        polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
        for p in polys:
            yield p[0]          # outer ring only (land polygons have no meaningful holes at this scale)
def clip(ring, x0, y0, x1, y1):   # Sutherland-Hodgman against a rectangle
    def cut(pts, inside, inter):
        out = []
        for i in range(len(pts)):
            a, b = pts[i - 1], pts[i]
            ia, ib = inside(a), inside(b)
            if ib:
                if not ia: out.append(inter(a, b))
                out.append(b)
            elif ia: out.append(inter(a, b))
        return out
    def ix(x):
        return lambda a, b: (x, a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]))
    def iy(y):
        return lambda a, b: (a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]), y)
    pts = [tuple(p) for p in ring]
    for inside, inter in [(lambda p: p[0] >= x0, ix(x0)), (lambda p: p[0] <= x1, ix(x1)), (lambda p: p[1] >= y0, iy(y0)), (lambda p: p[1] <= y1, iy(y1))]:
        if not pts: break
        pts = cut(pts, inside, inter)
    return pts
def area(r):
    return 0.5 * sum(r[i - 1][0] * r[i][1] - r[i][0] * r[i - 1][1] for i in range(len(r)))
def dp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy) or 1e-9
    dmax, k = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / L
        if d > dmax: dmax, k = d, i
    if dmax > eps: return dp(pts[:k + 1], eps)[:-1] + dp(pts[k:], eps)
    return [a, b]
def simplify_ring(r, eps):
    n = len(r); h = n // 2
    s = dp(r[:h + 1], eps)[:-1] + dp(r[h:] + [r[0]], eps)[:-1]
    return s
sys.setrecursionlimit(100000)
med_fc = json.load(open(sys.argv[1])); world_fc = json.load(open(sys.argv[2]))
med = []
for r in rings_of(med_fc):
    c = clip(r, -12, 20, 50, 58)
    if len(c) < 3 or abs(area(c)) < 0.03: continue
    s = simplify_ring(c, 0.035)
    if len(s) < 3: continue
    if area(s) < 0: s = s[::-1]          # counter-clockwise
    med.append([v for p in s for v in (round(p[0] * 100), round(p[1] * 100))])
world = []
for r in rings_of(world_fc):
    if abs(area(r)) < 0.5: continue
    s = simplify_ring([tuple(p) for p in r], 0.15)
    if len(s) < 3: continue
    world.append([v for p in s for v in (round(p[0] * 10), round(p[1] * 10))])
print('med rings', len(med), 'points', sum(len(x) // 2 for x in med), file=sys.stderr)
print('world rings', len(world), 'points', sum(len(x) // 2 for x in world), file=sys.stderr)
out = ['// Coastlines from Natural Earth (public domain, naturalearthdata.com), simplified by prep.py.',
       '// MED: land clipped to lon -12..50, lat 20..58, as flat [lon*100, lat*100, ...] rings (counter-clockwise).',
       '// WORLD: all land at 1:110m, as flat [lon*10, lat*10, ...] rings.',
       'export const MED = ' + json.dumps(med, separators=(',', ':')) + ';',
       'export const WORLD = ' + json.dumps(world, separators=(',', ':')) + ';']
open(sys.argv[3], 'w').write('\n'.join(out) + '\n')
