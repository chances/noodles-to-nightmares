#!/usr/bin/env python3
"""
export-blend-models.py

Exports DFF and COL assets from a given Blender document based on root-level
collections named '*.dff' and '*.col'.

Rules:
- For DFF collections: merge all render-enabled subitems (hide_render == False)
  into a singular atomic mesh with applied world transformations.
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

        temp_coll = None
        merged_obj = None

        try:
            # Synchronize texture node labels to prevent .txd prefix truncation by DragonFF
            for mat in bpy.data.materials:
                if mat.use_nodes:
                    for n in mat.node_tree.nodes:
                        if n.type == 'TEX_IMAGE' and n.image:
                            if not n.label or "/" in n.label:
                                parts = n.image.name.split("/")
                                tex_clean = parts[-2] if len(parts) >= 2 else parts[0].split(".")[0]
                                n.label = tex_clean

            render_meshes = [obj for obj in c.objects if obj.type == 'MESH' and not obj.hide_render]
            if not render_meshes:
                print(f"  [-] No render-enabled mesh elements in {c.name}, skipping.")
                continue

            # Disable DFF export flag on all existing scene objects
            for obj in bpy.data.objects:
                if hasattr(obj, "dff"):
                    obj.dff.type = 'NON'

            # Create temporary export collection
            temp_coll = bpy.data.collections.new(f"temp_export_{c.name}")
            bpy.context.scene.collection.children.link(temp_coll)

            # Duplicate render meshes into temporary collection and apply world transforms
            dups = []
            for obj in render_meshes:
                new_obj = obj.copy()
                new_obj.data = obj.data.copy()
                temp_coll.objects.link(new_obj)
                dups.append(new_obj)

            bpy.ops.object.select_all(action='DESELECT')
            for d in dups:
                d.select_set(True)
            bpy.context.view_layer.objects.active = dups[0]

            for d in dups:
                d.data.transform(d.matrix_world)
                d.matrix_world.identity()

            if len(dups) > 1:
                bpy.ops.object.join()
            merged_obj = bpy.context.view_layer.objects.active

            # Determine unified frame name (prefer existing _l0 name if present)
            l0_match = next((obj.name for obj in render_meshes if "_l0" in obj.name.lower()), None)
            base_name = c.name.rsplit(".", 1)[0]
            merged_obj.name = l0_match if l0_match else f"{base_name}_l0"

            merged_obj.dff.type = 'OBJ'
            merged_obj.dff.pipeline = 'NONE'
            merged_obj.dff.night_cols = False

            options = {
                'file_name': out_path,
                'directory': output_dir,
                'selected': False,
                'export_frame_names': True,
                'exclude_geo_faces': False,
                'mass_export': False,
                'preserve_positions': True,
                'preserve_rotations': True,
                'version': 0x32000,  # GTA 3 (v3.2.0.0 / 0x0800FFFF matching vanilla GTA III models)
                'export_coll': False,
                'coll_ext_type': '39056122',
                'apply_coll_trans': False,
                'from_outliner': False
            }

            dff_exporter.collection = temp_coll
            dff_exporter.from_outliner = False
            dff_exporter.export_dff(options)
            print(f"  [+] Exported DFF (merged singular atomic): {out_path} ({os.path.getsize(out_path)} bytes)")

        finally:
            if merged_obj:
                mesh_data = merged_obj.data
                bpy.data.objects.remove(merged_obj, do_unlink=True)
                if mesh_data:
                    bpy.data.meshes.remove(mesh_data, do_unlink=True)
            if temp_coll:
                if temp_coll.name in bpy.context.scene.collection.children:
                    bpy.context.scene.collection.children.unlink(temp_coll)
                bpy.data.collections.remove(temp_coll)

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
