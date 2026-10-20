"""
check-col-normals.py

Reports the horizontal (|nz| > 0.99) triangles of one or more COL v1 files by
z height and by the sign of (b-a)x(c-a). GTA III collision triangles are
one-sided. Stock floors and roofs report "DOWN" under this formula, so a floor
that reports "UP" is wound opposite to stock and the player falls through it.

Usage: python scripts/check-col-normals.py <file.col> [more.col ...]
"""

import struct, sys, collections

def walk(path):
    d = open(path, 'rb').read()
    p = 32 + 40
    ns, = struct.unpack_from('<I', d, p); p += 4 + ns * 20
    nl, = struct.unpack_from('<I', d, p); p += 4 + nl * 24
    nb, = struct.unpack_from('<I', d, p); p += 4 + nb * 28
    nv, = struct.unpack_from('<I', d, p); vp = p + 4; p += 4 + nv * 12
    nf, = struct.unpack_from('<I', d, p); fp = p + 4
    V = [struct.unpack_from('<3f', d, vp + i * 12) for i in range(nv)]
    up = collections.Counter()
    down = collections.Counter()
    area_up = area_down = 0.0
    for i in range(nf):
        a, b, c = struct.unpack_from('<3I', d, fp + i * 16)
        A, B, C = V[a], V[b], V[c]
        u = [B[k] - A[k] for k in range(3)]
        v = [C[k] - A[k] for k in range(3)]
        n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
        L = sum(x * x for x in n) ** 0.5
        if L < 1e-9:
            continue
        nz = n[2] / L
        if abs(nz) > 0.99:
            z = round(A[2], 2)
            if nz > 0:
                up[z] += 1
                area_up += L / 2
            else:
                down[z] += 1
                area_down += L / 2
    print(path.split('/')[-1], 'faces', nf)
    print('  horizontal faces facing UP by z:', dict(sorted(up.items())), 'area %.1f' % area_up)
    print('  horizontal faces facing DOWN by z:', dict(sorted(down.items())), 'area %.1f' % area_down)

for p in sys.argv[1:]:
    walk(p)
