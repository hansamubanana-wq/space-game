import Phaser from 'phaser';

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#050510', // 深い宇宙色
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

// ゲーム全体で使う変数
let player;
let bullets;
let enemies;
let explosions; // 爆発エフェクト管理
let cursors;    // キーボード操作用（PC対応強化）
let lastFired = 0;
let score = 0;
let scoreText;
let hp = 3;
let hpText;
let gameLevel = 1;
let isGameOver = false;

// 星空の背景用
let stars = []; 

const game = new Phaser.Game(config);

function preload() {
  // --- グラフィックの動的生成 ---
  // 画像ファイルを使わず、プログラムでテクスチャ（画像）を作ります。
  
  // 1. プレイヤー機体のテクスチャ生成
  const graphics = this.make.graphics({ x: 0, y: 0, add: false });
  
  // 機体ボディ
  graphics.fillStyle(0x00d2ff, 1); // 水色
  graphics.beginPath();
  graphics.moveTo(0, 20);
  graphics.lineTo(16, 0);
  graphics.lineTo(32, 20);
  graphics.lineTo(16, 10);
  graphics.closePath();
  graphics.fillPath();
  
  // エンジン部分
  graphics.fillStyle(0xffaa00, 1); // オレンジ
  graphics.fillCircle(16, 22, 4);
  
  // 'playerShip' という名前でテクスチャ登録
  graphics.generateTexture('playerShip', 32, 32);
  graphics.clear();

  // 2. 敵（タイプ1：雑魚）のテクスチャ生成
  graphics.fillStyle(0xff4757, 1); // 赤
  graphics.fillRect(0, 0, 32, 32);
  graphics.fillStyle(0x000000, 1);
  graphics.fillRect(4, 4, 8, 8); // 目
  graphics.fillRect(20, 4, 8, 8); // 目
  graphics.generateTexture('enemy1', 32, 32);
  graphics.clear();

  // 3. 敵（タイプ2：高速機）のテクスチャ生成
  graphics.fillStyle(0xffda79, 1); // 黄色
  graphics.beginPath();
  graphics.moveTo(16, 32);
  graphics.lineTo(32, 0);
  graphics.lineTo(0, 0);
  graphics.closePath();
  graphics.fillPath();
  graphics.generateTexture('enemy2', 32, 32);
  graphics.clear();

  // 4. 弾のテクスチャ
  graphics.fillStyle(0xffff00, 1);
  graphics.fillCircle(4, 4, 4);
  graphics.generateTexture('bullet', 8, 8);
  graphics.clear();
  
  // 5. 爆発パーティクルの元（小さな光）
  graphics.fillStyle(0xffffff, 1);
  graphics.fillCircle(2, 2, 2);
  graphics.generateTexture('particle', 4, 4);
}

function create() {
  isGameOver = false;
  score = 0;
  hp = 3;
  gameLevel = 1;

  // --- 星空背景の作成 ---
  // ランダムな位置に星を配置
  for (let i = 0; i < 100; i++) {
    const x = Phaser.Math.Between(0, config.width);
    const y = Phaser.Math.Between(0, config.height);
    const size = Phaser.Math.FloatBetween(0.5, 2);
    const star = this.add.rectangle(x, y, size, size, 0xffffff);
    // 遠近感を出すためにスピードに差をつける
    star.speed = size * 2; 
    stars.push(star);
  }

  // --- UI表示 ---
  scoreText = this.add.text(20, 20, 'SCORE: 0', { 
    fontSize: '24px', 
    fill: '#fff', 
    fontFamily: 'Arial' 
  }).setDepth(100); // 常に手前に表示

  hpText = this.add.text(config.width - 120, 20, 'HP: ' + '❤️'.repeat(hp), { 
    fontSize: '24px', 
    fill: '#ff5e57', 
    fontFamily: 'Arial' 
  }).setDepth(100);

  // --- プレイヤー作成 ---
  // Physics Spriteとして作成（Containerより高性能）
  player = this.physics.add.sprite(config.width / 2, config.height - 100, 'playerShip');
  player.setCollideWorldBounds(true);
  player.setBodySize(20, 20); // 当たり判定を少し小さくして避けやすくする

  // --- グループ作成 ---
  bullets = this.physics.add.group({
    defaultKey: 'bullet',
    maxSize: 50
  });

  enemies = this.physics.add.group();

  // --- 爆発エフェクト設定 ---
  // パーティクルマネージャーを作成
  // ※Phaser 3.60以降の書き方に対応
  explosions = this.add.particles(0, 0, 'particle', {
    lifespan: 600,
    speed: { min: 50, max: 150 },
    scale: { start: 2, end: 0 },
    blendMode: 'ADD',
    emitting: false
  });

  // --- 敵出現タイマー ---
  // 初回起動
  spawnEnemySequence.call(this);
  
  // --- 当たり判定 ---
  this.physics.add.overlap(bullets, enemies, hitEnemy, null, this);
  this.physics.add.overlap(player, enemies, hitPlayer, null, this);

  // PC操作用のキー定義
  cursors = this.input.keyboard.createCursorKeys();
}

function update(time) {
  if (isGameOver) return;

  // --- 星空スクロール処理 ---
  stars.forEach(star => {
    star.y += star.speed;
    // 画面下に出たら上に戻す
    if (star.y > config.height) {
      star.y = 0;
      star.x = Phaser.Math.Between(0, config.width);
    }
  });

  // --- プレイヤー移動 ---
  // 1. タッチ/マウス操作
  if (this.input.activePointer.isDown) {
    this.physics.moveTo(player, this.input.activePointer.x, this.input.activePointer.y - 50, 600);
  } 
  // 2. キーボード操作（PC用）
  else if (cursors.left.isDown) {
    player.setVelocityX(-400);
  } else if (cursors.right.isDown) {
    player.setVelocityX(400);
  } else {
    // 操作なしで減速
    player.setVelocityX(player.body.velocity.x * 0.9);
    player.setVelocityY(player.body.velocity.y * 0.9);
  }

  // --- 弾発射 ---
  if (time > lastFired) {
    const bullet = bullets.get(player.x, player.y - 20);
    if (bullet) {
      bullet.setActive(true).setVisible(true);
      bullet.setVelocityY(-600);
      lastFired = time + 150; // 連射速度アップ
    }
  }

  // --- 画面外処理 ---
  bullets.children.each(b => {
    if (b.active && b.y < -50) b.setActive(false).setVisible(false);
  });
  
  enemies.children.each(e => {
    if (e.active && e.y > config.height + 50) e.destroy();
  });
}

// 敵出現管理（再帰呼び出しでループ）
function spawnEnemySequence() {
  if (isGameOver) return;

  let delay = 1000; // 基本待機時間
  // スコアに応じて難易度アップ（出現間隔が短くなる）
  if (score > 1000) delay = 800;
  if (score > 3000) delay = 600;
  if (score > 5000) delay = 400;

  // ランダムで敵の種類を決める
  const type = Phaser.Math.Between(0, 100);
  let enemyKey = 'enemy1';
  let speed = 200;

  if (type > 80 && score > 500) {
    // 20%の確率で高速な敵（黄色）
    enemyKey = 'enemy2';
    speed = 400;
  }

  const x = Phaser.Math.Between(30, config.width - 30);
  const enemy = enemies.create(x, -50, enemyKey);
  
  enemy.setVelocityY(speed);

  // 敵タイプ2ならプレイヤーに向かって少し斜めに動く
  if (enemyKey === 'enemy2') {
    if (player.x < x) enemy.setVelocityX(-100);
    else enemy.setVelocityX(100);
  }

  // 次の敵出現を予約
  this.time.delayedCall(delay, spawnEnemySequence, [], this);
}

function hitEnemy(bullet, enemy) {
  // 弾をプールに戻す（削除ではなく非表示にして再利用）
  bullet.setActive(false).setVisible(false);
  
  // 爆発エフェクト発生
  explosions.emitParticleAt(enemy.x, enemy.y, 10);
  
  enemy.destroy();

  score += 100;
  scoreText.setText('SCORE: ' + score);
}

function hitPlayer(player, enemy) {
  enemy.destroy();
  explosions.emitParticleAt(player.x, player.y, 20);

  // ダメージ処理
  hp--;
  hpText.setText('HP: ' + '❤️'.repeat(hp));

  // 画面を揺らす（ダメージ演出）
  this.cameras.main.shake(200, 0.01);
  
  // 一瞬無敵（赤く点滅）
  player.setAlpha(0.5);
  player.setTint(0xff0000);
  this.time.delayedCall(1000, () => {
    player.setAlpha(1);
    player.clearTint();
  });

  if (hp <= 0) {
    this.physics.pause();
    isGameOver = true;
    player.setTint(0x555555); // 撃破された色

    // ゲームオーバーUI
    const zone = this.add.zone(config.width/2, config.height/2, config.width, config.height);
    zone.setInteractive();
    
    this.add.rectangle(config.width/2, config.height/2, config.width, 200, 0x000000, 0.7);
    this.add.text(config.width/2, config.height/2 - 30, 'GAME OVER', { fontSize: '48px', fill: '#ff0000', fontFamily: 'Arial' }).setOrigin(0.5);
    this.add.text(config.width/2, config.height/2 + 30, 'Tap to Restart', { fontSize: '24px', fill: '#fff', fontFamily: 'Arial' }).setOrigin(0.5);

    zone.once('pointerdown', () => {
      this.scene.restart();
    });
  }
}
