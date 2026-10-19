#!/usr/bin/env python3
"""
export-blend-models.py

Exports DFF and COL assets from a given Blender document based on root-level
collections named '*.dff' and '*.col'.

Rules:
- For DFF collections: only export subitems enabled in renders (hide_render == False).
- For COL collections: export all elements to col files normally, ignoring visibility flags.
"""

import os
import sys

def run_inside_blender(blend_path: str, output_dir: str):
    import bpy
    try:
        from bl_ext.blender_org.dragonff.ops import dff_exporter, col_exporter
    except ImportError:
        try:
            from dragonff.ops import dff_exporter, col_exporter
        except ImportError:
            print("Error: DragonFF addon is not loaded in Blender.", file=sys.stderr)
            sys.exit(1)

    if not output_dir:
        output_dir = os.path.dirname(bpy.data.filepath) if bpy.data.filepath else os.getcwd()
    os.makedirs(output_dir, exist_ok=True)

    root_collections = bpy.context.scene.collection.children

    # 1. Process DFF collections
    dff_collections = [c for c in root_collections if c.name.lower().endswith(".dff")]
    for c in dff_collections:
        print(f"[*] Processing DFF collection: {c.name}")
        out_path = os.path.join(output_dir, c.name)

        # Cache original properties
        prev_props = {}
        for obj in bpy.data.objects:
            if hasattr(obj, "dff"):
                prev_props[obj] = (obj.dff.type, getattr(obj.dff, "pipeline", None), getattr(obj.dff, "night_cols", None))

        try:
            # Only export subitems in this collection that are enabled in renders
            for obj in bpy.data.objects:
                if hasattr(obj, "dff"):
                    obj.dff.type = 'NON'

            valid_count = 0
            for obj in c.objects:
                if obj.type == 'MESH' and not obj.hide_render:
                    obj.dff.type = 'OBJ'
                    obj.dff.pipeline = 'NONE'
                    obj.dff.night_cols = False
                    valid_count += 1
                else:
                    obj.dff.type = 'NON'

            if valid_count == 0:
                print(f"  [-] No render-enabled mesh elements in {c.name}, skipping.")
                continue

            options = {
                'file_name': out_path,
                'directory': output_dir,
                'selected': False,
                'export_frame_names': True,
                'exclude_geo_faces': False,
                'mass_export': False,
                'preserve_positions': True,
                'preserve_rotations': True,
                'version': 0x33002,  # GTA 3 (v3.3.0.2)
                'export_coll': False,
                'coll_ext_type': '39056122',
                'apply_coll_trans': False,
                'from_outliner': False
            }

            dff_exporter.collection = c
            dff_exporter.from_outliner = False
            dff_exporter.export_dff(options)
            print(f"  [+] Exported DFF: {out_path} ({os.path.getsize(out_path)} bytes)")

        finally:
            for obj, (dtype, pipe, night) in prev_props.items():
                obj.dff.type = dtype
                if pipe is not None:
                    obj.dff.pipeline = pipe
                if night is not None:
                    obj.dff.night_cols = night

    # 2. Process COL collections
    col_collections = [c for c in root_collections if c.name.lower().endswith(".col")]
    for c in col_collections:
        print(f"[*] Processing COL collection: {c.name}")
        out_path = os.path.join(output_dir, c.name)

        prev_types = {}
        for obj in bpy.data.objects:
            if hasattr(obj, "dff"):
                prev_types[obj] = obj.dff.type

        try:
            for obj in bpy.data.objects:
                if hasattr(obj, "dff"):
                    obj.dff.type = 'NON'

            # Export all elements normally, ignoring blender visibility flags
            valid_count = 0
            for obj in c.objects:
                if obj.type == 'MESH':
                    obj.dff.type = 'COL'
                    valid_count += 1

            if valid_count == 0:
                print(f"  [-] No mesh elements in {c.name}, skipping.")
                continue

            options = {
                'file_name': out_path,
                'version': 1,  # GTA 3 / VC COLL format
                'collection': c,
                'apply_transformations': True,
                'only_selected': False
            }

            col_exporter.export_col(options)
            print(f"  [+] Exported COL: {out_path} ({os.path.getsize(out_path)} bytes)")

        finally:
            for obj, dtype in prev_types.items():
                obj.dff.type = dtype


def find_blender() -> str:
    candidates = [
        r"D:\Blender\blender.exe",
        r"C:\Program Files\Blender Foundation\Blender 5.1\blender.exe",
        r"C:\Program Files\Blender Foundation\Blender 4.2\blender.exe",
        r"C:\Program Files\Blender Foundation\Blender 4.0\blender.exe",
        "blender"
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return "blender"


def main():
    # If running inside Blender's python runtime
    try:
        import bpy
        is_blender = True
    except ImportError:
        is_blender = False

    if is_blender:
        # Check CLI arguments after '--'
        argv = sys.argv
        args = []
        if "--" in argv:
            args = argv[argv.index("--") + 1:]

        output_dir = args[0] if len(args) > 0 else ""
        run_inside_blender(bpy.data.filepath, output_dir)
        return

    # Running outside Blender CLI
    if len(sys.argv) < 2:
        print("Usage: python export-blend-models.py <path-to-blend-file> [output-dir]")
        sys.exit(1)

    blend_file = os.path.abspath(sys.argv[1])
    if not os.path.exists(blend_file):
        print(f"Error: File not found: {blend_file}", file=sys.stderr)
        sys.exit(1)

    out_dir = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else os.path.dirname(blend_file)
    blender_exe = find_blender()

    script_path = os.path.abspath(__file__)
    import subprocess
    cmd = [
        blender_exe,
        "-b", blend_file,
        "--python", script_path,
        "--", out_dir
    ]
    print(f"Running Blender: {' '.join(cmd)}")
    res = subprocess.run(cmd)
    sys.exit(res.returncode)


if __name__ == "__main__":
    main()
