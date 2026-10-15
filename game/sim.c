/* sim.c - the PC backend. Runs the SAME game.c headlessly so Bugsy can test a game
 * before it ever touches the ESP32: scripted button presses, deterministic rnd(),
 * frames dumped as .ppm, and a JSON summary on stdout to assert against.
 *
 *   gcc -O2 -o sim.exe sim.c game.c
 *   ./sim.exe --frames 200 --script "40R,60L,100." --shots 1,80,200 --out frames
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "engine.h"

static color_t fb[SCR_W * SCR_H];
static int held, prev_held;
static unsigned long seed = 12345;   /* fixed => every run is reproducible */

/* --- 3x5 font: digits, A-Z, space . - ! --- */
static const unsigned char FONT[40][5] = {
  {7,5,5,5,7},{2,6,2,2,7},{7,1,7,4,7},{7,1,7,1,7},{5,5,7,1,1},  /* 0-4 */
  {7,4,7,1,7},{7,4,7,5,7},{7,1,2,2,2},{7,5,7,5,7},{7,5,7,1,7},  /* 5-9 */
  {2,5,7,5,5},{6,5,6,5,6},{3,4,4,4,3},{6,5,5,5,6},{7,4,6,4,7},  /* A-E */
  {7,4,6,4,4},{3,4,5,5,3},{5,5,7,5,5},{7,2,2,2,7},{1,1,1,5,2},  /* F-J */
  {5,5,6,5,5},{4,4,4,4,7},{5,7,7,5,5},{5,7,5,5,5},{2,5,5,5,2},  /* K-O */
  {6,5,6,4,4},{2,5,5,7,3},{6,5,6,5,5},{3,4,2,1,6},{7,2,2,2,2},  /* P-T */
  {5,5,5,5,7},{5,5,5,5,2},{5,5,7,7,5},{5,5,2,5,5},{5,5,2,2,2},  /* U-Y */
  {7,1,2,4,7},{0,0,0,0,0},{0,0,0,0,2},{0,0,7,0,0},{2,2,2,0,2},  /* Z space . - ! */
};
static int glyph(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'A' && c <= 'Z') return 10 + (c - 'A');
  if (c >= 'a' && c <= 'z') return 10 + (c - 'a');
  if (c == ' ') return 36;
  if (c == '.') return 37;
  if (c == '-') return 38;
  if (c == '!') return 39;
  return 36;
}

void clear(color_t c) { for (int i = 0; i < SCR_W * SCR_H; i++) fb[i] = c; }

void rect(int x, int y, int w, int h, color_t c) {
  for (int yy = y; yy < y + h; yy++) {
    if (yy < 0 || yy >= SCR_H) continue;
    for (int xx = x; xx < x + w; xx++) {
      if (xx < 0 || xx >= SCR_W) continue;
      fb[yy * SCR_W + xx] = c;
    }
  }
}

void text(int x, int y, const char *s, color_t c, int scale) {
  if (scale < 1) scale = 1;
  for (const char *p = s; *p; p++) {
    int g = glyph(*p);
    for (int row = 0; row < 5; row++)
      for (int col = 0; col < 3; col++)
        if (FONT[g][row] & (4 >> col))
          rect(x + col * scale, y + row * scale, scale, scale, c);
    x += 4 * scale;
  }
}

int btn(int mask) { return (held & mask) ? 1 : 0; }
int btn_pressed(int mask) { return ((held & mask) && !(prev_held & mask)) ? 1 : 0; }
int rnd(int n) { seed = seed * 1103515245 + 12345; return n <= 0 ? 0 : (int)((seed >> 16) % (unsigned)n); }
void beep(int hz, int ms) { (void)hz; (void)ms; }

/* --- input script: "40R,60L,20AB,100." = 40 frames right, 60 left, 20 A+B, 100 idle --- */
#define MAX_STEPS 64
static struct { int frames, mask; } steps[MAX_STEPS];
static int nsteps;

static void parse_script(const char *s) {
  while (*s && nsteps < MAX_STEPS) {
    int n = 0;
    while (*s >= '0' && *s <= '9') n = n * 10 + (*s++ - '0');
    int mask = 0;
    while (*s && *s != ',') {
      switch (*s) {
        case 'L': mask |= BTN_LEFT; break;
        case 'R': mask |= BTN_RIGHT; break;
        case 'U': mask |= BTN_UP; break;
        case 'D': mask |= BTN_DOWN; break;
        case 'A': mask |= BTN_A; break;
        case 'B': mask |= BTN_B; break;
        default: break;
      }
      s++;
    }
    steps[nsteps].frames = n > 0 ? n : 1;
    steps[nsteps].mask = mask;
    nsteps++;
    if (*s == ',') s++;
  }
}

static void dump_ppm(const char *dir, int f) {
  char path[256];
  snprintf(path, sizeof path, "%s/frame-%04d.ppm", dir, f);
  FILE *fp = fopen(path, "wb");
  if (!fp) { fprintf(stderr, "sim: cannot write %s\n", path); return; }
  fprintf(fp, "P6\n%d %d\n255\n", SCR_W, SCR_H);
  for (int i = 0; i < SCR_W * SCR_H; i++) {
    color_t c = fb[i];
    unsigned char rgb[3] = { (c >> 11) << 3, ((c >> 5) & 0x3F) << 2, (c & 0x1F) << 3 };
    fwrite(rgb, 1, 3, fp);
  }
  fclose(fp);
}

int main(int argc, char **argv) {
  int frames = 200, nshots = 0, shots[16];
  const char *out = ".";
  for (int i = 1; i < argc; i++) {
    if (!strcmp(argv[i], "--frames") && i + 1 < argc) frames = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--script") && i + 1 < argc) parse_script(argv[++i]);
    else if (!strcmp(argv[i], "--out") && i + 1 < argc) out = argv[++i];
    else if (!strcmp(argv[i], "--seed") && i + 1 < argc) seed = (unsigned long)atoi(argv[++i]);
    else if (!strcmp(argv[i], "--shots") && i + 1 < argc) {
      char *p = argv[++i];
      while (*p && nshots < 16) { shots[nshots++] = atoi(p); while (*p && *p != ',') p++; if (*p == ',') p++; }
    }
  }

  game_init();
  int step = 0, in_step = 0, best = 0;
  for (int f = 1; f <= frames; f++) {
    prev_held = held;
    held = 0;
    if (nsteps) {
      if (in_step >= steps[step].frames && step + 1 < nsteps) { step++; in_step = 0; }
      held = steps[step].mask;
      in_step++;
    }
    game_frame();
    if (g_score > best) best = g_score;
    for (int s = 0; s < nshots; s++) if (shots[s] == f) dump_ppm(out, f);
  }

  printf("{\"frames\":%d,\"score\":%d,\"best\":%d,\"lives\":%d,\"over\":%d}\n",
         frames, g_score, best, g_lives, g_over);
  return 0;
}
