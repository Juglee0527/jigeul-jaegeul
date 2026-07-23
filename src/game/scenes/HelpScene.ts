import Phaser from 'phaser';

import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { AudioManager } from '../services/AudioManager';

interface StepCardData {
  number: string;
  title: string;
  description: string;
  accent: number;
  visual: 'move' | 'attack' | 'grow';
}

export class HelpScene extends Phaser.Scene {
  private readonly audio = AudioManager.getInstance();

  constructor() {
    super('HelpScene');
  }

  create(): void {
    this.createBackground();
    this.createHeader();

    const cards: readonly StepCardData[] = [
      {
        number: '01',
        title: '움직여서 피하기',
        description: 'WASD 또는 방향키\n멈추지 말고 빈틈을 찾으세요',
        accent: COLORS.player,
        visual: 'move',
      },
      {
        number: '02',
        title: '공격은 자동',
        description: '가장 가까운 적을 자동 조준\n이동과 생존에 집중하세요',
        accent: COLORS.projectile,
        visual: 'attack',
      },
      {
        number: '03',
        title: '고르고 강해지기',
        description: 'EXP를 모아 세 카드 중 선택\n모든 능력은 LV.3이 최대',
        accent: COLORS.primary,
        visual: 'grow',
      },
    ];

    cards.forEach((card, index) => this.createStepCard(40 + index * 420, 152, card));
    this.createBossTimeline();
    this.createSurvivalPanel();

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 22, 'ESC로 메뉴 돌아가기', {
      color: '#71677c',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      letterSpacing: 1,
    }).setOrigin(0.5);

    const keyboard = this.input.keyboard;
    keyboard?.once('keydown-ESC', this.close, this);
  }

  private createBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    this.add.grid(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      64,
      64,
      0x090611,
      1,
      0x392047,
      0.2,
    );
    const leftGlow = this.add.circle(30, 180, 250, COLORS.primary, 0.055);
    const rightGlow = this.add.circle(1250, 565, 280, COLORS.secondary, 0.065);
    this.tweens.add({
      targets: [leftGlow, rightGlow],
      alpha: 0.025,
      scale: 1.08,
      duration: 2_400,
      yoyo: true,
      repeat: -1,
    });
  }

  private createHeader(): void {
    this.add.text(42, 34, 'SURVIVAL GUIDE', {
      color: '#ff9bea',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      backgroundColor: '#30152c',
      padding: { x: 11, y: 6 },
      letterSpacing: 2,
    });
    this.add.text(40, 72, '게임 방법', {
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '44px',
      fontStyle: 'bold',
      stroke: '#32142f',
      strokeThickness: 5,
    });
    this.add.text(415, 91, '성장하고 · 난관을 넘고 · 최종 보스를 쓰러뜨리세요', {
      color: '#a99eb8',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
    });

    this.add.rectangle(1165, 62, 150, 48, 0x171022, 0.98)
      .setStrokeStyle(2, 0x725381, 0.9);
    this.add.text(1165, 62, 'ESC  뒤로', {
      color: '#ddd2e7',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private createStepCard(x: number, y: number, data: StepCardData): void {
    this.add.rectangle(x, y, 360, 208, 0x12101a, 0.97)
      .setOrigin(0)
      .setStrokeStyle(2, data.accent, 0.48);
    this.add.rectangle(x, y, 7, 208, data.accent, 0.95).setOrigin(0);
    this.add.text(x + 26, y + 20, data.number, {
      color: Phaser.Display.Color.IntegerToColor(data.accent).rgba,
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      letterSpacing: 2,
    });
    this.add.text(x + 70, y + 18, data.title, {
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '23px',
      fontStyle: 'bold',
    });

    this.createCardVisual(x + 64, y + 112, data.visual, data.accent);
    this.add.text(x + 126, y + 78, data.description, {
      color: '#c8bdcf',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      lineSpacing: 9,
    });
  }

  private createCardVisual(x: number, y: number, visual: StepCardData['visual'], accent: number): void {
    const halo = this.add.circle(x, y, 43, accent, 0.1).setStrokeStyle(2, accent, 0.45);
    this.tweens.add({
      targets: halo,
      scale: 1.08,
      alpha: 0.04,
      duration: 1_300,
      yoyo: true,
      repeat: -1,
    });

    if (visual === 'move') {
      this.add.image(x, y, 'player').setScale(0.8);
      this.add.text(x, y + 53, '↑  ← ↓ →', {
        color: '#7fffe5',
        fontFamily: 'monospace',
        fontSize: '13px',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      return;
    }
    if (visual === 'attack') {
      this.add.image(x - 15, y, 'weapon').setScale(1.15);
      this.add.image(x + 24, y - 3, 'projectile').setScale(0.72);
      return;
    }

    this.add.image(x, y - 5, 'experience').setScale(1.5);
    const rarityColors = [0x9a91a3, 0x4fa8ff, 0xc45cff, 0xffc43d];
    rarityColors.forEach((color, index) => {
      this.add.circle(x - 27 + index * 18, y + 45, 5, color, 1);
    });
  }

  private createBossTimeline(): void {
    const x = 40;
    const y = 382;
    const width = 760;
    const height = 264;
    this.add.rectangle(x, y, width, height, 0x101018, 0.97)
      .setOrigin(0)
      .setStrokeStyle(2, 0xff6f91, 0.38);
    this.add.text(x + 24, y + 20, 'BOSS TIMELINE', {
      color: '#ff9baa',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      letterSpacing: 2,
    });
    this.add.text(x + 24, y + 46, '세 번의 관문을 넘으세요', {
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
    });

    const lineY = y + 133;
    this.add.rectangle(x + 55, lineY, width - 110, 3, 0x58344f, 1).setOrigin(0, 0.5);
    const stops = [
      { offset: 68, time: '0:00', title: '생존 시작', color: COLORS.player },
      { offset: 270, time: '3:00', title: '1단계', color: 0xffb13b },
      { offset: 472, time: '6:00', title: '2단계', color: 0xff6f91 },
      { offset: 674, time: '10:00', title: '최종 보스', color: 0xff334f },
    ] as const;
    stops.forEach((stop, index) => {
      const stopX = x + stop.offset;
      const radius = index === stops.length - 1 ? 12 : 9;
      this.add.circle(stopX, lineY, radius + 7, stop.color, 0.12);
      this.add.circle(stopX, lineY, radius, stop.color, 1)
        .setStrokeStyle(2, 0xffffff, 0.8);
      this.add.text(stopX, lineY - 39, stop.time, {
        color: Phaser.Display.Color.IntegerToColor(stop.color).rgba,
        fontFamily: 'monospace',
        fontSize: '17px',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.add.text(stopX, lineY + 26, stop.title, {
        color: '#e9e1ee',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    });

    this.add.text(x + 24, y + 215, '보스전에는 시간이 멈추고 지원군이 합류합니다', {
      color: '#aaa0b4',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
    });
    this.add.text(x + width - 24, y + 215, '처치 보상  ◆ 전설 능력', {
      color: '#ffc43d',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
    }).setOrigin(1, 0);
  }

  private createSurvivalPanel(): void {
    const x = 820;
    const y = 382;
    const width = 420;
    const height = 264;
    this.add.rectangle(x, y, width, height, 0x101018, 0.97)
      .setOrigin(0)
      .setStrokeStyle(2, COLORS.secondary, 0.42);
    this.add.text(x + 24, y + 20, 'BEFORE YOU PLAY', {
      color: '#bda8ff',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      letterSpacing: 2,
    });
    this.add.text(x + 24, y + 46, '난이도 선택', {
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
    });

    this.createPill(x + 24, y + 88, 112, '쉬움  ×0.5', 0x6dff8b);
    this.createPill(x + 146, y + 88, 112, '보통  ×1.0', 0xfff36b);
    this.createPill(x + 268, y + 88, 128, '어려움  ×1.5', 0xff334f);

    this.add.rectangle(x + 24, y + 142, width - 48, 1, 0x3a2a45, 1).setOrigin(0);
    this.add.text(x + 24, y + 160, 'ESC', {
      color: '#ffffff',
      fontFamily: 'monospace',
      fontSize: '16px',
      fontStyle: 'bold',
      backgroundColor: '#33223f',
      padding: { x: 9, y: 5 },
    });
    this.add.text(x + 88, y + 164, '일시정지 · 전체 능력치 확인', {
      color: '#c8bdcf',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
    });
    this.add.text(x + 24, y + 205, '× 배율', {
      color: '#fff36b',
      fontFamily: 'monospace',
      fontSize: '14px',
      fontStyle: 'bold',
    });
    this.add.text(x + 88, y + 203, '적·보스의 체력 · 속도 · 피해', {
      color: '#c8bdcf',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
    });
    this.add.text(x + 88, y + 232, '0.5 = 절반   ·   1.5 = 50% 강화', {
      color: '#8f8399',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
    });
  }

  private createPill(x: number, y: number, width: number, label: string, color: number): void {
    this.add.rectangle(x, y, width, 38, color, 0.08)
      .setOrigin(0)
      .setStrokeStyle(1, color, 0.8);
    this.add.text(x + width / 2, y + 19, label, {
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private close(): void {
    this.audio.play('confirm');
    this.audio.setMood('menu');
    this.scene.resume('MenuScene');
    this.scene.stop();
  }
}
