# build_office.py — Phase 8: 3D Agent Office, full visual + architectural overhaul.
# Blender 4.x, headless:
#   blender -b --factory-startup -P office-art/build_office.py -- \
#       --anchors office-art/anchors_report.json --out public
# Then verify:
#   python3 office-art/verify_office_glb.py public/office.glb office-art/anchors_report.json
#
# Reproduces all 62 anchors EXACTLY (glTF Y-up positions from anchors_report.json).
# Naming conventions consumed by public/main.js:
#   wall_* / mullion* / green_wall  -> fade to 50% in Peak View
#   ceiling_*                       -> fade to 10% in Peak View
#   floor_* / prop_* / backdrop     -> ignored by anchor scan
#   hot_infra|agents|kanban|costs|peak|docs_* -> clickable (dashboard routes)
#   v8_marker (empty)               -> tells main.js to use the Phase 8 light profile
import bpy, bmesh, json, math, sys, argparse

# ----------------------------------------------------------------- args
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--anchors', required=True)
ap.add_argument('--out', default='dist')
args = ap.parse_args(argv)
REPORT = json.load(open(args.anchors))

# ----------------------------------------------------------------- scene reset
bpy.ops.wm.read_factory_settings(use_empty=True)
SCENE = bpy.context.scene
COL = bpy.context.collection

def G2B(gx, gy, gz):
    """glTF (x, up, z) -> Blender (x, -z, up). Exporter (+Y up) maps back exactly."""
    return (gx, -gz, gy)

# ----------------------------------------------------------------- materials
MATS = {}
def _inp(bsdf, *names):
    for n in names:
        if n in bsdf.inputs: return bsdf.inputs[n]
    raise KeyError(names)

def mat(name, color, rough=0.6, metal=0.0, emissive=None, e_str=1.0, alpha=None):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    _inp(b, 'Base Color').default_value = (*color, 1)
    _inp(b, 'Roughness').default_value = rough
    _inp(b, 'Metallic').default_value = metal
    if emissive is not None:
        _inp(b, 'Emission Color', 'Emission').default_value = (*emissive, 1)
        _inp(b, 'Emission Strength').default_value = e_str
    if alpha is not None:
        _inp(b, 'Alpha').default_value = alpha
        m.blend_method = 'BLEND'
        try: m.use_backface_culling = False
        except Exception: pass
    MATS[name] = m
    return m

def hx(h):  # '#rrggbb' -> linear-ish rgb tuple
    h = h.lstrip('#')
    s = tuple(int(h[i:i+2], 16) / 255 for i in (0, 2, 4))
    return tuple(c ** 2.2 for c in s)

SPECTRUM = ['#2E5BFF', '#9B30FF', '#FF3DBE', '#FF9E2C', '#FFE32C', '#3DFF7A']

M = dict(
    concrete   = mat('dark_concrete', (.10, .105, .115), rough=.25, metal=.05),   # polished, slight reflection
    wood_dark  = mat('dark_wood',     (.16, .11, .07),  rough=.45),
    oak        = mat('warm_oak',      (.42, .27, .14),  rough=.45),
    wood_light = mat('light_wood',    (.55, .42, .27),  rough=.5),
    wall       = mat('charcoal_wall', (.13, .135, .15), rough=.4),
    glass      = mat('smoked_glass',  (.35, .42, .47),  rough=.05, alpha=.22),
    glass_dc   = mat('dc_glass',      (.40, .52, .55),  rough=.04, alpha=.16),
    metal      = mat('brushed_metal', (.62, .64, .68),  rough=.25, metal=.9),
    prop       = mat('dark_prop',     (.08, .085, .095), rough=.5),
    sofa       = mat('sofa_gray',     (.21, .21, .23),  rough=.85),
    leather    = mat('leather_brown', (.18, .10, .06),  rough=.55),
    white_panel= mat('white_panel',   (.85, .86, .88),  rough=.6, emissive=(1, .98, .92), e_str=1.1),
    screen     = mat('screen_code',   (.02, .03, .04),  rough=.3, emissive=(.45, .75, 1.0), e_str=1.6),
    screen_dash= mat('screen_dash',   (.02, .03, .04),  rough=.3, emissive=(.35, .9, .7), e_str=1.5),
    city       = mat('city_night',    (.01, .015, .03), rough=.8, emissive=(.5, .6, .9), e_str=1.0),
    cloud_frost= mat('cloud_frost',   (.85, .88, .92),  rough=.35, alpha=.85),
    cloud_cool = mat('cloud_cool',    (.4, .8, 1),      emissive=(.3, .75, 1), e_str=1.8),
    ring_warm  = mat('ring_warm',     (1, .7, .35),     emissive=(1, .62, .22), e_str=2.0),
    neon       = mat('neon_cyan',     (.3, .85, 1),     emissive=(.3, .85, 1), e_str=2.4),
    amber_neon = mat('amber_neon',    (1, .65, .2),     emissive=(1, .6, .15), e_str=2.2),
    frost_band = mat('frost_band',    (.9, .91, .93),   rough=.6, alpha=.85, emissive=(.9, .91, .93), e_str=.4),
    hexf       = mat('hex_floor',     (.6, .8, 1),      emissive=(.55, .8, 1), e_str=1.4),
    rack       = mat('rack_metal',    (.06, .065, .075), rough=.35, metal=.6),
    leaf0      = mat('leaf_0',        (.08, .3, .1),    rough=.7),
    leaf1      = mat('leaf_1',        (.12, .4, .12),   rough=.7),
    leaf2      = mat('leaf_2',        (.2, .5, .15),    rough=.7),
    soil       = mat('living_wall',   (.07, .1, .06),   rough=.9),
)
ZONE = [mat(f'rack_zone_{i}', hx(c), emissive=hx(c), e_str=2.2) for i, c in
        enumerate(['#2E5BFF', '#2E9BFF', '#3DFF7A', '#FFE32C', '#FF9E2C', '#FF4D4D'])]
PILLOW = [mat(f'spectrum_{i}', hx(c), rough=.8, emissive=hx(c), e_str=.25) for i, c in enumerate(SPECTRUM)]

# ----------------------------------------------------------------- geometry helpers
def _link(ob, m=None):
    if m: ob.data.materials.append(m)
    COL.objects.link(ob)
    return ob

def box_g(name, gx, gy, gz, sx, sy, sz, m, rot_y_deg=0):
    """Axis-aligned box in glTF space. (gx,gy,gz)=center, sy=height. rot about up axis."""
    me = bpy.data.meshes.new(name)
    x, y, z = sx / 2, sz / 2, sy / 2          # blender x, y(=-gz), z(=up)
    v = [(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
    f = [(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]
    me.from_pydata(v, [], f); me.update()
    ob = bpy.data.objects.new(name, me)
    ob.location = G2B(gx, gy, gz)
    ob.rotation_euler = (0, 0, math.radians(rot_y_deg))
    return _link(ob, m)

def cyl_g(name, gx, gy, gz, r, h, m, seg=20, rtop=None):
    me = bpy.data.meshes.new(name)
    rt = r if rtop is None else rtop
    v, f = [], []
    for i in range(seg):
        a = i / seg * 2 * math.pi
        v.append((math.cos(a) * r, math.sin(a) * r, -h / 2))
        v.append((math.cos(a) * rt, math.sin(a) * rt, h / 2))
    for i in range(seg):
        j = (i + 1) % seg
        f.append((i*2, j*2, j*2+1, i*2+1))
    f.append(tuple(range(0, seg*2, 2))[::-1])
    f.append(tuple(range(1, seg*2, 2)))
    me.from_pydata(v, [], f); me.update()
    ob = bpy.data.objects.new(name, me)
    ob.location = G2B(gx, gy, gz)
    return _link(ob, m)

def sphere_g(name, gx, gy, gz, r, m, seg=12, ring=8, squash=1.0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=ring, radius=r)
    ob = bpy.context.object
    ob.name = name; ob.data.name = name
    ob.location = G2B(gx, gy, gz)
    ob.scale = (1, 1, squash)
    for p in ob.data.polygons: p.use_smooth = True
    return _link(ob, m)

def torus_g(name, gx, gy, gz, R, r, m, seg=32, tilt_deg=0):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r,
                                     major_segments=seg, minor_segments=8)
    ob = bpy.context.object
    ob.name = name; ob.data.name = name
    ob.location = G2B(gx, gy, gz)
    ob.rotation_euler = (math.radians(tilt_deg), 0, 0)
    for p in ob.data.polygons: p.use_smooth = True
    return _link(ob, m)

def text_g(name, body, size, m, gx, gy, gz, face_deg=0, e=0.012):
    """Upright 3D text. face_deg: 0 faces glTF +z, 180 faces -z, 90 faces +x."""
    bpy.ops.object.text_add()
    ob = bpy.context.object
    ob.data.body = body; ob.data.size = size; ob.data.extrude = e
    ob.data.resolution_u = 3
    ob.data.align_x = 'CENTER'; ob.data.align_y = 'CENTER'
    bpy.ops.object.convert(target='MESH')
    ob = bpy.context.object
    ob.name = name; ob.data.name = name
    ob.location = G2B(gx, gy, gz)
    ob.rotation_euler = (math.radians(90), 0, math.radians(face_deg))
    return _link(ob, m)

def empty_g(name, gx, gy, gz, quat=None):
    ob = bpy.data.objects.new(name, None)
    ob.empty_display_size = .15
    ob.location = G2B(gx, gy, gz)
    if quat and quat != [0, 0, 0, 1]:
        ob.rotation_mode = 'QUATERNION'
        qx, qy, qz, qw = quat                  # glTF (x,y,z,w), Y-up
        ob.rotation_quaternion = (qw, qx, -qz, qy)   # Blender (w,x,y,z), Z-up
    COL.objects.link(ob)
    return ob

WALL_N = [0]
def wall(gx, gy, gz, sx, sy, sz, m=None, rot=0):
    WALL_N[0] += 1
    return box_g(f'wall_{WALL_N[0]:02d}', gx, gy, gz, sx, sy, sz, m or M['wall'], rot)

def wall_run_x(z, x0, x1, h, gaps=(), m=None, t=.15, y0=0):
    """Wall along X at fixed z, with door gaps [(center,width)]."""
    segs, cur = [], x0
    for c, w in sorted(gaps):
        a, b = c - w / 2, c + w / 2
        if a > cur: segs.append((cur, a))
        # header above the door opening
        wall((a + b) / 2, y0 + h - (h - 2.2) / 2, z, b - a, h - 2.2, t, m)
        cur = b
    if cur < x1: segs.append((cur, x1))
    for a, b in segs:
        wall((a + b) / 2, y0 + h / 2, z, b - a, h, t, m)

def wall_run_z(x, z0, z1, h, gaps=(), m=None, t=.15, y0=0):
    segs, cur = [], z0
    for c, w in sorted(gaps):
        a, b = c - w / 2, c + w / 2
        if a > cur: segs.append((cur, a))
        wall(x, y0 + h - (h - 2.2) / 2, (a + b) / 2, t, h - 2.2, b - a, m)
        cur = b
    if cur < z1: segs.append((cur, z1))
    for a, b in segs:
        wall(x, y0 + h / 2, (a + b) / 2, t, h, b - a, m)

MULL_N = [0]
def mullion(gx, gy, gz, sx, sy, sz):
    MULL_N[0] += 1
    return box_g(f'mullion_{MULL_N[0]:02d}', gx, gy, gz, sx, sy, sz, M['prop'])

def glass_window_x(z, x0, x1, h, y0=0.0, m=None):
    """Floor-to-ceiling glazing along X with mullions every ~2m."""
    wall((x0 + x1) / 2, y0 + h / 2, z, x1 - x0, h, .06, m or M['glass'])
    n = max(2, round((x1 - x0) / 2))
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        mullion(x, y0 + h / 2, z, .08, h, .12)
    mullion((x0 + x1) / 2, y0 + .04, z, x1 - x0, .08, .12)
    mullion((x0 + x1) / 2, y0 + h - .04, z, x1 - x0, .08, .12)

def glass_window_z(x, z0, z1, h, y0=0.0, m=None):
    wall(x, y0 + h / 2, (z0 + z1) / 2, .06, h, z1 - z0, m or M['glass'])
    n = max(2, round((z1 - z0) / 2))
    for i in range(n + 1):
        z = z0 + (z1 - z0) * i / n
        mullion(x, y0 + h / 2, z, .12, h, .08)
    mullion(x, y0 + .04, (z0 + z1) / 2, .12, .08, z1 - z0)
    mullion(x, y0 + h - .04, (z0 + z1) / 2, .12, .08, z1 - z0)

# ----------------------------------------------------------------- layout constants
#   west wing x 2..16.2 | corridor x 16.2..23.8 | east wing x 23.8..38
#   lounge z .3..5.75 | staff 5.75..11.25 | devops 11.25..17.2  (west)
#   meeting z .3..5.75 | control 5.75..11.5 | ceo 11.5..17.2    (east)
#   DC hall x 12..28, z 17.2..27.6, glass cylinder c=(20,21) r=5
WX0, WX1 = 2.0, 16.2
CX0, CX1 = 16.2, 23.8
EX0, EX1 = 23.8, 38.0
Z0, ZW1 = 0.3, 17.2
DCX0, DCX1, DCZ1 = 12.0, 28.0, 27.6
H_LOUNGE, H_OFFICE, H_CORR, H_MEET = 4.0, 3.0, 2.8, 4.0
DC_C, DC_R = (20.0, 21.0), 5.0

# ----------------------------------------------------------------- floors
def floors():
    box_g('floor_lounge',   (WX0+WX1)/2, -.05, (Z0+5.75)/2, WX1-WX0, .1, 5.75-Z0, M['concrete'])
    box_g('floor_staff',    (WX0+WX1)/2, -.05, (5.75+11.25)/2, WX1-WX0, .1, 11.25-5.75, M['wood_light'])
    box_g('floor_devops',   (WX0+WX1)/2, -.05, (11.25+ZW1)/2, WX1-WX0, .1, ZW1-11.25, M['concrete'])
    box_g('floor_corridor', (CX0+CX1)/2, -.05, (Z0+ZW1)/2, CX1-CX0, .1, ZW1-Z0, M['concrete'])
    box_g('floor_meeting',  (EX0+EX1)/2, -.05, (Z0+5.75)/2, EX1-EX0, .1, 5.75-Z0, M['wood_dark'])
    box_g('floor_control',  (EX0+EX1)/2, -.05, (5.75+11.5)/2, EX1-EX0, .1, 11.5-5.75, M['concrete'])
    box_g('floor_ceo',      (EX0+EX1)/2, -.05, (11.5+ZW1)/2, EX1-EX0, .1, ZW1-11.5, M['oak'])
    box_g('floor_dc_hall',  (DCX0+DCX1)/2, -.05, (ZW1+DCZ1)/2, DCX1-DCX0, .1, DCZ1-ZW1, M['concrete'])

# ----------------------------------------------------------------- perimeter + interior walls
def architecture():
    # south facade: glazing for lounge + meeting (city views), solid corridor head
    glass_window_x(Z0, WX0, WX1, H_LOUNGE)
    glass_window_x(Z0, EX0, EX1, H_MEET)
    wall_run_x(Z0, CX0, CX1, H_CORR)                      # corridor south cap (entrance wall)
    # west facade: lounge gets green wall backing (solid), staff/devops glazing
    wall_run_z(WX0, Z0, 5.75, H_LOUNGE)
    glass_window_z(WX0, 5.75, 11.25, H_OFFICE)
    glass_window_z(WX0, 11.25, ZW1, H_OFFICE)
    # east facade
    wall_run_z(EX1, Z0, ZW1, H_MEET)
    # DC hall shell
    wall_run_z(DCX0, ZW1, DCZ1, H_OFFICE + 1.4)
    wall_run_z(DCX1, ZW1, DCZ1, H_OFFICE + 1.4)
    wall_run_x(DCZ1, DCX0, DCX1, H_OFFICE + 1.4)
    # close the gaps between wings and DC hall on the north side
    wall_run_x(ZW1, WX0, DCX0, H_OFFICE)
    wall_run_x(ZW1, DCX1, EX1, H_OFFICE)
    # corridor <-> DC hall: wide opening at x 18.6..21.4 (nav_door_dc at 20,17)
    wall_run_x(ZW1, CX0, CX1, H_CORR, gaps=[(20.0, 2.8)])
    # corridor west wall (doors: lounge z3, staff z8.5, devops z14)
    wall_run_z(CX0, Z0, ZW1, H_CORR, gaps=[(3.0, 1.8), (8.5, 1.8), (14.0, 1.8)])
    # corridor east wall (doors: meeting z3, control z8.75, ceo z14.25) - glass for ceo front
    wall_run_z(CX1, Z0, 11.5, H_CORR, gaps=[(3.0, 1.8), (8.75, 1.8)])
    glass_window_z(CX1, 11.5, ZW1, H_CORR)                # CEO glass front
    wall_run_z(CX1, 11.5, ZW1, H_CORR, gaps=[(14.25, 1.8)], t=.04, m=M['glass'])
    # west wing dividers
    wall_run_x(5.75, WX0, CX0, H_OFFICE)
    wall_run_x(11.25, WX0, CX0, H_OFFICE)
    # east wing dividers (meeting walls are smoked glass)
    wall_run_x(5.75, CX1, EX1, H_OFFICE, m=M['glass'])
    wall_run_x(11.5, CX1, EX1, H_OFFICE)

def ceilings():
    def ceil(name, x0, x1, z0, z1, h, m=None):
        box_g(name, (x0+x1)/2, h, (z0+z1)/2, x1-x0, .08, z1-z0, m or M['wall'])
    ceil('ceiling_lounge',  WX0, WX1, Z0, 5.75, H_LOUNGE)
    ceil('ceiling_staff',   WX0, WX1, 5.75, 11.25, H_OFFICE, M['white_panel'])
    ceil('ceiling_devops',  WX0, WX1, 11.25, ZW1, H_OFFICE)
    ceil('ceiling_corridor', CX0, CX1, Z0, ZW1, H_CORR)
    ceil('ceiling_meeting', EX0, EX1, Z0, 5.75, H_MEET)
    ceil('ceiling_control', EX0, EX1, 5.75, 11.5, H_OFFICE)
    ceil('ceiling_ceo',     EX0, EX1, 11.5, ZW1, H_OFFICE, M['white_panel'])
    # recessed light panels (prop_ prefix: ignored by anchor scan, not faded)
    for i, (x, z, h) in enumerate([(9, 8.5, H_OFFICE), (9, 14.3, H_OFFICE), (20, 4, H_CORR),
                                   (20, 12, H_CORR), (31, 8.75, H_OFFICE), (31, 14.25, H_OFFICE)]):
        box_g(f'prop_ceillight_{i}', x, h - .06, z, 1.6, .04, .7, M['white_panel'])
    # exposed beams: lounge (industrial look) + corridor
    for i in range(3):
        box_g(f'prop_beam_l{i}', (WX0+WX1)/2, H_LOUNGE - .25, 1.4 + i * 1.6, WX1-WX0, .18, .14, M['prop'])
    for i in range(5):
        box_g(f'prop_beam_c{i}', (CX0+CX1)/2, H_CORR - .2, 2 + i * 3.2, CX1-CX0, .14, .12, M['prop'])

def backdrop():
    # city skyline panels outside the south + west glazing
    box_g('backdrop', 20, 6, -3.5, 55, 14, .2, M['city'])
    box_g('backdrop_west', -1.5, 5, 8.5, .2, 12, 30, M['city'])
    # irregular skyline blocks (silhouettes against the glow)
    import random
    random.seed(8)
    for i in range(26):
        w = random.uniform(.8, 2.4); h = random.uniform(1.5, 8)
        box_g(f'prop_sky_{i}', random.uniform(0, 40), h/2 + .2, -2.2 - random.uniform(0, .8), w, h, .6, M['prop'])

# ----------------------------------------------------------------- room: lounge
def lounge():
    # L-shaped sectional: row along z1.7 (seats 01-04) + row along z4.3 (05-08) + corner
    for (zz, x0, x1, back_dz) in [(1.7, 4.4, 12.6, -.45), (4.3, 4.4, 12.6, .45)]:
        box_g(f'prop_sofa_base_{zz}', (x0+x1)/2, .22, zz, x1-x0, .44, 1.0, M['sofa'])
        box_g(f'prop_sofa_back_{zz}', (x0+x1)/2, .55, zz + back_dz, x1-x0, .55, .25, M['sofa'])
    box_g('prop_sofa_corner', 3.7, .22, 3.0, 1.0, .44, 3.6, M['sofa'])
    box_g('prop_sofa_cback',  3.25, .55, 3.0, .25, .55, 3.6, M['sofa'])
    for i in range(8):                                     # spectrum pillows
        row = i // 4
        x = 5.0 + (i % 4) * 2.0
        z = 1.45 if row == 0 else 4.55
        box_g(f'prop_pillow_{i}', x, .56, z, .45, .32, .16, PILLOW[i % 6], rot_y_deg=8 * ((i % 3) - 1))
    # oak coffee table with embedded dashboard screen (clickable -> peak view '/')
    box_g('prop_ctable', 8.5, .2, 3.0, 2.2, .4, 1.1, M['oak'])
    box_g('hot_peak_table', 8.5, .415, 3.0, 1.7, .035, .8, M['screen_dash'])
    # 5 cloud pendants at varying heights
    import random
    random.seed(5)
    spots = [(6, 2.1, 3.1), (8.2, 2.6, 2.0), (10.5, 2.3, 3.4), (12.5, 2.8, 2.6), (7.2, 3.0, 4.2)]
    for i, (x, y, z) in enumerate(spots):
        glow = M['cloud_cool'] if i % 2 == 0 else M['ring_warm']
        sphere_g(f'prop_cloudglow_l{i}', x, y - .12, z, .16, glow, seg=10, ring=6)
        for j in range(4):
            dx, dz = math.cos(j * 1.7 + i) * .25, math.sin(j * 2.1 + i) * .18
            sphere_g(f'prop_cloud_l{i}_{j}', x + dx, y + (j % 2) * .1, z + dz,
                     .22 + (j % 3) * .05, M['cloud_frost'], seg=10, ring=6, squash=.65)
        box_g(f'prop_cloudwire_l{i}', x, (y + H_LOUNGE) / 2, z, .015, H_LOUNGE - y, .015, M['prop'])
    # living green wall on the west wall
    box_g('green_wall', WX0 + .12, 1.9, 3.0, .18, 3.6, 5.0, M['soil'])
    random.seed(6)
    for i in range(90):
        z = .7 + random.random() * 4.6
        y = .25 + random.random() * 3.4
        sphere_g(f'prop_leaf_{i}', WX0 + .26, y, z, .1 + random.random() * .09,
                 [M['leaf0'], M['leaf1'], M['leaf2']][i % 3], seg=7, ring=5, squash=.7)
    # shelves + plant
    for i, y in enumerate([1.6, 2.2]):
        box_g(f'prop_shelf_{i}', 13.5, y, 5.55, 2.4, .05, .3, M['oak'])
        for j in range(3):
            box_g(f'prop_book_{i}{j}', 12.8 + j * .7, y + .14, 5.55, .3, .24, .2, PILLOW[(i * 3 + j) % 6])
    cyl_g('prop_pot_lounge', 14.8, .25, 1.0, .3, .5, M['prop'], seg=12)
    for j in range(6):
        sphere_g(f'prop_palm_{j}', 14.8 + math.cos(j) * .3, 1.0 + j * .12, 1.0 + math.sin(j) * .3,
                 .22, M['leaf1'], seg=7, ring=5, squash=.5)

# ----------------------------------------------------------------- desks/chairs helpers
def desk(idx, gx, gz, face_deg, w=1.5, monitors=1, room=''):
    box_g(f'prop_desk_{room}{idx}', gx, .72, gz, w, .05, .7, M['wood_dark'], face_deg)
    a = math.radians(face_deg)
    fx, fz = math.sin(a), math.cos(a)                      # facing dir (glTF, 0deg -> +z)
    for sx in (-1, 1):
        lx = gx + math.cos(a) * sx * (w/2 - .08)
        lz = gz - math.sin(a) * sx * (w/2 - .08)
        box_g(f'prop_dleg_{room}{idx}{sx}', lx, .35, lz, .06, .7, .6, M['metal'], face_deg)
    mats_n = []
    for mi in range(monitors):
        off = (mi - (monitors - 1) / 2) * .5
        mx = gx + math.cos(a) * off + fx * .22
        mz = gz - math.sin(a) * off + fz * .22
        rot = face_deg + (0 if mi == 1 or monitors == 1 else (-14 if mi == 0 else 14))
        box_g(f'prop_mon_{room}{idx}_{mi}', mx, 1.02, mz, .48, .3, .03, M['screen'], rot + 180)
        box_g(f'prop_monstand_{room}{idx}_{mi}', mx, .78, mz, .06, .14, .05, M['prop'], rot)

def chair(idx, gx, gz, face_deg, room='', m=None):
    m = m or M['prop']
    a = math.radians(face_deg)
    box_g(f'prop_chair_{room}{idx}', gx, .45, gz, .46, .06, .46, m, face_deg)
    box_g(f'prop_chairback_{room}{idx}', gx - math.sin(a) * .23, .75, gz - math.cos(a) * .23,
          .46, .55, .06, m, face_deg)
    cyl_g(f'prop_chairpost_{room}{idx}', gx, .25, gz, .03, .4, M['metal'], seg=8)
    box_g(f'prop_chairbase_{room}{idx}', gx, .03, gz, .4, .04, .4, M['metal'], face_deg + 45)

def ring_pendant(name, gx, gy, gz, R=.45):
    torus_g(name, gx, gy, gz, R, .035, M['ring_warm'], seg=28)
    box_g(name + '_wire', gx, gy + .5, gz, .015, 1.0, .015, M['prop'])

def cable_bundle(name, gx, gz, face_deg, n=6):
    a = math.radians(face_deg)
    for i in range(n):
        off = (i - (n - 1) / 2) * .055
        cx = gx + math.cos(a) * off
        cz = gz - math.sin(a) * off
        cyl_g(f'{name}_{i}', cx, .36, cz, .02, .72,
              mat(f'cable_{i}', hx(SPECTRUM[i % 6]), emissive=hx(SPECTRUM[i % 6]), e_str=.9), seg=8)

# ----------------------------------------------------------------- room: staff
def staff():
    A = {x['name']: x for x in REPORT['anchors']}
    for i in range(1, 5):
        p = A[f'doc_desk_{i:02d}']['pos']
        desk(i, p[0], p[2] - .55, 180, monitors=1, room='st')
        chair(i, p[0], p[2], 180, room='st')
        ring_pendant(f'prop_ringp_st{i}', p[0], 2.45, p[2] - .4)
    cable_bundle('prop_cable_staff', A['doc_desk_02']['pos'][0], A['doc_desk_02']['pos'][2] - .55, 180)

# ----------------------------------------------------------------- room: devops
def devops():
    A = {x['name']: x for x in REPORT['anchors']}
    for i in range(1, 9):
        p = A[f'work_desk_{i:02d}']['pos']
        face = 0 if i <= 4 else 180                       # row1 faces +z, row2 faces -z
        dz = .55 if i <= 4 else -.55
        desk(i, p[0], p[2] + dz, face, w=1.8, monitors=3, room='dv')
        chair(i, p[0], p[2], face, room='dv')
        cable_bundle(f'prop_cable_dv{i}', p[0], p[2] + dz, face)
        if i % 2 == 1:
            ring_pendant(f'prop_ringp_dv{i}', p[0] + 1.4, 2.5, p[2] + dz)
    # clickable monitor wall proxy -> /agents (covers both desk rows)
    box_g('hot_agents_desks', 8.5, 1.05, 14.25, 11.5, .9, 3.6, M['glass'], 0)
    bpy.data.objects['hot_agents_desks'].hide_render = False
    # RGB floor traces - circuit-like, intentional
    for i, (x0, z0, x1, z1) in enumerate([(3, 12.2, 14.5, 12.2), (3, 16.3, 14.5, 16.3),
                                          (14.5, 12.2, 14.5, 16.3), (3, 14.25, 9, 14.25)]):
        L = math.hypot(x1 - x0, z1 - z0)
        rot = math.degrees(math.atan2(z1 - z0, x1 - x0))
        box_g(f'prop_trace_{i}', (x0+x1)/2, .012, (z0+z1)/2, L, .015, .05,
              mat('dv_trace', (0,0,0), emissive=hx(SPECTRUM[i % 6]), e_str=1.6) if i == 0 else MATS['dv_trace'], -rot)
    # shield window into the DC (SE corner wall toward the cylinder)
    sx, sz = 15.0, 16.6
    box_g('prop_shieldframe', sx, 1.7, sz, 1.7, 2.0, .1, M['amber_neon'], 40)
    box_g('wall_shieldglass', sx, 1.7, sz, 1.5, 1.8, .04, M['glass_dc'], 40)
    # edge-lit lightbox on the west wall
    box_g('prop_lightbox', WX0 + .12, 1.8, 14.2, .08, 1.0, 2.6, M['white_panel'])
    text_g('prop_logo_dv', '110lymph.nl', .34, M['prop'], WX0 + .18, 1.8, 14.2, face_deg=90)

# ----------------------------------------------------------------- room: meeting
def meeting():
    A = {x['name']: x for x in REPORT['anchors']}
    # oval table (scaled cylinder) + silver trim
    ob = cyl_g('prop_meet_table', 31.5, .72, 3.0, 1.0, .07, M['prop'], seg=36)
    ob.scale = (2.4, 1.5, 1)
    tr = torus_g('prop_meet_trim', 31.5, .755, 3.0, 1.0, .015, M['metal'], seg=36)
    tr.scale = (2.4, 1.5, 1)
    cyl_g('prop_meet_leg', 31.5, .36, 3.0, .3, .72, M['prop'], seg=16)
    # 8 chairs at the meet_seat anchors
    for i in range(1, 8):
        a = A[f'meet_seat_{i:02d}']
        q = a['quat']
        ang = math.degrees(2 * math.atan2(q[1], q[3]))      # rotation about up axis
        chair(i, a['pos'][0], a['pos'][2], ang, room='mt')
    a = A['meet_seat_ollie']
    chair(9, a['pos'][0], a['pos'][2], 90, room='mt', m=M['leather'])
    # amber ring light overhead
    torus_g('meet_ring', 31.5, 3.3, 3.0, 1.6, .05, M['ring_warm'], seg=40)
    # media wall (clickable -> /kanban)
    box_g('hot_kanban_media', EX1 - .25, 1.7, 3.0, .1, 1.7, 3.2, M['screen'])
    box_g('prop_media_frame', EX1 - .2, 1.7, 3.0, .06, 1.9, 3.5, M['prop'])
    # holo puck on the table (runtime hologram floats above meet_holo)
    cyl_g('prop_holopuck', 31.5, .78, 3.0, .12, .04, M['neon'], seg=16)

# ----------------------------------------------------------------- room: control
def control():
    # curved command desk arcs around ollie_station (31.5, 8.75), opening north
    cx, cz, R = 31.5, 8.75, 1.7
    segs = 7
    for i in range(segs):
        a0 = math.radians(-150 + i * (120 / (segs - 1)) * 2.5 / 2.5)
        ang = -150 + i * 300 / segs
        if -80 < ang < 80: continue                        # opening behind Ollie
        rad = math.radians(ang)
        px, pz = cx + math.sin(rad) * R, cz + math.cos(rad) * R
        box_g(f'prop_cmd_{i}', px, .72, pz, 1.55, .06, .7, M['prop'], -ang)
        box_g(f'hot_costs_front_{i}', px + math.sin(rad) * .36, .38, pz + math.cos(rad) * .36,
              1.55, .7, .05, ZONE[i % 6], -ang)
        box_g(f'prop_cmdmon_{i}', px - math.sin(rad) * .1, 1.1, pz - math.cos(rad) * .1,
              .8, .5, .04, M['screen_dash'], -ang + 180)
    # neon cloud logo + text on the north wall
    for j, (dx, r) in enumerate([(-.55, .28), (0, .4), (.55, .3), (-.28, .33), (.28, .35)]):
        sphere_g(f'prop_ncloud_{j}', 30.0 + dx, 2.25 + (.08 if j % 2 else 0), 5.95, r, M['neon'], seg=10, ring=6, squash=.6)
    text_g('prop_logo_ctl', '110lymph.nl', .3, M['neon'], 30.0, 1.62, 5.95, face_deg=180)
    # amber circuit shield sign
    sh = cyl_g('prop_shield_ctl', 33.6, 2.2, 5.95, .55, .08, M['amber_neon'], seg=6)
    sh.rotation_euler = (math.radians(90), 0, math.radians(90))
    torus_g('prop_shieldring_ctl', 33.6, 2.2, 6.0, .62, .03, M['amber_neon'], seg=24, tilt_deg=90)
    # side equipment rack
    box_g('prop_ctlrack', 36.9, .9, 7.0, .7, 1.8, .8, M['rack'])
    box_g('prop_ctlrack_led', 36.62, .9, 7.0, .04, 1.6, .06, ZONE[0])

# ----------------------------------------------------------------- room: ceo
def ceo():
    A = {x['name']: x for x in REPORT['anchors']}
    p = A['ceo_desk']['pos']                               # (31.5, 0, 14.6)
    box_g('prop_ceo_desk', p[0], .73, p[2] + .5, 2.2, .07, .9, M['oak'])
    for sx in (-1, 1):
        box_g(f'prop_ceo_dleg{sx}', p[0] + sx, .36, p[2] + .5, .08, .72, .8, M['oak'])
    # leather executive chair at the anchor
    chair(1, p[0], p[2], 0, room='ceo', m=M['leather'])
    # loveseat + side table + plant
    box_g('prop_ceo_sofa', 27.0, .25, 16.2, 1.8, .5, .8, M['leather'])
    box_g('prop_ceo_sofab', 27.0, .6, 16.55, 1.8, .5, .2, M['leather'])
    box_g('prop_ceo_side', 28.3, .3, 16.2, .5, .6, .5, M['oak'])
    cyl_g('prop_ceo_pot', 36.8, .25, 16.4, .25, .5, M['prop'], seg=12)
    for j in range(5):
        sphere_g(f'prop_ceo_plant_{j}', 36.8 + math.cos(j * 2) * .2, .85 + j * .1, 16.4 + math.sin(j * 2) * .2,
                 .18, M['leaf2'], seg=7, ring=5, squash=.6)
    # one cloud lamp, warm
    sphere_g('prop_cloudglow_ceo', 31.5, 2.25, 14.0, .14, M['ring_warm'], seg=10, ring=6)
    for j in range(3):
        sphere_g(f'prop_cloud_ceo_{j}', 31.5 + (j - 1) * .3, 2.4 + (j % 2) * .08, 14.0, .24, M['cloud_frost'], seg=10, ring=6, squash=.65)
    # wall screen (clickable -> /docs) + small logo
    box_g('hot_docs_screen', EX1 - .25, 1.6, 14.25, .08, 1.1, 2.0, M['screen'])
    text_g('prop_logo_ceo', '110lymph.nl', .22, M['prop'], EX1 - .3, 2.5, 14.25, face_deg=-90)

# ----------------------------------------------------------------- room: data center
def datacenter():
    cx, cz = DC_C
    door_bearing = 180.0                                   # toward nav_door_dc at (20,17): -z
    # glass cylinder with door gap (segments)
    seg = 48
    for i in range(seg):
        a0 = i / seg * 360
        if abs(((a0 - door_bearing + 180) % 360) - 180) < 12: continue
        rad = math.radians(a0 + 360 / seg / 2)
        px, pz = cx + math.sin(rad) * DC_R, cz + math.cos(rad) * DC_R
        w = 2 * DC_R * math.tan(math.pi / seg)
        box_g(f'wall_dcg_{i:02d}', px, 1.6, pz, w * 1.02, 3.2, .05, M['glass_dc'], -a0 - 360 / seg / 2)
    # frosted brand band at chest height
    for i in range(seg):
        a0 = i / seg * 360
        if abs(((a0 - door_bearing + 180) % 360) - 180) < 12: continue
        rad = math.radians(a0 + 360 / seg / 2)
        px, pz = cx + math.sin(rad) * (DC_R + .01), cz + math.cos(rad) * (DC_R + .01)
        w = 2 * (DC_R + .01) * math.tan(math.pi / seg)
        box_g(f'prop_band_{i:02d}', px, 1.45, pz, w * 1.02, .5, .02, M['frost_band'], -a0 - 360 / seg / 2)
    text_g('prop_logo_dc', '110lymph.nl', .3, M['prop'], cx, 1.45, cz - DC_R - .06, face_deg=180)
    # top + bottom rims
    torus_g('prop_dcrim_t', cx, 3.2, cz, DC_R, .06, M['metal'], seg=48)
    torus_g('prop_dcrim_b', cx, .08, cz, DC_R, .05, M['metal'], seg=48)
    # server racks in a ring, color zones blue->green->yellow->red, lids ON
    n = 14
    for i in range(n):
        ang = door_bearing + 30 + (300 * i / (n - 1))      # leave the door arc clear
        rad = math.radians(ang)
        px, pz = cx + math.sin(rad) * 3.4, cz + math.cos(rad) * 3.4
        zone = ZONE[min(5, int(i / n * 6))]
        face = -ang + 180                                  # face inward
        box_g(f'rack_{i:02d}', px, 1.05, pz, .62, 2.1, .85, M['rack'], face)
        # closed front bezel with vent grooves + LED strip + status dots
        frad = math.radians(ang)
        bx, bz = px - math.sin(frad) * .445, pz - math.cos(frad) * .445
        box_g(f'prop_rbezel_{i}', bx, 1.05, bz, .56, 2.0, .03, M['prop'], face)
        for g in range(5):
            box_g(f'prop_rvent_{i}_{g}', bx - math.sin(frad) * .02, .45 + g * .38, bz - math.cos(frad) * .02,
                  .46, .02, .015, M['rack'], face)
        box_g(f'rack_led_{i:02d}', bx - math.sin(frad) * .025, 1.05, bz - math.cos(frad) * .025,
              .05, 1.9, .02, zone, face)
        for d in range(4):
            box_g(f'prop_rdot_{i}_{d}', bx - math.sin(frad) * .025 + math.cos(frad) * (.18 - d * .1),
                  1.98, bz - math.cos(frad) * .025 - math.sin(frad) * (.18 - d * .1),
                  .03, .03, .015, ZONE[(i + d) % 6], face)
        # cable arm on top
        box_g(f'prop_rcable_{i}', px, 2.2, pz, .1, .1, .6, M['prop'], face)
    # clickable proxy around the whole ring -> /infra
    cyl_g('hot_infra_ring', cx, 1.1, cz, 3.9, 2.3, M['glass_dc'], seg=24)
    # hexagonal floor with glowing seams - one merged mesh
    verts, faces = [], []
    hr = .55
    for q in range(-8, 9):
        for r in range(-8, 9):
            hx_, hz_ = q * hr * 1.5, (r + (q % 2) * .5) * hr * math.sqrt(3)
            if math.hypot(hx_, hz_) > DC_R - .4: continue
            for e in range(6):
                a1, a2 = math.pi / 3 * e + math.pi / 6, math.pi / 3 * (e + 1) + math.pi / 6
                x1, z1 = hx_ + math.cos(a1) * hr * .96, hz_ + math.sin(a1) * hr * .96
                x2, z2 = hx_ + math.cos(a2) * hr * .96, hz_ + math.sin(a2) * hr * .96
                nx, nz = (z2 - z1), -(x2 - x1)
                L = math.hypot(nx, nz) or 1
                nx, nz = nx / L * .015, nz / L * .015
                b = len(verts)
                for (vx, vz) in [(x1 - nx, z1 - nz), (x1 + nx, z1 + nz), (x2 + nx, z2 + nz), (x2 - nx, z2 - nz)]:
                    verts.append((cx + vx, -(cz + vz), .015))   # blender coords
                faces.append((b, b + 1, b + 2, b + 3))
    me = bpy.data.meshes.new('floor_dc_hexgrid')
    me.from_pydata(verts, [], faces); me.update()
    ob = bpy.data.objects.new('floor_dc_hexgrid', me)
    _link(ob, M['hexf'])
    # domed radial skylight
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=10, radius=DC_R + .4)
    dome = bpy.context.object
    dome.name = 'ceiling_dc'; dome.data.name = 'ceiling_dc'
    dome.location = G2B(cx, 3.2, cz)
    bm = bmesh.new(); bm.from_mesh(dome.data)
    for v in list(bm.verts):
        if v.co.z < 0: bm.verts.remove(v)
    bm.to_mesh(dome.data); bm.free()
    dome.data.materials.append(M['glass_dc'])
    for p in dome.data.polygons: p.use_smooth = True
    COL.objects.link(dome)
    for i in range(12):                                    # radial spokes
        ang = i * 30
        rad = math.radians(ang)
        sp = box_g(f'prop_dspoke_{i}', cx + math.sin(rad) * DC_R / 2, 4.45, cz + math.cos(rad) * DC_R / 2,
                   .08, .1, DC_R, M['metal'], -ang)
        sp.rotation_euler = (math.radians(-28), 0, math.radians(-ang))

def corridor():
    # baseboard guide LEDs along both corridor walls
    for x in (CX0 + .12, CX1 - .12):
        box_g(f'prop_guide_{x:.0f}', x, .04, (Z0 + ZW1) / 2, .04, .03, ZW1 - Z0 - .6, M['neon'])
    box_g('prop_guide_dc', 20, .04, (ZW1 + 18.8) / 2, 1.4, .03, 1.6, M['neon'])

# ----------------------------------------------------------------- build all
floors(); architecture(); ceilings(); backdrop()
lounge(); staff(); devops(); meeting(); control(); ceo(); datacenter(); corridor()

# anchors (EXACT) + v8 marker
for a in REPORT['anchors']:
    empty_g(a['name'], *a['pos'], quat=a.get('quat'))
empty_g('v8_marker', 0, 0, 0)

# ----------------------------------------------------------------- stats + export
tri = 0
for ob in bpy.data.objects:
    if ob.type == 'MESH':
        ob.data.calc_loop_triangles()
        tri += len(ob.data.loop_triangles)
print(f'[build] objects={len(bpy.data.objects)} triangles={tri}')
assert tri <= 250_000, f'triangle budget exceeded: {tri}'

import os
os.makedirs(args.out, exist_ok=True)
out = os.path.join(args.out, 'office.glb')
kw = dict(filepath=out, export_format='GLB', export_yup=True, export_apply=True,
          export_lights=False, export_cameras=False, export_animations=False)
try:
    bpy.ops.export_scene.gltf(**kw, export_draco_mesh_compression_enable=True,
                              export_draco_mesh_compression_level=6)
except TypeError:
    print('[build] draco args not accepted by this Blender, exporting uncompressed')
    bpy.ops.export_scene.gltf(**kw)
print(f'[build] wrote {out} ({os.path.getsize(out)//1024} KB)')
