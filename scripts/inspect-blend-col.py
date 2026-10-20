#!/usr/bin/env python3
"""
inspect-blend-col.py

Lists every object in the root '*.col' collections of a Blender document: type,
modifiers, mesh polygon counts, and how many polygons are horizontal (normal
within ~8 degrees of straight up or down), for both the stored mesh and the
modifier-evaluated mesh.

Usage: python scripts/inspect-blend-col.py <path-to-blend-file>
"""

import os
import subprocess
import sys

HORIZONTAL = 0.99


def horizontal_counts(mesh):
    up = down = 0
    for poly in mesh.polygons:
        nz = poly.normal.z
        if nz > HORIZONTAL:
            up += 1
        elif nz < -HORIZONTAL:
            down += 1
    return up, down


def run_inside_blender():
    import bpy

    depsgraph = bpy.context.evaluated_depsgraph_get()
    for coll in bpy.context.scene.collection.children:
        if not coll.name.lower().endswith(".col"):
            continue
        print(f"COLLECTION {coll.name}: {len(coll.objects)} objects")
        for obj in coll.objects:
            line = f"  {obj.name} type={obj.type} parent={obj.parent.name if obj.parent else None}"
            if obj.type == "MESH":
                up, down = horizontal_counts(obj.data)
                evaluated = obj.evaluated_get(depsgraph)
                mesh = evaluated.to_mesh()
                eup, edown = horizontal_counts(mesh)
                line += (
                    f" polys={len(obj.data.polygons)} stored_up/down={up}/{down}"
                    f" evaluated_polys={len(mesh.polygons)} evaluated_up/down={eup}/{edown}"
                    f" modifiers={[m.type + ':' + m.name for m in obj.modifiers]}"
                    f" dff.type={getattr(getattr(obj, 'dff', None), 'type', None)}"
                    f" mode={obj.mode}"
                )
                evaluated.to_mesh_clear()
            print(line)


def main():
    try:
        import bpy  # noqa: F401
    except ImportError:
        blend_file = os.path.abspath(sys.argv[1])
        exe = "blender"
        for candidate in (r"D:\Blender\blender.exe", "blender"):
            if candidate == "blender" or os.path.exists(candidate):
                exe = candidate
                break
        res = subprocess.run([exe, "-b", blend_file, "--python", os.path.abspath(__file__)])
        sys.exit(res.returncode)
    run_inside_blender()


if __name__ == "__main__":
    main()
