#!/usr/bin/env python3
"""
RenderWare Texture Dictionary (.txd) reader and builder for GTA III / Vice City.
Supports 32-bit (FORMAT_8888) and 8-bit palettized (FORMAT_8888 palette, 256 colors) textures.
"""

import sys
import struct
import argparse
from pathlib import Path
from PIL import Image

RW_VERSION_GTA3 = 0x0C02FFFF  # RenderWare 3.1.0.0 / 3.2.0.0 (GTA III PC)

def make_chunk(chunk_id, data, rw_version=RW_VERSION_GTA3):
    header = struct.pack("<III", chunk_id, len(data), rw_version)
    return header + data

def build_txd_from_image(image_path, texture_name="splash3", output_path="data/txd/splash3.txd", depth=8, target_size=(512, 256)):
    img = Image.open(image_path).convert("RGB")
    
    if target_size:
        img = img.resize(target_size, Image.Resampling.LANCZOS)
    w, h = img.size
    
    platform_id = 0x08          # rwID_PCD3D8 (PC Direct3D 8)
    filter_flags = 0x1102       # Linear filtering
    tex_name_bytes = texture_name.encode("ascii")[:31].ljust(32, b"\x00")
    mask_name_bytes = b"\x00" + b"\xff" * 31
    num_mipmaps = 1
    raster_type = 4             # rwRASTERTYPETEXTURE
    dxt_compression = 0

    if depth == 8:
        # Palettized 8-bit (GTA III startup splash screen requirement)
        pal_img = img.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
        raw_pal = pal_img.getpalette() # 768 bytes (R, G, B)
        rgba_palette = bytearray()
        for i in range(256):
            rgba_palette.extend([raw_pal[i*3], raw_pal[i*3+1], raw_pal[i*3+2], 255])
            
        pixel_bytes = bytes(pal_img.getdata())
        data_size = len(pixel_bytes)
        
        raster_format = 0x2600  # PAL8 with RGBA palette
        d3d_format = 0
        
        native_header = struct.pack(
            "<II32s32sIIHHBBBB",
            platform_id,
            filter_flags,
            tex_name_bytes,
            mask_name_bytes,
            raster_format,
            d3d_format,
            w,
            h,
            8,
            num_mipmaps,
            raster_type,
            dxt_compression
        )
        
        # In 8-bit mode: header (84 bytes) + palette (1024 bytes) + data_size (4 bytes) + pixel indices
        native_data_payload = native_header + bytes(rgba_palette) + struct.pack("<I", data_size) + pixel_bytes

    else:
        # 32-bit RGBA (BGRA pixel order)
        rgba_img = img.convert("RGBA")
        r, g, b, a = rgba_img.split()
        bgra_img = Image.merge("RGBA", (b, g, r, a))
        pixel_bytes = bgra_img.tobytes()
        data_size = len(pixel_bytes)
        
        raster_format = 0x2500  # FORMAT_8888 (32-bit RGBA)
        d3d_format = 21         # D3DFMT_A8R8G8B8
        
        native_header = struct.pack(
            "<II32s32sIIHHBBBB",
            platform_id,
            filter_flags,
            tex_name_bytes,
            mask_name_bytes,
            raster_format,
            d3d_format,
            w,
            h,
            32,
            num_mipmaps,
            raster_type,
            dxt_compression
        )
        native_data_payload = native_header + struct.pack("<I", data_size) + pixel_bytes

    native_struct_chunk = make_chunk(0x01, native_data_payload)
    native_ext_chunk = make_chunk(0x03, b"")
    
    # Texture Native Container (0x15)
    texture_chunk = make_chunk(0x15, native_struct_chunk + native_ext_chunk)
    
    # TXD Info Header (0x01 inside 0x16)
    info_payload = struct.pack("<HH", 1, 0)
    info_chunk = make_chunk(0x01, info_payload)
    
    # Root TXD Container (0x16)
    root_ext_chunk = make_chunk(0x03, b"")
    root_payload = info_chunk + texture_chunk + root_ext_chunk
    txd_bytes = make_chunk(0x16, root_payload)
    
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(txd_bytes)
        
    print(f"Successfully created TXD: {output_path} ({w}x{h} @ {depth}bpp, {len(txd_bytes)} bytes)")
    return output_path

def read_txd_info(txd_path):
    with open(txd_path, "rb") as f:
        data = f.read()

    pos = 0
    chunk_id, chunk_size, rw_ver = struct.unpack_from("<III", data, pos)
    pos += 12
    if chunk_id != 0x16:
        raise ValueError(f"Invalid TXD magic: 0x{chunk_id:X}")

    sub_id, sub_size, _ = struct.unpack_from("<III", data, pos)
    pos += 12
    count, = struct.unpack_from("<H", data, pos)
    pos += sub_size
    
    textures = []
    for _ in range(count):
        pos += 12 # skip 0x15 header
        pos += 12 # skip 0x01 header
        platform_id, filter_flags, name, mask, raster_fmt, d3d_fmt, w, h, depth, mips, r_type, dxt = struct.unpack_from(
            "<II32s32sIIHHBBBB", data, pos
        )
        pos += 84
        if depth == 8:
            pos += 1024 # skip palette
        data_len, = struct.unpack_from("<I", data, pos)
        pos += 4 + data_len
        pos += 12 # skip 0x03 extension
        
        name_str = name.split(b"\x00")[0].decode("latin-1")
        textures.append({
            "name": name_str,
            "width": w,
            "height": h,
            "depth": depth,
            "raster_format": raster_fmt
        })
    return textures

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RenderWare TXD Tool")
    parser.add_argument("--build", nargs=3, metavar=("IMAGE", "NAME", "OUTPUT"), help="Build TXD from image")
    parser.add_argument("--depth", type=int, default=8, choices=[8, 32], help="Texture bit depth (8 for splash, 32 for models)")
    parser.add_argument("--size", nargs=2, type=int, metavar=("W", "H"), default=[512, 256], help="Target texture resolution")
    parser.add_argument("--info", metavar="TXD_FILE", help="Display TXD contents")
    args = parser.parse_args()
    
    if args.build:
        target_size = tuple(args.size) if args.size else None
        build_txd_from_image(args.build[0], args.build[1], args.build[2], depth=args.depth, target_size=target_size)
    elif args.info:
        texs = read_txd_info(args.info)
        print(f"Found {len(texs)} texture(s):")
        for t in texs:
            print(f"  - {t['name']}: {t['width']}x{t['height']} @ {t['depth']}bpp (format: 0x{t['raster_format']:X})")
    else:
        parser.print_help()
