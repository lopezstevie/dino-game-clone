import { Player } from "../entities/Player";
import { SpriteWithDynamicBody } from "../types";

class PlayScene extends Phaser.Scene {

    player: Player;
    ground: Phaser.GameObjects.TileSprite;
    startTrigger: SpriteWithDynamicBody;

    get gameHeight() {
        return this.game.config.height as number;
    }

    get gameWidth() {
        return this.game.config.width as number;
    }

    constructor() {
        super("PlayScene");
    }

    create() {
        this.createEnvironment();
        this.createPlayer();

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
                    this.player.setVelocityX(80);
                    this.ground.width += 30;

                    if (this.ground.width >= this.gameWidth) {
                        rollOutEvent.remove();
                        this.ground.width = this.gameWidth;
                        this.player.setVelocityX(0);
                    }
                }
            });
        });
    }

    createEnvironment() {
        this.ground = this.add
            .tileSprite(0, this.gameHeight, 88, 26, "ground")
            .setOrigin(0, 1);
    }

    createPlayer() {
        this.player = new Player(this, 0, this.gameHeight);
    }
}

export default PlayScene;
