const UI_BOTTOM = 180; // hauteur réservée aux boutons (en px)
const W = 960;
const H = 540;

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: W,
  height: H,
  backgroundColor: "#0b0b0f",
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 1100 }, debug: false } // mets true si tu veux revoir les cadres verts
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: { preload, create, update }
};

new Phaser.Game(config);

let player, platforms, spikes, stars, goal;
let cursors;
let touch = { left:false, right:false, jump:false };
let collected = 0;
let uiText, popupText;

function preload() {
  this.load.image("playerImg", "player.png");
}

function create() {
  // --- textures générées (pas besoin d'assets) ---
  makeTextureRect(this, "plat", 180, 28, 0x1f2937);
  makeTextureTri(this, "spike", 36, 26, 0xef4444);
  makeTextureCircle(this, "star", 16, 0xfbbf24);
  makeTextureRect(this, "goal", 40, 70, 0x60a5fa);

  // --- monde ---
  platforms = this.physics.add.staticGroup();

  // sol + plateformes (1 seul niveau)
  platforms.create(480, 520, "plat").setScale(6, 1).refreshBody();

  platforms.create(220, 430, "plat");
  platforms.create(520, 360, "plat");
  platforms.create(820, 300, "plat");
  platforms.create(700, 210, "plat");
  platforms.create(360, 210, "plat");

  // spikes
  spikes = this.physics.add.staticGroup();
  spikes.create(410, 506, "spike");
  spikes.create(446, 506, "spike");
  spikes.create(482, 506, "spike");
  spikes.create(600, 506, "spike");
  spikes.create(636, 506, "spike");

  // ✅ player (UNE seule création, avec l'image)
  player = this.physics.add.sprite(100, 450, "playerImg");
  player.setCollideWorldBounds(true);
  player.setBounce(0.05);

  // taille visuelle
  player.setOrigin(0.5, 0.5);
  player.setScale(0.4);

  // ✅ body synchronisé avec la taille affichée (évite l'effet "décroché")
  player.body.setSize(player.displayWidth, player.displayHeight, true);

  // (optionnel) hitbox plus petite + centrée si tu veux un feeling plus "pro"
  // player.body.setSize(player.displayWidth * 0.55, player.displayHeight * 0.75, false);
  // player.body.setOffset(player.displayWidth * 0.225, player.displayHeight * 0.25);
  player.body.setOffset(
    (player.width  - player.body.width)  / 2,
    (player.height - player.body.height) / 2 + 6
  );
  // collectibles
  stars = this.physics.add.group({ allowGravity: false, immovable: true });
  stars.create(220, 380, "star");
  stars.create(520, 310, "star");
  stars.create(700, 160, "star");

  // goal (porte)
  goal = this.physics.add.staticSprite(900, 460, "goal");

  // collisions
  this.physics.add.collider(player, platforms);
  this.physics.add.overlap(player, spikes, () => respawn(this), null, this);
  this.physics.add.overlap(player, stars, onCollect, null, this);
  this.physics.add.overlap(player, goal, onWin, null, this);

  // UI
  uiText = this.add.text(16, 12, `Souvenirs: 0/3`, { fontFamily: "Arial", fontSize: "20px" })
    .setScrollFactor(0);

  popupText = this.add.text(W/2, 80, "", { fontFamily: "Arial", fontSize: "22px" })
    .setOrigin(0.5).setAlpha(0);

  // clavier (PC)
  cursors = this.input.keyboard.createCursorKeys();

  // petite aide
  this.add.text(16, H-24, "← → + saut (mobile: boutons)", { fontFamily: "Arial", fontSize: "16px", color:"#9ca3af" });

  // ✅ boutons HTML
  setTimeout(setupHtmlControls, 0);

  // reset touch states
  window.addEventListener("blur", () => { touch.left=false; touch.right=false; touch.jump=false; });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { touch.left=false; touch.right=false; touch.jump=false; }
  });
}

function update() {
  const left = cursors.left.isDown || touch.left;
  const right = cursors.right.isDown || touch.right;

  if (left) player.setVelocityX(-260);
  else if (right) player.setVelocityX(260);
  else player.setVelocityX(0);

  const jumpPressed = Phaser.Input.Keyboard.JustDown(cursors.up) || justPressedJump();
  if (jumpPressed && player.body.blocked.down) {
    player.setVelocityY(-520);
  }
}

function onCollect(_player, star) {
  star.disableBody(true, true);
  collected += 1;
  uiText.setText(`Souvenirs: ${collected}/3`);

  const messages = [
    "Un jeu signé... connard ! ✌️",
    "Vas-y roule, vas-y roule ! 👑",
    "Merci pour tout ❤️"
  ];
  showPopup(this, messages[collected - 1]);

  if (collected >= 3) {
    showPopup(this, "Porte déverrouillée !");
  }
}

function onWin() {
  if (collected < 3) {
    showPopup(this, "Il te manque des souvenirs 😉");
    return;
  }

  // écran de fin
  this.physics.pause();
  player.setVelocity(0,0);

  this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.75);
  this.add.text(W/2, 170, "BRAVO PAPA ! 🎉", { fontFamily:"Arial", fontSize:"44px" }).setOrigin(0.5);
  this.add.text(W/2, 250, "Tu as débloqué ton cadeau :\n", { fontFamily:"Arial", fontSize:"28px", align:"center" }).setOrigin(0.5);

  const button = this.add.rectangle(W/2, 340, 300, 70, 0x22c55e)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  this.add.text(W/2, 340, "VOIR LE CADEAU", {
    fontFamily: "Arial",
    fontSize: "24px",
    color: "#000"
  }).setOrigin(0.5);

  button.on("pointerover", () => button.setFillStyle(0x16a34a));
  button.on("pointerout", () => button.setFillStyle(0x22c55e));
  button.on("pointerdown", () => {
    window.open("https://estebanbolot.github.io/Bon-p-re-fils/", "_blank");
  });
}

function respawn(scene) {
  player.setVelocity(0,0);
  player.setPosition(100, 450);
  showPopup(scene, "Aïe ! Respawn 😅");
}

function showPopup(scene, text) {
  popupText.setText(text);
  scene.tweens.killTweensOf(popupText);
  popupText.setAlpha(0);
  scene.tweens.add({
    targets: popupText,
    alpha: 1,
    duration: 140,
    yoyo: true,
    hold: 900,
    ease: "Sine.easeInOut"
  });
}

let prevJump = false;
function justPressedJump() {
  const now = !!touch.jump;
  const jp = now && !prevJump;
  prevJump = now;
  return jp;
}

// --- texture helpers ---
function makeTextureRect(scene, key, w, h, color) {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillRoundedRect(0, 0, w, h, 6);
  g.generateTexture(key, w, h);
  g.destroy();
}
function makeTextureCircle(scene, key, r, color) {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillCircle(r, r, r);
  g.generateTexture(key, r*2, r*2);
  g.destroy();
}
function makeTextureTri(scene, key, w, h, color) {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.beginPath();
  g.moveTo(0, h);
  g.lineTo(w/2, 0);
  g.lineTo(w, h);
  g.closePath();
  g.fillPath();
  g.generateTexture(key, w, h);
  g.destroy();
}

function setupHtmlControls(){
  const bindHold = (id, key) => {
    const el = document.getElementById(id);
    if (!el) { console.warn("Bouton introuvable:", id); return; }

    const down = (e) => {
      e.preventDefault();
      touch[key] = true;
      if (el.setPointerCapture && e.pointerId != null) el.setPointerCapture(e.pointerId);
    };

    const up = (e) => {
      e.preventDefault();
      touch[key] = false;
      if (el.releasePointerCapture && e.pointerId != null) {
        try { el.releasePointerCapture(e.pointerId); } catch {}
      }
    };

    el.addEventListener("pointerdown", down, { passive:false });
    el.addEventListener("pointerup", up, { passive:false });
    el.addEventListener("pointercancel", up, { passive:false });
    el.addEventListener("pointerleave", up, { passive:false });

    el.addEventListener("touchstart", (e)=>{ e.preventDefault(); touch[key]=true; }, { passive:false });
    el.addEventListener("touchend",   (e)=>{ e.preventDefault(); touch[key]=false; }, { passive:false });
    el.addEventListener("touchcancel",(e)=>{ e.preventDefault(); touch[key]=false; }, { passive:false });
  };

  bindHold("btnLeft", "left");
  bindHold("btnRight", "right");
  bindHold("btnJump", "jump");

  console.log("✅ Controls ready");
}



