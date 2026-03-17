import struct
width = 16
height = 16
icon_header = struct.pack('<HHH', 0, 1, 1)
biSize = 40
biWidth = width
biHeight = height * 2
biPlanes = 1
biBitCount = 32
biCompression = 0
biSizeImage = 0
biXPelsPerMeter = 0
biYPelsPerMeter = 0
biClrUsed = 0
biClrImportant = 0
bitmap_header = struct.pack('<IIIHHIIIIII', biSize, biWidth, biHeight, biPlanes, biBitCount, biCompression, biSizeImage, biXPelsPerMeter, biYPelsPerMeter, biClrUsed, biClrImportant)
row = bytes([0, 0, 255, 255]) * width
pixel_data = b''.join([row for _ in range(height)])
mask_row = b'\x00' * 4
mask_data = mask_row * height
image_data = bitmap_header + pixel_data + mask_data
image_size = len(image_data)
entry = struct.pack('<BBBBHHII', width if width < 256 else 0, height if height < 256 else 0, 0, 0, biPlanes, biBitCount, image_size, 6 + 16)
with open('public/favicon.ico', 'wb') as f:
    f.write(icon_header)
    f.write(entry)
    f.write(image_data)
