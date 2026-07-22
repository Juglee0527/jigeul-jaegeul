import Phaser from 'phaser';

const MOVE_SPEED = 300;
const MAX_HP = 100;
const INVULNERABILITY_MS = 800;

type MovementKeys = Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly maxHp = MAX_HP;
  hp = MAX_HP;

  private readonly cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly movementKeys: MovementKeys;
  private invulnerableUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(10);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(22, 2, 2);

    const keyboard = scene.input.keyboard;
    if (!keyboard) {
      throw new Error('키보드 입력을 초기화할 수 없습니다.');
    }

    this.cursorKeys = keyboard.createCursorKeys();
    this.movementKeys = keyboard.addKeys('W,A,S,D') as MovementKeys;
  }

  update(): void {
    const horizontal = Number(this.cursorKeys.right.isDown || this.movementKeys.D.isDown)
      - Number(this.cursorKeys.left.isDown || this.movementKeys.A.isDown);
    const vertical = Number(this.cursorKeys.down.isDown || this.movementKeys.S.isDown)
      - Number(this.cursorKeys.up.isDown || this.movementKeys.W.isDown);

    const direction = new Phaser.Math.Vector2(horizontal, vertical);
    if (direction.lengthSq() > 0) {
      direction.normalize().scale(MOVE_SPEED);
    }

    this.setVelocity(direction.x, direction.y);
  }

  takeDamage(amount: number, now: number): boolean {
    if (now < this.invulnerableUntil || this.hp <= 0) {
      return false;
    }

    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableUntil = now + INVULNERABILITY_MS;

    this.setTint(0xff334f);
    this.scene.time.delayedCall(120, () => {
      if (this.active) {
        this.clearTint();
      }
    });

    return true;
  }
}
