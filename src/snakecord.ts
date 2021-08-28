import { ColorResolvable, EmojiIdentifierResolvable, Message, MessageEmbed, MessageReaction, User } from 'discord.js';
import { SnakeGameOptions, EntityLocation } from '../typings/types';

/**
 * The main class, initializes a new Snake game.
 */
export class SnakeGame {
    // Board properties
    boardWidth: number;
    boardLength: number;
    gameBoard: EmojiIdentifierResolvable[];
    inGame: boolean;

    // Entity properties
    apple: EntityLocation;
    snake: EntityLocation[];
    snakeLength: number;
    score: number;

    // Other properties
    gameEmbedMessage: Message | null;
    options: SnakeGameOptions;

    constructor(options: SnakeGameOptions = {}) {
        this.options = options;
        this.boardWidth = /* this.options.boardWidth || */ 15;
        this.boardLength = /* this.options.boardLength || */ 10;
        this.gameBoard = [];
        this.apple = { x: 1, y: 1 };
        this.snake = [{ x: 5, y: 5 }];
        this.snakeLength = 1;
        this.score = 0;
        this.gameEmbedMessage = null;
        this.inGame = false;

        for (let y = 0; y < this.boardLength; y++) {
            for (let x = 0; x < this.boardWidth; x++) {
                this.gameBoard[y * this.boardWidth + x] = this.options.backgroundEmoji || '🟦';
            }
        }
    }

    /**
     * Creates a new game board for a Snake game.
     */
    gameBoardToString(): string {
        let str = '';
        for (let y = 0; y < this.boardLength; y++) {
            for (let x = 0; x < this.boardWidth; x++) {
                if (x == this.apple.x && y == this.apple.y) {
                    str += this.options.fruitEmoji || '🍎';
                    continue;
                }

                let flag = true;
                for (let s = 0; s < this.snake.length; s++) {
                    if (x == this.snake[s].x && y == this.snake[s].y) {
                        str += this.options.snakeEmoji || '🟩';
                        flag = false;
                    }
                }

                if (flag) {
                    str += this.gameBoard[y * this.boardWidth + x];
                }
            }

            str += '\n';
        }

        return str;
    }

    /**
     * Checks if the snake hit itself.
     * @param pos - The snake's current position.
     */
    isLocationInSnake(pos: EntityLocation): EntityLocation {
        return this.snake.find(snakePos => snakePos.x == pos.x && snakePos.y == pos.y);
    }

    /**
     * Moves the apple around the game board.
     */
    newAppleLocation(): void {
        let newApplePos: EntityLocation = {
            x: 0,
            y: 0,
        };

        do {
            newApplePos = {
                x: Math.random() * this.boardWidth,
                y: Math.random() * this.boardLength,
            };
        } while (this.isLocationInSnake(newApplePos));

        this.apple.x = newApplePos.x;
        this.apple.y = newApplePos.y;
    }

    /**
     * Creates a new Snake game.
     * @param {Message} msg - The message instance from which to begin.
     */
    newGame(msg: Message): void {
        if (this.inGame) {
            return;
        }

        this.inGame = true;
        this.score = 0;
        this.snakeLength = 1;
        this.snake = [{ x: 5, y: 5 }];
        this.newAppleLocation();

        const embed = new MessageEmbed()
            .setColor(this.options.color || 'RANDOM')
            .setTitle(this.options.title || 'Snake: The Game')
            .setDescription(this.gameBoardToString());

        if (this.options.timestamp) {
            embed.setTimestamp();
        }

        msg.channel.send({ embeds: [embed] }).then(async (message) => {
            this.gameEmbedMessage = message;
            await this.gameEmbedMessage.react('⬅️');
            await this.gameEmbedMessage.react('⬆️');
            await this.gameEmbedMessage.react('⬇️');
            await this.gameEmbedMessage.react('➡️');

            this.waitForReaction();
        });
    }

    /**
     * Updates the game board (and the snake if it ate an apple).
     */
    step(): void {
        if (this.apple.x == this.snake[0].x && this.apple.y == this.snake[0].y) {
            this.score += 1;
            this.snakeLength++;
            this.newAppleLocation();
        }

        const editedEmbed = new MessageEmbed()
            .setColor(this.options.color || 'RANDOM')
            .setTitle(this.options.title || 'Snake: The Game')
            .setDescription(this.gameBoardToString());

        if (this.options.timestamp) {
            editedEmbed.setTimestamp();
        }

        this.gameEmbedMessage.edit({ embeds: [editedEmbed] });
        this.waitForReaction();
    }

    /**
     * Prints the gameover message, or the default one.
     */
    gameOver(): void {
        this.inGame = false;

        const editedEmbed = new MessageEmbed()
            .setColor(this.options.color || 'RANDOM')
            .setTitle(this.options.gameOverTitle || 'Game Over!')
            .setDescription(`SCORE: **${this.score}**`);

        if (this.options.timestamp) {
            editedEmbed.setTimestamp();
        }

        this.gameEmbedMessage.edit({ embeds: [editedEmbed] });
        this.gameEmbedMessage.reactions.removeAll();
    }

    /**
     * Handles reactions on the game embed.
     */
    waitForReaction(): void {
        this.gameEmbedMessage.awaitReactions({ filter: (reaction, user) => {
            return ['⬅️', '⬆️', '⬇️', '➡️'].includes(reaction.emoji.name) && user.id !== this.gameEmbedMessage.author.id;
        }, max: 1, time: 60000, errors: ['time'] }).then(collected => {
            const reaction = collected.first();
            const snakeHead = this.snake[0];
            const nextPos: EntityLocation = {
                x: snakeHead.x,
                y: snakeHead.y,
            };

            if (reaction.emoji.name === '⬅️') {
                let nextX = snakeHead.x - 1;
                if (nextX < 0) {
                    nextX = this.boardWidth - 1;
                }

                nextPos.x = nextX;
            } else if (reaction.emoji.name === '⬆️') {
                let nextY = snakeHead.y - 1;
                if (nextY < 0) {
                    nextY = this.boardLength - 1;
                }

                nextPos.y = nextY;
            } else if (reaction.emoji.name === '⬇️') {
                let nextY = snakeHead.y + 1;
                if (nextY >= this.boardLength) {
                    nextY = 0;
                }

                nextPos.y = nextY;
            } else if (reaction.emoji.name === '➡️') {
                let nextX = snakeHead.x + 1;
                if (nextX >= this.boardWidth) {
                    nextX = 0;
                }

                nextPos.x = nextX;
            }

            reaction.users.remove(reaction.users.cache.filter(user => user.id !== this.gameEmbedMessage.author.id).first().id).then(() => {
                if (this.isLocationInSnake(nextPos)) {
                    this.gameOver();
                } else {
                    this.snake.unshift(nextPos);
                    if (this.snake.length > this.snakeLength) {
                        this.snake.pop();
                    }

                    this.step();
                }
            });
        }).catch(() => {
            this.gameOver();
        });
    }

    /**
     * Sets the custom (or default) title of the game embed.
     * @param {String} title - The title to set.
     */
    setTitle(title: string): this {
        this.options.title = title || 'Snake: The Game';
        return this;
    }

    /**
     * Sets the custom (or default) color of the game embed.
     * @param {ColorResolvable} color - The hex code for the embed color.
     */
    setColor(color: ColorResolvable): this {
        this.options.color = color || 'RANDOM';
        return this;
    }

    /**
     * Sets the timestamp of the game embed if requested.
     */
    setTimestamp(): this {
        this.options.timestamp = true;
        return this;
    }
}