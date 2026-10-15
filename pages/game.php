<section class="card">
  <h2>Pumpkin Catch — the starter game</h2>
  <p>This picture is the game running <em>on the PC</em>, not on the console. It's the
  same <code>game.c</code> that will run on the ESP32 — so if it works here, it works there.</p>
  <p><img src="/media/game-sim.png?v=1" alt="game screenshot" style="max-width:100%;border-radius:8px"></p>
</section>

<section class="card">
  <h2>How Kai changes it</h2>
  <ol>
    <li>Say what you want in Slack <code>#kai_code</code> — "make the pumpkins faster", "add a bomb you must dodge".</li>
    <li>Bugsy edits <code>game/game.c</code> (the only file that matters).</li>
    <li><code>bash game/test.sh</code> plays it with fake button presses and checks the rules still hold.</li>
    <li>A new screenshot gets posted back to the thread.</li>
    <li>When it's good, it gets flashed to the console.</li>
  </ol>
  <p>The whole point: nothing broken ever reaches the device.</p>
</section>
