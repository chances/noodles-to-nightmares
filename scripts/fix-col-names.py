from pathlib import Path

def set_col_name(file_path: Path, new_name: str):
    data = bytearray(file_path.read_bytes())
    if data[:4] != b'COLL':
        print(f"Skipping {file_path}: Not a COLL archive")
        return
    name_bytes = new_name.encode('ascii')[:21] + b'\x00'
    name_bytes = name_bytes.ljust(22, b'\x00')
    data[8:30] = name_bytes
    file_path.write_bytes(data)
    print(f"Updated {file_path} model name to '{new_name}'")

# Fix rosa_apartment.col
for p in [
    Path("models/Rosa's Apartment/rosa_apartment.col"),
    Path("data/maps/noodles/col/rosa_apartment.col")
]:
    if p.exists():
        set_col_name(p, "rosa_apartment")

# Fix dinerind.col
diner_col = Path("models/Punk Noodles/dinerind.col")
if diner_col.exists():
    set_col_name(diner_col, "dinerind")
    # Also save to data/maps/noodles/col/dinerind.col
    data_diner_col = Path("data/maps/noodles/col/dinerind.col")
    data_diner_col.parent.mkdir(parents=True, exist_ok=True)
    data_diner_col.write_bytes(diner_col.read_bytes())
    print(f"Synced {data_diner_col}")
