// ===========================
// CANVAS SETUP
// ===========================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Virtual game dimensions (scaled to actual canvas)
const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;

// Resize canvas to fill window while maintaining aspect ratio
function resizeCanvas() {
    const aspectRatio = GAME_WIDTH / GAME_HEIGHT;
    const windowRatio = window.innerWidth / window.innerHeight;
    
    if (windowRatio > aspectRatio) {
        canvas.height = window.innerHeight;
        canvas.width = window.innerHeight * aspectRatio;
    } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerWidth / aspectRatio;
    }
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Scale context to virtual coordinates
function scaleContext() {
    const scaleX = canvas.width / GAME_WIDTH;
    const scaleY = canvas.height / GAME_HEIGHT;
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
}

// ===========================
// GAME STATE
// ===========================
const gameState = {
    playing: false,
    gameOver: false,
    score: 0,
    frame: 0
};

// ===========================
// TOILET (PLAYER)
// ===========================
const toilet = {
    x: 80,
    y: GAME_HEIGHT / 2,
    width: 40,
    height: 40,
    velocity: 0,
    gravity: 0.35,
    flapPower: -7,
    maxVelocity: 8,
    
    flap() {
        if (!gameState.gameOver) {
            this.velocity = this.flapPower;
            if (!gameState.playing) {
                gameState.playing = true;
            }
        }
    },
    
    update() {
        if (!gameState.playing) return;
        
        // Apply gravity
        this.velocity += this.gravity;
        
        // Clamp velocity
        if (this.velocity > this.maxVelocity) {
            this.velocity = this.maxVelocity;
        }
        
        // Update position
        this.y += this.velocity;
        
        // Check ceiling collision
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
            endGame();
        }
        
        // Check ground collision
        if (this.y + this.height > GAME_HEIGHT - 50) {
            this.y = GAME_HEIGHT - 50 - this.height;
            this.velocity = 0;
            endGame();
        }
    },
    
    draw() {
        // Draw toilet emoji
        ctx.font = '40px Arial';
        ctx.fillText('🚽', this.x - 5, this.y + 35);
    },
    
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
};

// ===========================
// PIPES
// ===========================
const pipes = {
    list: [],
    gap: 180,
    width: 60,
    speed: 1.5,
    spawnInterval: 110, // frames between spawns
    
    spawn() {
        const minY = 50;
        const maxY = GAME_HEIGHT - 50 - this.gap - 100;
        const topHeight = Math.random() * (maxY - minY) + minY;
        
        this.list.push({
            x: GAME_WIDTH,
            topHeight: topHeight,
            bottomY: topHeight + this.gap,
            scored: false
        });
    },
    
    update() {
        if (!gameState.playing) return;
        
        // Spawn new pipes
        if (gameState.frame % this.spawnInterval === 0) {
            this.spawn();
        }
        
        // Update pipe positions
        for (let i = this.list.length - 1; i >= 0; i--) {
            const pipe = this.list[i];
            pipe.x -= this.speed;
            
            // Remove off-screen pipes
            if (pipe.x + this.width < 0) {
                this.list.splice(i, 1);
                continue;
            }
            
            // Check collision
            if (this.checkCollision(pipe)) {
                endGame();
            }
            
            // Update score
            if (!pipe.scored && pipe.x + this.width < toilet.x) {
                pipe.scored = true;
                gameState.score++;
            }
        }
    },
    
    checkCollision(pipe) {
        const toiletBounds = toilet.getBounds();
        
        // Check if toilet is horizontally aligned with pipe
        if (toiletBounds.x + toiletBounds.width > pipe.x && 
            toiletBounds.x < pipe.x + this.width) {
            
            // Check if toilet hits top pipe or bottom pipe
            if (toiletBounds.y < pipe.topHeight || 
                toiletBounds.y + toiletBounds.height > pipe.bottomY) {
                return true;
            }
        }
        
        return false;
    },
    
    draw() {
        ctx.fillStyle = '#6B8E23';
        ctx.strokeStyle = '#556B2F';
        ctx.lineWidth = 3;
        
        for (const pipe of this.list) {
            // Top pipe
            ctx.fillRect(pipe.x, 0, this.width, pipe.topHeight);
            ctx.strokeRect(pipe.x, 0, this.width, pipe.topHeight);
            
            // Bottom pipe
            const bottomHeight = GAME_HEIGHT - 50 - pipe.bottomY;
            ctx.fillRect(pipe.x, pipe.bottomY, this.width, bottomHeight);
            ctx.strokeRect(pipe.x, pipe.bottomY, this.width, bottomHeight);
        }
    },
    
    reset() {
        this.list = [];
    }
};

// ===========================
// INPUT HANDLING
// ===========================
// Keyboard input
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        toilet.flap();
    }
    
    if (e.code === 'KeyR' && gameState.gameOver) {
        restart();
    }
});

// Mouse/Touch input
canvas.addEventListener('click', () => {
    toilet.flap();
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    toilet.flap();
});

// ===========================
// GAME LOGIC
// ===========================
function endGame() {
    if (!gameState.gameOver) {
        gameState.gameOver = true;
        gameState.playing = false;
    }
}

function restart() {
    gameState.playing = false;
    gameState.gameOver = false;
    gameState.score = 0;
    gameState.frame = 0;
    
    toilet.y = GAME_HEIGHT / 2;
    toilet.velocity = 0;
    
    pipes.reset();
}

// ===========================
// RENDERING
// ===========================
function drawBackground() {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}

function drawGround() {
    // Ground strip
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, GAME_HEIGHT - 50, GAME_WIDTH, 50);
    
    ctx.fillStyle = '#A0522D';
    for (let i = 0; i < GAME_WIDTH; i += 20) {
        ctx.fillRect(i, GAME_HEIGHT - 50, 10, 10);
    }
}

function drawScore() {
    ctx.fillStyle = '#000';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(gameState.score, GAME_WIDTH / 2, 60);
}

function drawGameOver() {
    if (!gameState.gameOver) return;
    
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Game Over text
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40);
    
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${gameState.score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10);
    ctx.fillText('Press R to Restart', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);
}

function drawStartMessage() {
    if (gameState.playing || gameState.gameOver) return;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Click or Press Space to Start', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80);
}

// ===========================
// GAME LOOP
// ===========================
function gameLoop() {
    scaleContext();
    
    // Clear and draw background
    drawBackground();
    drawGround();
    
    // Update game objects
    toilet.update();
    pipes.update();
    
    // Draw game objects
    pipes.draw();
    toilet.draw();
    
    // Draw UI
    drawScore();
    drawStartMessage();
    drawGameOver();
    
    // Increment frame counter
    if (gameState.playing) {
        gameState.frame++;
    }
    
    // Continue loop
    requestAnimationFrame(gameLoop);
}

// ===========================
// START GAME
// ===========================
gameLoop();
