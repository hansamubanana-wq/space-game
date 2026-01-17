import Phaser from 'phaser';

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#2d2d2d',
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

const game = new Phaser.Game(config);

function preload() {
  // 画像などは後で読み込みます
}

function create() {
  // 画面中央にテキストを表示
  this.add.text(window.innerWidth / 2, window.innerHeight / 2, 'GAME START', {
    fontSize: '32px',
    fill: '#ffffff'
  }).setOrigin(0.5);

  // 自機（仮）の緑色の四角形
  this.player = this.add.rectangle(window.innerWidth / 2, window.innerHeight - 100, 50, 50, 0x00ff00);
}

function update() {
  // ここに毎フレームの処理を書きます
}
