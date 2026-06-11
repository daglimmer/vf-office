#!/usr/bin/env python3
"""verify_office_glb.py — Phase 8 verification gates (stdlib only, Draco-safe).

Usage:
    python3 verify_office_glb.py <office.glb> <anchors_report.json> [--legacy]

Gates:
  1. every anchor in the report exists as a non-mesh node at the exact
     position (tolerance 0.01 m)
  2. triangle count <= 250,000  (works with Draco: indices accessors stay)
  3. required object families present (walls, ceilings per room, floors)
  4. v8 gates (skipped with --legacy): v8_marker, hot_* clickables,
     KHR_materials_emissive_strength in use, rack ring present
"""
import struct, json, sys

TOL = 0.01
BUDGET = 250_000

def load(fp):
    d = open(fp, 'rb').read()
    assert d[:4] == b'glTF', 'not a GLB'
    ln = struct.unpack('<I', d[12:16])[0]
    return json.loads(d[20:20 + ln]), len(d)

def main():
    legacy = '--legacy' in sys.argv
    glb, size = load(sys.argv[1])
    report = json.load(open(sys.argv[2]))
    nodes = glb.get('nodes', [])
    fails, warns = [], []

    # ---- gate 1: anchors
    byname = {}
    for n in nodes:
        if 'mesh' not in n and n.get('name'):
            byname[n['name']] = n.get('translation', [0, 0, 0])
    missing, off = [], []
    for a in report['anchors']:
        t = byname.get(a['name'])
        if t is None:
            missing.append(a['name']); continue
        d = max(abs(t[i] - a['pos'][i]) for i in range(3))
        if d > TOL: off.append((a['name'], round(d, 4)))
    if missing: fails.append(f'anchors missing: {missing}')
    if off:     fails.append(f'anchors off-position: {off}')
    print(f'[1] anchors: {len(report["anchors"]) - len(missing) - len(off)}/{len(report["anchors"])} exact')

    # ---- gate 2: triangles
    acc = glb.get('accessors', [])
    tris = 0
    for m in glb.get('meshes', []):
        for p in m.get('primitives', []):
            mode = p.get('mode', 4)
            if mode != 4: continue
            if 'indices' in p: tris += acc[p['indices']]['count'] // 3
            elif 'POSITION' in p.get('attributes', {}): tris += acc[p['attributes']['POSITION']]['count'] // 3
    print(f'[2] triangles: {tris:,} (budget {BUDGET:,}) | file {size//1024} KB')
    if tris > BUDGET: fails.append(f'triangle budget exceeded: {tris}')

    # ---- gate 3: object families
    names = [n.get('name', '') for n in nodes]
    def count(pref): return sum(1 for x in names if x.startswith(pref))
    rooms = ['lounge', 'staff', 'devops', 'corridor', 'meeting', 'control', 'ceo']
    if count('wall_') < 8: fails.append(f'too few walls: {count("wall_")}')
    miss_ceil = [r for r in rooms if f'ceiling_{r}' not in names]
    if miss_ceil: fails.append(f'missing ceilings: {miss_ceil}')
    if count('floor_') < 5: fails.append(f'too few floors: {count("floor_")}')
    print(f'[3] walls={count("wall_")} ceilings ok={not miss_ceil} floors={count("floor_")} racks={count("rack_")}')

    # ---- gate 4: v8 specifics
    if not legacy:
        if 'v8_marker' not in names: fails.append('v8_marker empty missing')
        hot = {x.split('_')[1] for x in names if x.startswith('hot_')}
        need = {'infra', 'agents', 'kanban', 'costs', 'peak', 'docs'}
        if not need <= hot: fails.append(f'missing clickables: {sorted(need - hot)}')
        used = glb.get('extensionsUsed', [])
        if 'KHR_materials_emissive_strength' not in used:
            warns.append('KHR_materials_emissive_strength not in extensionsUsed')
        if count('rack_') < 10: fails.append(f'DC rack ring too small: {count("rack_")}')
        if 'ceiling_dc' not in names: fails.append('DC dome (ceiling_dc) missing')
        print(f'[4] v8_marker={"v8_marker" in names} clickables={sorted(hot)}')

    for w in warns: print('WARN:', w)
    if fails:
        for f in fails: print('FAIL:', f)
        sys.exit(1)
    print('ALL GATES PASSED')

if __name__ == '__main__':
    main()
