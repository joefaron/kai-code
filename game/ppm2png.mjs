/* ppm2png.mjs - turn the sim's .ppm frames into .png so they can be attached in Slack.
 * Pure node: zlib is built in, so there is no image dependency to install on Joe's box.
 *   node ppm2png.mjs frames/frame-0080.ppm [out.png] [--scale 2]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const args = process.argv.slice(2);
const src = args[0];
const dst = args[1] && !args[1].startsWith('--') ? args[1] : src.replace(/\.ppm$/, '.png');
const si = args.indexOf('--scale');
const scale = si === -1 ? 1 : Math.max(1, Number(args[si + 1]) || 1);

const buf = readFileSync(src);
/* P6 header: magic, width height, maxval - each followed by whitespace */
let pos = 0;
const token = () => {
  while (/\s/.test(String.fromCharCode(buf[pos]))) pos++;
  let s = '';
  while (pos < buf.length && !/\s/.test(String.fromCharCode(buf[pos]))) s += String.fromCharCode(buf[pos++]);
  return s;
};
if (token() !== 'P6') throw new Error('not a P6 ppm');
const w = Number(token()), h = Number(token());
token();            /* maxval */
pos++;              /* single whitespace before the pixel data */
const px = buf.subarray(pos);

const W = w * scale, H = h * scale;
const raw = Buffer.alloc((W * 3 + 1) * H);
let o = 0;
for (let y = 0; y < H; y++) {
  raw[o++] = 0;                                  /* filter: none */
  const sy = (y / scale) | 0;
  for (let x = 0; x < W; x++) {
    const sx = (x / scale) | 0;
    const i = (sy * w + sx) * 3;
    raw[o++] = px[i]; raw[o++] = px[i + 1]; raw[o++] = px[i + 2];
  }
}

const crcTable = [...Array(256)].map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b) => {
  let c = 0xffffffff;
  for (const byte of b) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

writeFileSync(dst, Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]));
console.log(dst);
