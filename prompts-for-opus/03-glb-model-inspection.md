# Prompt 3/3: GLB Model Cleanup & Room Label Swap

## Problem
The 3D office model (`public/office.glb`, 731KB) has baked-in room node names that describe the small room (Z=8-11) as "staff" and the big room (Z=12-18) as "devops". The actual anchor positions tell a different story:

- **Small room (Z=8.5)**: Contains `doc_desk_01-04` — this is the **Staff/Documentation room**
- **Big room (Z=13-15.5)**: Contains `work_desk_01-08` — this is the **DevOps room**

The room labels are correct (staff=small room, devops=big room), but the visual wall text might not match. The current GLB node names are:
- `floor_staff` / `ceiling_staff` — small room (Z=8.5)
- `floor_devops` / `ceiling_devops` — big room (Z=14)
- `announce_staff` — at position (8.5, 2.5, 8.5) — small room center
- `announce_devops` — at position (8.5, 2.5, 14) — big room center

## No changes needed — the labels are CORRECT.

The room labels match the anchors already. If someone reported "Staff Office" and "DevOps Office" labels being swapped, **they were mistaken** — the GLB model has simple node names, not visible wall text.

## However, there's an ISSUE with the `rooms` metadata in BOTH `anchors.json` and `waypoints.json`:

### In `public/anchors.json`:
The `rooms` section maps rooms to centers, but the center positions are the ANNOUNCE positions, not the actual geographic room centers. For example:
- `lounge`: center [8.5, 0, 3] — this is the announce point, ACTUAL lounge center is [8.5, 0, 3] ✓
- `staff`: center [8.5, 0, 8.5] — this is the announce point, ACTUAL staff room center is [8.5, 0, 8.5] ✓ 
- `devops`: center [8.5, 0, 14] — this is the announce point, ACTUAL devops room center is [8.5, 0, 14] ✓

These are all correct. **No changes needed to room centers.**

## What ACTUALLY Needs Investigation

1. **Confirm that `office.glb` has no root-level transform** — if the GLB's root node has a rotation or scale that inverts the Y-axis, agents would appear upside-down. Open the GLB in a viewer and check the root node's `matrix`, `rotation`, `scale` properties.

2. **If root transform exists** — apply inverse transform programmatically in `public/office.js` `buildOffice()` function:
```js
// After loading the GLB, if root has an unwanted transform:
if (gltf.scene.rotation.x !== 0) {
    gltf.scene.rotation.x = 0;  // Force upright
}
```

3. **If root transform is correct** — then the issue is definitely in the quaternion→Euler conversion in production builds (see Prompt 1).

## Files
- `/root/repos/vf-office/public/office.glb` — the 3D model (731KB)
- `/root/repos/vf-office/public/office.js` — the GLB loader
- `/root/repos/vf-office/public/anchors.json` — ground truth anchor positions, CORRECT

## To Inspect GLB
```bash
# Using three.js GLTFExporter or a Python script
python3 -c "
import json
with open('public/office.glb', 'rb') as f:
    data = f.read()
# GLB binary: first 12 bytes = header, then JSON chunk
# Look for root node transform
text = data[12:].decode('utf-8', errors='replace')
# Parse the JSON chunk
import json
# Find JSON start
start = text.find('{')
end = text.rfind('}') + 1
gltf = json.loads(text[start:end])
# Check root nodes
for node in gltf.get('nodes', []):
    if 'matrix' in node or 'rotation' in node or 'scale' in node:
        if any(abs(v) > 1.001 for v in node.get('scale', [1,1,1])):
            print(f'NODE {node.get(\"name\",\"?\")}: scale={node.get(\"scale\")} rotation={node.get(\"rotation\")} matrix={node.get(\"matrix\")}')
"
```
