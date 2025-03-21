import { PRELOAD_CONFIG } from "..";
import { Player } from "../entities/Player";
import { SpriteWithDynamicBody } from "../types";
import { GameScene } from "./GameScene";

class PlayScene extends GameScene {
    player: Player;
    ground: Phaser.GameObjects.TileSprite;
    obstacles: Phaser.Physics.Arcade.Group;
    clouds: Phaser.GameObjects.Group;
    startTrigger: SpriteWithDynamicBody;

    scoreText: Phaser.GameObjects.Text;
    highScoreText: Phaser.GameObjects.Text;
    gameOverText: Phaser.GameObjects.Image;
    restartText: Phaser.GameObjects.Image;
    gameOverContainer: Phaser.GameObjects.Container;

    score: number = 0;
    scoreInterval: number = 100;
    scoreDeltaTime: number = 0;

    spawnInterval: number = 1500;
    spawnTime: number = 0;
    gameSpeed: number = 6.5;
    gameSpeedModifier: number = 1;

    progressSound: Phaser.Sound.HTML5AudioSound;

    constructor() {
        super("PlayScene");
    }

    create() {
        this.createEnvironment();
        this.createPlayer();
        this.createObstacles();
        this.createGameoverContainer();
        this.createAnimations();
        this.createScore();

        this.handleGameStart();
        this.handleObstacleCollisions();
        this.handleGameRestart();

        this.progressSound = this.sound.add("progress", {volume: 0.5}) as Phaser.Sound.HTML5AudioSound;
    }

    update(time: number, delta: number): void {
        if (!this.isGameRunning) { return; }

        this.spawnTime += delta;
        this.scoreDeltaTime += delta;

        if (this.spawnTime >= this.spawnInterval) {
            this.spawnObstacle();
            this.spawnTime = 0;
        }

        if (this.scoreDeltaTime >= this.scoreInterval) {
            this.score++;
            this.scoreDeltaTime = 0;

            if (this.score % 100 === 0) {
                this.gameSpeedModifier += 0.2;
                this.progressSound.play();
                this.tweens.add({
                    targets: this.scoreText,
                    duration: 100,
                    repeat: 3,
                    alpha: 0,
                    yoyo: true
                });
            }
        }

        Phaser.Actions.IncX(this.obstacles.getChildren(), -this.gameSpeed * this.gameSpeedModifier);
        Phaser.Actions.IncX(this.clouds.getChildren(), -0.5);

        const score = Array.from(String(this.score), Number);
        for (let i = 0; i < 5 - String(this.score).length; i++) {
            score.unshift(0);
        }

        this.scoreText.setText(score.join(""));

        this.obstacles.getChildren().forEach((obstacle: SpriteWithDynamicBody) => {
            if (obstacle.getBounds().right < 0) {
                this.obstacles.remove(obstacle);
            }
        });

        this.clouds.getChildren().forEach((cloud: SpriteWithDynamicBody) => {
            if (cloud.getBounds().right < 0) {
                cloud.x = this.gameWidth + Phaser.Math.Between(0, 100);
            }
        });

        this.ground.tilePositionX += (this.gameSpeed * this.gameSpeedModifier);
    }

    createEnvironment() {
        this.ground = this.add
            .tileSprite(0, this.gameHeight, 88, 26, "ground")
            .setOrigin(0, 1);
        
        this.clouds = this.add.group();
        this.clouds = this.clouds.addMultiple([
            this.add.image(this.gameWidth / 2, 170, "cloud"),
            this.add.image(this.gameWidth - 80, 80, "cloud"),
            this.add.image(this.gameWidth / 1.3, 100, "cloud")
        ]);

        this.clouds.setAlpha(0);
    }

    createPlayer() {
        this.player = new Player(this, 0, this.gameHeight);
    }

    createObstacles() {
        this.obstacles = this.physics.add.group();
    }

    createGameoverContainer() {
        this.gameOverText = this.add.image(0, 0, "game-over");
        this.restartText = this.add.image(0, 80, "restart").setInteractive();

        this.gameOverContainer = this.add
            .container(this.gameWidth / 2, (this.gameHeight / 2) - 50)
            .add([this.gameOverText, this.restartText])
            .setAlpha(0);
    }

    createAnimations() {
        this.anims.create({
            key: "enemy-bird-fly",
            frames: this.anims.generateFrameNumbers("enemy-bird"),
            frameRate: 6,
            repeat: -1
        });
    }

    createScore() {
        this.scoreText = this.add.text(this.gameWidth, 0, "00000", {
            fontSize: 30,
            fontFamily: "Arial",
            color: "#535353",
            resolution: 5
        }).setOrigin(1, 0).setAlpha(0);

        this.highScoreText = this.add.text(this.scoreText.getBounds().left - 20, 0, "00000", {
            fontSize: 30,
            fontFamily: "Arial",
            color: "#535353",
            resolution: 5
        }).setOrigin(1, 0).setAlpha(0);
    }

    spawnObstacle() {
        const obstaclesCount = PRELOAD_CONFIG.cactusesCount + PRELOAD_CONFIG.birdsCount;
        const obstacleNum = Math.floor(Math.random() * obstaclesCount) + 1;
        
        const distance = Phaser.Math.Between(150, 300);
        let obstacle;

        if (obstacleNum > PRELOAD_CONFIG.cactusesCount) {
            const enemyPossibleHeight = [20, 70]
            const enemyHeight = enemyPossibleHeight[Math.floor(Math.random() * 2)];

            obstacle = this.obstacles.create(this.gameWidth + distance, this.gameHeight - enemyHeight, `enemy-bird`);
            obstacle.play("enemy-bird-fly", true);
        } else {
            obstacle = this.obstacles.create(this.gameWidth + distance, this.gameHeight, `obstacle-${obstacleNum}`)
        }

        obstacle
            .setOrigin(0, 1)
            .setImmovable();
    }

    handleGameStart() {
        this.startTrigger = this.physics.add.sprite(0, 10, null)
            .setAlpha(0)
            .setOrigin(0, 1);
        
            this.physics.add.overlap(this.player, this.startTrigger, () => {
            if (this.startTrigger.y === 10) {
                this.startTrigger.body.reset(0, this.gameHeight);
                return;
            }

            this.startTrigger.body.reset(9999, 9999);

            const rollOutEvent = this.time.addEvent({
                delay: 1000 / 60,
                loop: true,
                callback: () => {
                    this.player.playAnimation();
                    this.player.setVelocityX(80);
                    this.ground.width += 30;

                    if (this.ground.width >= this.gameWidth) {
                        rollOutEvent.remove();
                        this.ground.width = this.gameWidth;
                        this.player.setVelocityX(0);
                        this.clouds.setAlpha(1);
                        this.scoreText.setAlpha(1);
                        this.isGameRunning = true;
                    }
                }
            });
        });
    }

    handleObstacleCollisions() {
        this.physics.add.collider(this.obstacles, this.player, () => {
            this.isGameRunning = false;
            this.physics.pause();
            this.anims.pauseAll();

            this.player.die();
            this.gameOverContainer.setAlpha(1);

            const newHighScore = this.highScoreText.text.substring(this.highScoreText.text.length - 5);
            const newScore = Number(this.scoreText.text) > Number(newHighScore) ? this.scoreText.text : newHighScore;

            this.highScoreText.setText("HI " + newScore);
            this.highScoreText.setAlpha(1);

            this.spawnTime = 0;
            this.score = 0;
            this.scoreDeltaTime = 0;
            this.gameSpeedModifier = 1;
        });
    }

    handleGameRestart() {
        this.restartText.on("pointerdown", () => {
            this.physics.resume();
            this.player.setVelocityY(0);

            this.obstacles.clear(true, true);
            this.gameOverContainer.setAlpha(0);
            this.anims.resumeAll();

            this.isGameRunning = true;
        });
    }
}

export default PlayScene;
