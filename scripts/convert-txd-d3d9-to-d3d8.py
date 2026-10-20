#!/usr/bin/env python3
"""
Convert a RenderWare TXD from Direct3D 9 (platform 9, SA/VC PC) to Direct3D 8
(platform 8, GTA III PC). GTA III cannot stream a platform 9 TXD, which leaves
any model that depends on it unloaded (invisible).

Usage: convert-txd-d3d9-to-d3d8.py <input.txd> <output.txd>
"""

import struct
import sys

RW_VERSION_GTA3 = 0x320  # Library stamp used by stock GTA III TXDs
HEADER_FMT = "<II32s32sIIHHBBBB"
HEADER_SIZE = struct.calcsize(HEADER_FMT)  # 88

FORMAT_8888 = 0x0500
FORMAT_888 = 0x0600
FORMAT_MASK = 0x0F00


def chunk(chunk_id, payload):
    return struct.pack("<III", chunk_id, len(payload), RW_VERSION_GTA3) + payload


def convert_texture(native):
    (plat, filt, name, mask, rfmt, d3dfmt, w, h, depth, mips, rtype,
     flags) = struct.unpack_from(HEADER_FMT, native, 0)
    if plat != 9:
        raise ValueError(f"expected platform 9, found {plat}")
    compressed = bool(flags & 0x08)
    body = native[HEADER_SIZE:]

    if compressed:
        if d3dfmt != 0x31545844:  # 'DXT1'
            raise ValueError(f"{name!r}: only DXT1 is handled, d3d=0x{d3dfmt:x}")
        has_alpha = 0
        compression = 1
    else:
        if depth != 32 or (rfmt & FORMAT_MASK) != FORMAT_8888:
            raise ValueError(f"{name!r}: unsupported raster 0x{rfmt:x} depth {depth}")
        # Pixels are BGRA with a size prefix per mip; opaque when every alpha is 255
        pos, opaque = 0, True
        for _ in range(mips):
            size, = struct.unpack_from("<I", body, pos)
            px = body[pos + 4:pos + 4 + size]
            if any(a != 255 for a in px[3::4]):
                opaque = False
            pos += 4 + size
        has_alpha = 0 if opaque else 1
        compression = 0
        rfmt = (rfmt & ~FORMAT_MASK) | (FORMAT_888 if opaque else FORMAT_8888)

    header = struct.pack(HEADER_FMT, 8, filt, name, mask, rfmt, has_alpha, w, h,
                         depth, mips, rtype, compression)
    return header + body


def convert(data):
    pos = 12
    _, info_size, _ = struct.unpack_from("<III", data, pos)
    count, = struct.unpack_from("<H", data, pos + 12)
    pos += 12 + info_size

    textures = []
    for _ in range(count):
        _, size, _ = struct.unpack_from("<III", data, pos)
        tex_end = pos + 12 + size
        _, struct_size, _ = struct.unpack_from("<III", data, pos + 12)
        native = data[pos + 24:pos + 24 + struct_size]
        textures.append(chunk(0x15, chunk(0x01, convert_texture(native)) + chunk(0x03, b"")))
        pos = tex_end

    info = chunk(0x01, struct.pack("<HH", count, 0))
    return chunk(0x16, info + b"".join(textures) + chunk(0x03, b""))


if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    with open(src, "rb") as f:
        out = convert(f.read())
    with open(dst, "wb") as f:
        f.write(out)
    print(f"Wrote {dst} ({len(out)} bytes)")
