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
// LOCAL STORAGE
// ===========================
function loadGameData() {
    const saved = localStorage.getItem('flyingToiletData');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            gameState.highScore = data.highScore || 0;
            gameState.isMuted = data.isMuted || false;
        } catch (e) {
            console.error('Failed to load game data');
        }
    }
}

function saveGameData() {
    const data = {
        highScore: gameState.highScore,
        isMuted: gameState.isMuted
    };
    localStorage.setItem('flyingToiletData', JSON.stringify(data));
}

loadGameData();

// ===========================
// AUDIO SYSTEM
// ===========================
// Generate simple sound effects using Web Audio API
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function createFlapSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 400;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

function createScoreSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
}

function createHitSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 100;
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}

const audio = {
    playFlap() {
        if (!gameState.isMuted) {
            createFlapSound();
        }
    },
    playScore() {
        if (!gameState.isMuted) {
            createScoreSound();
        }
    },
    playHit() {
        if (!gameState.isMuted) {
            createHitSound();
        }
    },
    toggleMute() {
        gameState.isMuted = !gameState.isMuted;
        saveGameData();
    }
};

// ===========================
// GAME STATE
// ===========================
const STATE = {
    START: 'START',
    PLAYING: 'PLAYING',
    GAME_OVER: 'GAME_OVER'
};

const gameState = {
    current: STATE.START,
    score: 0,
    highScore: 0,
    frame: 0,
    isMuted: false
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
        if (gameState.current !== STATE.GAME_OVER) {
            this.velocity = this.flapPower;
            audio.playFlap();
            if (gameState.current === STATE.START) {
                gameState.current = STATE.PLAYING;
            }
        }
    },
    
    update() {
        if (gameState.current !== STATE.PLAYING) return;
        
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
        // Draw detailed toilet with lid and bowl
        const tx = this.x;
        const ty = this.y;
        
        // Toilet bowl (main body)
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.ellipse(tx + 20, ty + 30, 18, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#CCC';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Toilet tank (back)
        ctx.fillStyle = '#F5F5F5';
        ctx.fillRect(tx + 8, ty + 5, 24, 18);
        ctx.strokeStyle = '#CCC';
        ctx.strokeRect(tx + 8, ty + 5, 24, 18);
        
        // Toilet seat
        ctx.fillStyle = '#87CEEB';
        ctx.beginPath();
        ctx.ellipse(tx + 20, ty + 28, 16, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#6B9DC4';
        ctx.stroke();
        
        // Flush handle
        ctx.strokeStyle = '#AAA';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx + 30, ty + 12);
        ctx.lineTo(tx + 35, ty + 12);
        ctx.stroke();
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
        if (gameState.current !== STATE.PLAYING) return;
        
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
                audio.playScore();
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
        // Draw glossy PVC pipes with gradients
        for (const pipe of this.list) {
            // Top pipe
            const topGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + this.width, 0);
            topGradient.addColorStop(0, '#8FBC8F');
            topGradient.addColorStop(0.5, '#A8D5A8');
            topGradient.addColorStop(1, '#7DA87D');
            ctx.fillStyle = topGradient;
            ctx.fillRect(pipe.x, 0, this.width, pipe.topHeight);
            
            // Top pipe cap
            ctx.fillStyle = '#6B8E6B';
            ctx.fillRect(pipe.x - 3, pipe.topHeight - 20, this.width + 6, 20);
            
            // Shine effect on top pipe
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(pipe.x + 5, 0, 15, pipe.topHeight - 20);
            
            // Bottom pipe
            const bottomHeight = GAME_HEIGHT - 50 - pipe.bottomY;
            const bottomGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + this.width, 0);
            bottomGradient.addColorStop(0, '#8FBC8F');
            bottomGradient.addColorStop(0.5, '#A8D5A8');
            bottomGradient.addColorStop(1, '#7DA87D');
            ctx.fillStyle = bottomGradient;
            ctx.fillRect(pipe.x, pipe.bottomY, this.width, bottomHeight);
            
            // Bottom pipe cap
            ctx.fillStyle = '#6B8E6B';
            ctx.fillRect(pipe.x - 3, pipe.bottomY, this.width + 6, 20);
            
            // Shine effect on bottom pipe
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(pipe.x + 5, pipe.bottomY + 20, 15, bottomHeight - 20);
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
        if (gameState.current === STATE.PLAYING || gameState.current === STATE.START) {
            toilet.flap();
        }
    }
    
    if (e.code === 'KeyR' && gameState.current === STATE.GAME_OVER) {
        restart();
    }
    
    if (e.code === 'KeyM') {
        audio.toggleMute();
    }
});

// Mouse/Touch input
canvas.addEventListener('click', handleCanvasClick);

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleCanvasClick(touch);
});

// ===========================
// GAME LOGIC
// ===========================
function endGame() {
    if (gameState.current !== STATE.GAME_OVER) {
        gameState.current = STATE.GAME_OVER;
        audio.playHit();
        
        // Update high score
        if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
            saveGameData();
        }
    }
}

function restart() {
    gameState.current = STATE.PLAYING;
    gameState.score = 0;
    gameState.frame = 0;
    
    toilet.y = GAME_HEIGHT / 2;
    toilet.velocity = 0;
    
    pipes.reset();
}

function startGame() {
    gameState.current = STATE.PLAYING;
    toilet.flap();
}

// ===========================
// RENDERING
// ===========================
function drawBackground() {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, '#B0E0E6');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Bathroom tile pattern
    ctx.strokeStyle = '#D3D3D3';
    ctx.lineWidth = 1;
    const tileSize = 40;
    
    for (let x = 0; x < GAME_WIDTH; x += tileSize) {
        for (let y = 0; y < GAME_HEIGHT - 50; y += tileSize) {
            ctx.strokeRect(x, y, tileSize, tileSize);
        }
    }
}

function drawGround() {
    // Bath mat / tiled floor
    const gradient = ctx.createLinearGradient(0, GAME_HEIGHT - 50, 0, GAME_HEIGHT);
    gradient.addColorStop(0, '#D2691E');
    gradient.addColorStop(1, '#8B4513');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, GAME_HEIGHT - 50, GAME_WIDTH, 50);
    
    // Mat texture
    ctx.fillStyle = '#A0522D';
    for (let i = 0; i < GAME_WIDTH; i += 15) {
        for (let j = 0; j < 50; j += 15) {
            ctx.fillRect(i, GAME_HEIGHT - 50 + j, 8, 8);
        }
    }
}

function drawScore() {
    if (gameState.current !== STATE.START) {
        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 4;
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.strokeText(gameState.score, GAME_WIDTH / 2, 60);
        ctx.fillText(gameState.score, GAME_WIDTH / 2, 60);
    }
}

function drawButton(text, x, y, width, height) {
    // Button background with gradient
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, '#4CAF50');
    gradient.addColorStop(1, '#45a049');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
    
    // Button border
    ctx.strokeStyle = '#2E7D32';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);
    
    // Button text
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);
}

function drawStartScreen() {
    if (gameState.current !== STATE.START) return;
    
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Title
    ctx.fillStyle = '#2E7D32';
    ctx.font = 'bold 64px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Flying Toilet', GAME_WIDTH / 2, 120);
    
    // Toilet emoji decoration
    ctx.font = '80px Arial';
    ctx.fillText('🚽', GAME_WIDTH / 2, 200);
    
    // Instructions
    ctx.fillStyle = '#333';
    ctx.font = '20px Arial';
    ctx.fillText('Tap/Space to flap', GAME_WIDTH / 2, 280);
    ctx.fillText('Avoid the pipes', GAME_WIDTH / 2, 310);
    ctx.fillText('Press M to mute', GAME_WIDTH / 2, 340);
    
    // Play button
    drawButton('PLAY', GAME_WIDTH / 2 - 80, 380, 160, 50);
    
    // Mute button
    const muteText = gameState.isMuted ? '🔇 MUTED' : '🔊 SOUND ON';
    ctx.fillStyle = '#666';
    ctx.font = '18px Arial';
    ctx.fillText(muteText, GAME_WIDTH / 2, 460);
    
    // High score
    if (gameState.highScore > 0) {
        ctx.fillStyle = '#888';
        ctx.font = '20px Arial';
        ctx.fillText(`Best: ${gameState.highScore}`, GAME_WIDTH / 2, 500);
    }
}

function drawGameOver() {
    if (gameState.current !== STATE.GAME_OVER) return;
    
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Game Over text
    ctx.fillStyle = '#FF6B6B';
    ctx.font = 'bold 56px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', GAME_WIDTH / 2, 180);
    
    // Current score
    ctx.fillStyle = '#FFF';
    ctx.font = '32px Arial';
    ctx.fillText(`Score: ${gameState.score}`, GAME_WIDTH / 2, 240);
    
    // High score
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`Best: ${gameState.highScore}`, GAME_WIDTH / 2, 280);
    
    // Restart button
    drawButton('RESTART', GAME_WIDTH / 2 - 80, 320, 160, 50);
    
    // Mute button
    const muteText = gameState.isMuted ? 'UNMUTE (M)' : 'MUTE (M)';
    ctx.fillStyle = '#AAA';
    ctx.font = '18px Arial';
    ctx.fillText(muteText, GAME_WIDTH / 2, 400);
}

// UI interaction helpers
const buttons = {
    playButton: { x: GAME_WIDTH / 2 - 80, y: 380, width: 160, height: 50 },
    restartButton: { x: GAME_WIDTH / 2 - 80, y: 320, width: 160, height: 50 }
};

function isPointInButton(x, y, button) {
    return x >= button.x && x <= button.x + button.width &&
           y >= button.y && y <= button.y + button.height;
}

function handleCanvasClick(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = GAME_WIDTH / canvas.width;
    const scaleY = GAME_HEIGHT / canvas.height;
    const clickX = (event.clientX - rect.left) * scaleX;
    const clickY = (event.clientY - rect.top) * scaleY;
    
    if (gameState.current === STATE.START) {
        if (isPointInButton(clickX, clickY, buttons.playButton)) {
            startGame();
        } else {
            toilet.flap();
        }
    } else if (gameState.current === STATE.PLAYING) {
        toilet.flap();
    } else if (gameState.current === STATE.GAME_OVER) {
        if (isPointInButton(clickX, clickY, buttons.restartButton)) {
            restart();
        }
    }
}

// ===========================
// GAME LOOP
// ===========================
function gameLoop() {
    scaleContext();
    
    // Clear and draw background
    drawBackground();
    drawGround();
    
    // Update game objects (only in PLAYING state)
    toilet.update();
    pipes.update();
    
    // Draw game objects
    pipes.draw();
    toilet.draw();
    
    // Draw UI
    drawScore();
    drawStartScreen();
    drawGameOver();
    
    // Increment frame counter
    if (gameState.current === STATE.PLAYING) {
        gameState.frame++;
    }
    
    // Continue loop
    requestAnimationFrame(gameLoop);
}

// ===========================
// START GAME
// ===========================
gameLoop();
