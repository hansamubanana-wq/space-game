import Phaser from 'phaser';

// ゲームの設定
const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#1a1a2e', // 宇宙っぽい紺色
  physics: {
    default: 'arcade', // 物理エンジンを有効化
    arcade: {
      gravity: { y: 0 }, // 重力はなし（宇宙なので）
      debug: false
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

// ゲーム変数の準備
let player;
let bullets;
let enemies;
let lastFired = 0; // 連射間隔管理用
let score = 0;
let scoreText;
let isGameOver = false;

const game = new Phaser.Game(config);

function preload() {
  // 今回は画像を使わずプログラムで図形を描くのでロードなし
}

function create() {
  isGameOver = false;
  score = 0;

  // 1. スコア表示
  scoreText = this.add.text(20, 20, 'SCORE: 0', { fontSize: '24px', fill: '#fff' });

  // 2. プレイヤーの作成（白い三角形）
  // プレイヤー専用のコンテナ（入れ物）を作る
  player = this.add.container(config.width / 2, config.height - 100);
  
  // 三角形の描画 (頂点座標: x1, y1, x2, y2, x3, y3)
  const shipShape = this.add.triangle(0, 0, 0, -20, 15, 15, -15, 15, 0x00a8ff);
  player.add(shipShape);
  
  // 物理演算を有効にする
  this.physics.world.enable(player);
  // 画面外に出ないようにする
  player.body.setCollideWorldBounds(true);
  // 当たり判定のサイズ調整
  player.body.setSize(30, 30);
  player.body.setOffset(-15, -15);

  // 3. 弾のグループ作成
  bullets = this.physics.add.group({
    defaultKey: null
  });

  // 4. 敵のグループ作成
  enemies = this.physics.add.group({
    defaultKey: null
  });

  // 5. 敵を定期的に出現させるタイマー
  this.time.addEvent({
    delay: 1000, // 1秒ごとに
    callback: spawnEnemy,
    callbackScope: this,
    loop: true
  });

  // 6. 当たり判定の設定
  // 弾と敵が当たったら
  this.physics.add.overlap(bullets, enemies, hitEnemy, null, this);
  // 敵とプレイヤーが当たったら
  this.physics.add.overlap(player, enemies, hitPlayer, null, this);
}

function update(time) {
  if (isGameOver) return;

  // --- プレイヤーの移動処理 ---
  // マウスまたはタッチしている指の場所を取得
  const pointer = this.input.activePointer;
  
  if (pointer.isDown) {
    // 指の位置へ滑らかに移動（単純な追従だと指で隠れるため、少し上に表示させるなどの工夫も可）
    // 今回はシンプルにX座標を追従、Y座標は少し指より上にする
    this.physics.moveTo(player, pointer.x, pointer.y - 50, 600);
  } else {
    // 操作していない時は減速して止まる
    player.body.setVelocity(0);
  }

  // --- 弾の発射処理 ---
  // 200ミリ秒（0.2秒）ごとに発射
  if (time > lastFired) {
    fireBullet.call(this);
    lastFired = time + 200;
  }

  // --- 画面外のオブジェクト削除 ---
  // 弾が上に行き過ぎたら消す
  bullets.children.each((b) => {
    if (b.active && b.y < -50) {
      b.destroy();
    }
  });

  // 敵が下に行き過ぎたら消す
  enemies.children.each((e) => {
    if (e.active && e.y > config.height + 50) {
      e.destroy();
    }
  });
}

// 敵を出現させる関数
function spawnEnemy() {
  if (isGameOver) return;

  const x = Phaser.Math.Between(30, config.width - 30);
  const enemy = this.add.rectangle(x, -20, 40, 40, 0xff4757); // 赤い四角
  
  enemies.add(enemy); // グループに追加
  
  // 物理演算有効化
  this.physics.world.enable(enemy);
  enemy.body.setVelocityY(200); // 下に向かって進むスピード
}

// 弾を発射する関数
function fireBullet() {
  // プレイヤーの位置から弾を出す
  const bullet = this.add.circle(player.x, player.y - 20, 5, 0xffff00); // 黄色い丸
  
  bullets.add(bullet);
  
  this.physics.world.enable(bullet);
  bullet.body.setVelocityY(-500); // 上に向かって進むスピード
}

// 弾が敵に当たった時の処理
function hitEnemy(bullet, enemy) {
  bullet.destroy(); // 弾を消す
  enemy.destroy();  // 敵を消す
  
  score += 100;
  scoreText.setText('SCORE: ' + score);
  
  // 演出：パーティクル（爆発エフェクト）などは今後追加
}

// 敵がプレイヤーに当たった時の処理
function hitPlayer(player, enemy) {
  this.physics.pause(); // 物理演算ストップ
  player.setTint(0xff0000); // プレイヤーを赤くする
  enemy.destroy();
  
  isGameOver = true;
  
  // ゲームオーバー表示
  this.add.text(config.width / 2, config.height / 2, 'GAME OVER', {
    fontSize: '48px',
    fill: '#ff0000',
    backgroundColor: '#000000'
  }).setOrigin(0.5);

  this.add.text(config.width / 2, config.height / 2 + 60, 'Tap to Restart', {
    fontSize: '24px',
    fill: '#ffffff'
  }).setOrigin(0.5);

  // 画面タップでリスタート
  this.input.once('pointerdown', () => {
    this.scene.restart();
  });
}
