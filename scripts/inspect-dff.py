#!/usr/bin/env python3
"""
Inspect and compare RenderWare DFF files using DragonFF's gtaLib parser.
"""

import sys
import os
from pathlib import Path

# Add DragonFF to python path
dragonff_dir = Path("C:/Users/enigm/AppData/Roaming/Blender Foundation/Blender/5.1/extensions/blender_org/dragonff")
sys.path.insert(0, str(dragonff_dir))

from gtaLib.dff import dff

def inspect_file(filepath):
    print(f"\n==========================================")
    print(f"Inspecting: {filepath}")
    print(f"==========================================")
    
    model = dff()
    model.load_file(filepath)
    print(f"RW Version: {model.rw_version}")
    print(f"Frames: {len(model.frame_list)}")
    for i, f in enumerate(model.frame_list):
        print(f"  Frame {i}: name='{getattr(f, 'name', '')}', parent={getattr(f, 'parent_index', getattr(f, 'parent', ''))}")
    print(f"Geometries: {len(model.geometry_list)}")
    for i, g in enumerate(model.geometry_list):
        print(f"  Geometry {i}:")
        print(f"    flags: 0x{g.flags:04X} (prelit={bool(g.flags & 0x08)}, textured={bool(g.flags & 0x04)}, light={bool(g.flags & 0x20)})")
        print(f"    triangles: {len(g.triangles)}, vertices: {len(g.vertices)}")
        bs = g.bounding_sphere
        print(f"    bounding_sphere: center=({bs.x:.3f}, {bs.y:.3f}, {bs.z:.3f}), radius={bs.radius:.3f}")
        if g.vertices:
            min_x = min(v.x for v in g.vertices)
            max_x = max(v.x for v in g.vertices)
            min_y = min(v.y for v in g.vertices)
            max_y = max(v.y for v in g.vertices)
            min_z = min(v.z for v in g.vertices)
            max_z = max(v.z for v in g.vertices)
            print(f"    bounds_x: ({min_x:.2f}, {max_x:.2f})")
            print(f"    bounds_y: ({min_y:.2f}, {max_y:.2f})")
            print(f"    bounds_z: ({min_z:.2f}, {max_z:.2f})")
        if hasattr(g, 'prelit_colors') and g.prelit_colors:
            alphas = [c.a for c in g.prelit_colors]
            print(f"    prelit alpha min: {min(alphas)}, max: {max(alphas)}, zeros: {alphas.count(0)}")
        print(f"    materials ({len(g.materials)}):")
        for mi, m in enumerate(g.materials):
            tex = m.texture.name if (hasattr(m, 'texture') and m.texture) else "NONE"
            mask = m.texture.mask if (hasattr(m, 'texture') and m.texture) else "NONE"
            color = f"RGBA({m.color.r},{m.color.g},{m.color.b},{m.color.a})" if hasattr(m, 'color') else "None"
            print(f"      [{mi}] tex='{tex}', mask='{mask}', color={color}")
    print(f"Atomics: {len(model.atomic_list)}")
    for i, a in enumerate(model.atomic_list):
        print(f"  Atomic {i}: frame={getattr(a, 'frame', getattr(a, 'frame_index', ''))}, geom={getattr(a, 'geometry', getattr(a, 'geometry_index', ''))}, flags=0x{a.flags:X}")

if __name__ == "__main__":
    for arg in sys.argv[1:]:
        inspect_file(arg)
