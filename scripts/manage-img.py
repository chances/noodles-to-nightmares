#!/usr/bin/env python3
"""
GTA III / Vice City IMG Archive (v1 DIR+IMG and v2 VER2) reader, extractor, and writer.
"""

import sys
import struct
import argparse
from pathlib import Path

SECTOR_SIZE = 2048

def read_img_v1_dir(dir_path):
    entries = []
    with open(dir_path, "rb") as f:
        data = f.read()
    num_entries = len(data) // 32
    for i in range(num_entries):
        offset_sectors, size_sectors, name = struct.unpack_from("<II24s", data, i * 32)
        name_str = name.split(b"\x00")[0].decode("latin-1")
        entries.append({
            "name": name_str,
            "offset": offset_sectors * SECTOR_SIZE,
            "size": size_sectors * SECTOR_SIZE
        })
    return entries

def read_img_v2(img_path):
    entries = []
    with open(img_path, "rb") as f:
        magic, count = struct.unpack("<4sI", f.read(8))
        if magic != b"VER2":
            raise ValueError("Not a valid IMG v2 archive")
        for _ in range(count):
            offset_sectors, size_sectors, name = struct.unpack("<II24s", f.read(32))
            name_str = name.split(b"\x00")[0].decode("latin-1")
            entries.append({
                "name": name_str,
                "offset": offset_sectors * SECTOR_SIZE,
                "size": size_sectors * SECTOR_SIZE
            })
    return entries

def list_archive(archive_path):
    p = Path(archive_path)
    if p.suffix.lower() == ".dir":
        entries = read_img_v1_dir(p)
    else:
        with open(p, "rb") as f:
            magic = f.read(4)
        if magic == b"VER2":
            entries = read_img_v2(p)
        else:
            dir_path = p.with_suffix(".dir")
            if dir_path.exists():
                entries = read_img_v1_dir(dir_path)
            else:
                raise FileNotFoundError(f"DIR file not found for IMG v1: {dir_path}")
    return entries

def extract_file(archive_path, entry_name, output_file):
    entries = list_archive(archive_path)
    img_path = Path(archive_path).with_suffix(".img") if Path(archive_path).suffix.lower() == ".dir" else Path(archive_path)
    for e in entries:
        if e["name"].lower() == entry_name.lower():
            with open(img_path, "rb") as f:
                f.seek(e["offset"])
                data = f.read(e["size"])
            with open(output_file, "wb") as out:
                out.write(data)
            print(f"Extracted {e['name']} ({e['size']} bytes) to {output_file}")
            return
    raise KeyError(f"Entry {entry_name} not found in archive")

def replace_file_v1(dir_path, img_path, file_to_replace, new_file_path):
    entries = read_img_v1_dir(dir_path)
    with open(new_file_path, "rb") as nf:
        new_data = nf.read()
    new_size_sectors = (len(new_data) + SECTOR_SIZE - 1) // SECTOR_SIZE
    padded_data = new_data.ljust(new_size_sectors * SECTOR_SIZE, b"\x00")
    
    found = False
    for e in entries:
        if e["name"].lower() == file_to_replace.lower():
            found = True
            break
            
    with open(img_path, "r+b") as img_f:
        if found and (e["size"] // SECTOR_SIZE) >= new_size_sectors:
            img_f.seek(e["offset"])
            img_f.write(padded_data)
        else:
            img_f.seek(0, 2)
            new_offset = img_f.tell()
            assert new_offset % SECTOR_SIZE == 0
            img_f.write(padded_data)
            if found:
                e["offset"] = new_offset
                e["size"] = new_size_sectors * SECTOR_SIZE
            else:
                entries.append({
                    "name": file_to_replace,
                    "offset": new_offset,
                    "size": new_size_sectors * SECTOR_SIZE
                })

    with open(dir_path, "wb") as df:
        for e in entries:
            name_bytes = e["name"].encode("latin-1")[:23].ljust(24, b"\x00")
            df.write(struct.pack("<II24s", e["offset"] // SECTOR_SIZE, e["size"] // SECTOR_SIZE, name_bytes))
    print(f"Replaced {file_to_replace} in {img_path} ({len(new_data)} bytes)")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GTA III IMG Archive Tool")
    parser.add_argument("--list", metavar="ARCHIVE", help="List files in .img/.dir")
    parser.add_argument("--extract", nargs=3, metavar=("ARCHIVE", "ENTRY", "OUTFILE"), help="Extract file")
    parser.add_argument("--replace", nargs=4, metavar=("DIR", "IMG", "ENTRY", "NEWFILE"), help="Replace file in IMG v1")
    args = parser.parse_args()
    
    if args.list:
        entries = list_archive(args.list)
        print(f"Archive contains {len(entries)} items:")
        for e in entries[:15]:
            print(f"  {e['name']:<24} {e['size']:>10} bytes (offset: {e['offset']})")
        if len(entries) > 15:
            print(f"  ... and {len(entries) - 15} more entries.")
    elif args.extract:
        extract_file(args.extract[0], args.extract[1], args.extract[2])
    elif args.replace:
        replace_file_v1(args.replace[0], args.replace[1], args.replace[2], args.replace[3])
    else:
        parser.print_help()
