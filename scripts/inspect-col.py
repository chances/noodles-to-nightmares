import glob
import struct

def inspect_col(path):
    with open(path, "rb") as f:
        data = f.read()
    magic = data[:4]
    size, = struct.unpack_from("<I", data, 4)
    model_name = data[8:30].split(b"\x00")[0].decode("ascii", errors="ignore")
    print(f"{path}: magic={magic}, model_name='{model_name}', size={size}")

for p in glob.glob("data/maps/noodles/col/*.col"):
    inspect_col(p)
