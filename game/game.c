/* game.c - THE ONLY FILE KAI EDITS (for now).
 *
 * "Pumpkin Catch" - a starter game so the pipeline has something real to run.
 * Move the basket with LEFT/RIGHT, catch falling pumpkins, miss 3 and it's over.
 * Kai: change the numbers, change the colors, change the rules. Break it on purpose.
 */
#include "engine.h"

int g_score;
int g_lives;
int g_over;

#define MAX_DROPS 4

static int basket_x;
static struct { int x, y, speed, alive; } drop[MAX_DROPS];
static int frame;

static void spawn(int i) {
  drop[i].x = 10 + rnd(SCR_W - 40);
  drop[i].y = -rnd(120);
  drop[i].speed = 2 + rnd(3);
  drop[i].alive = 1;
}

void game_init(void) {
  g_score = 0;
  g_lives = 3;
  g_over = 0;
  frame = 0;
  basket_x = SCR_W / 2 - 20;
  for (int i = 0; i < MAX_DROPS; i++) spawn(i);
}

void game_frame(void) {
  frame++;

  if (g_over) {
    clear(BLACK);
    text(SCR_W / 2 - 60, 90, "GAME OVER", RED, 3);
    char buf[32];
    buf[0] = 'S'; buf[1] = 'C'; buf[2] = 'O'; buf[3] = 'R'; buf[4] = 'E'; buf[5] = ' ';
    int n = g_score, p = 6;
    if (n == 0) buf[p++] = '0';
    char tmp[8]; int t = 0;
    while (n > 0) { tmp[t++] = '0' + n % 10; n /= 10; }
    while (t > 0) buf[p++] = tmp[--t];
    buf[p] = 0;
    text(SCR_W / 2 - 50, 140, buf, WHITE, 2);
    if (btn_pressed(BTN_A)) game_init();
    return;
  }

  /* ---- move ---- */
  if (btn(BTN_LEFT))  basket_x -= 5;
  if (btn(BTN_RIGHT)) basket_x += 5;
  if (basket_x < 0) basket_x = 0;
  if (basket_x > SCR_W - 40) basket_x = SCR_W - 40;

  for (int i = 0; i < MAX_DROPS; i++) {
    if (!drop[i].alive) continue;
    drop[i].y += drop[i].speed;

    int caught = drop[i].y + 12 >= SCR_H - 24 && drop[i].y < SCR_H - 8 &&
                 drop[i].x + 12 > basket_x && drop[i].x < basket_x + 40;
    if (caught) {
      g_score++;
      beep(900, 40);
      spawn(i);
    } else if (drop[i].y > SCR_H) {
      g_lives--;
      beep(200, 120);
      if (g_lives <= 0) g_over = 1;
      spawn(i);
    }
  }

  /* ---- draw ---- */
  clear(RGB(20, 20, 40));
  for (int i = 0; i < MAX_DROPS; i++)
    if (drop[i].alive) rect(drop[i].x, drop[i].y, 12, 12, ORANGE);
  rect(basket_x, SCR_H - 24, 40, 12, GREEN);
  rect(0, 0, SCR_W, 16, BLACK);
  text(4, 4, "SCORE", WHITE, 1);
  for (int i = 0; i < g_score && i < 24; i++) rect(46 + i * 5, 6, 3, 6, YELLOW);
  for (int i = 0; i < g_lives; i++) rect(SCR_W - 14 - i * 10, 5, 7, 7, RED);
}
