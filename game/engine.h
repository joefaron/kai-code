/* engine.h - the tiny API every Kai game is written against.
 *
 * ONE game file, TWO backends:
 *   sim.c     - runs on the PC, headless, dumps frames as .ppm  (this is how Bugsy tests)
 *   device.ino- runs on the ESP32, pushes the same framebuffer to the TFT
 * The game never talks to hardware, so what passes on the PC is what runs on the device.
 */
#ifndef ENGINE_H
#define ENGINE_H

#include <stdint.h>

#define SCR_W 320
#define SCR_H 240

/* buttons - bit flags, same order on both backends */
#define BTN_LEFT   (1 << 0)
#define BTN_RIGHT  (1 << 1)
#define BTN_UP     (1 << 2)
#define BTN_DOWN   (1 << 3)
#define BTN_A      (1 << 4)
#define BTN_B      (1 << 5)

/* 16-bit RGB565, same format the TFT wants */
typedef uint16_t color_t;
#define RGB(r, g, b) ((color_t)(((r) & 0xF8) << 8 | ((g) & 0xFC) << 3 | (b) >> 3))

#define BLACK   RGB(0, 0, 0)
#define WHITE   RGB(255, 255, 255)
#define ORANGE  RGB(255, 140, 0)
#define GREEN   RGB(60, 200, 90)
#define BLUE    RGB(60, 130, 255)
#define RED     RGB(230, 60, 60)
#define YELLOW  RGB(250, 220, 60)

/* --- provided BY the backend, called by the game --- */
void clear(color_t c);
void rect(int x, int y, int w, int h, color_t c);
void text(int x, int y, const char *s, color_t c, int scale);  /* 5x7 font */
int  btn(int mask);        /* held down right now */
int  btn_pressed(int mask); /* went down THIS frame */
int  rnd(int n);           /* 0..n-1, deterministic in the sim */
void beep(int hz, int ms); /* no-op in the sim */

/* --- provided BY the game, called by the backend --- */
void game_init(void);
void game_frame(void);     /* called ~30x a second: move things, then draw them */

/* the game may set these; the sim asserts on them in tests */
extern int g_score;
extern int g_lives;
extern int g_over;

#endif
