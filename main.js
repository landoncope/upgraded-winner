// ===========================
// FLYING TOILET - FLAPPY BIRD CLONE
// A bathroom-themed endless runner game
// ===========================

// ===========================
// CONFIGURATION
// ===========================
// All game tunables in one place for easy balancing
const CONFIG = {
    // Canvas settings
    gameWidth: 600,
    gameHeight: 600,
    
    // Toilet physics
    gravity: 0.3,
    flapPower: -6.5,
    maxVelocity: 7,
    
    // Pipe settings
    pipeWidth: 60,
    baseSpeed: 1.2,
    maxSpeed: 3.5,
    speedIncrement: 0.12,  // 10% of baseSpeed per level
    
    baseGap: 200,
    minGap: 150,
    gapDecrement: 2,
    
    baseSpawnInterval: 180,
    minSpawnInterval: 110,
    spawnDecrement: 3,
    
    // Difficulty progression
    pipesPerLevel: 8,  // Every 8 pipes = new level
    
    // Ground height
    groundHeight: 50
};

// ===========================
// CANVAS SETUP
// ===========================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Use device pixel ratio for crisp rendering
const dpr = window.devicePixelRatio || 1;

// Virtual game dimensions (scaled to actual canvas)
const GAME_WIDTH = CONFIG.gameWidth;
const GAME_HEIGHT = CONFIG.gameHeight;

// Resize canvas to fill window while maintaining aspect ratio
function resizeCanvas() {
    const aspectRatio = GAME_WIDTH / GAME_HEIGHT;
    const windowRatio = window.innerWidth / window.innerHeight;
    
    if (windowRatio > aspectRatio) {
        canvas.height = window.innerHeight * dpr;
        canvas.width = window.innerHeight * aspectRatio * dpr;
    } else {
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerWidth / aspectRatio * dpr;
    }
    
    // Scale back for CSS
    canvas.style.width = (canvas.width / dpr) + 'px';
    canvas.style.height = (canvas.height / dpr) + 'px';
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
const STATE = {
    START: 'START',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER'
};

const gameState = {
    current: STATE.START,
    score: 0,
    highScore: 0,
    frame: 0,
    isMuted: false,
    level: 1,
    pipesPassed: 0,
    bestLevel: 1,
    showingHelp: false
};

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
            gameState.bestLevel = data.bestLevel || 1;
        } catch (e) {
            console.error('Failed to load game data');
        }
    }
}

function saveGameData() {
    const data = {
        highScore: gameState.highScore,
        isMuted: gameState.isMuted,
        bestLevel: gameState.bestLevel
    };
    localStorage.setItem('flyingToiletData', JSON.stringify(data));
}

loadGameData();

// ===========================
// AUDIO SYSTEM
// ===========================
// Generate simple sound effects using Web Audio API
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Background music
const bgMusic = new Audio();
bgMusic.src = 'https://cdn.pixabay.com/audio/2022/03/10/audio_4a409c29e6.mp3'; // "Funny Bit" by Coma-Media (Pixabay License)
bgMusic.loop = true;
bgMusic.volume = 0.3;

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
        if (gameState.isMuted) {
            bgMusic.pause();
        } else {
            bgMusic.play().catch(e => console.log('Music playback failed:', e));
        }
        saveGameData();
    },
    startMusic() {
        if (!gameState.isMuted) {
            bgMusic.play().catch(e => console.log('Music playback failed:', e));
        }
    },
    stopMusic() {
        bgMusic.pause();
        bgMusic.currentTime = 0;
    }
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
    gravity: CONFIG.gravity,
    flapPower: CONFIG.flapPower,
    maxVelocity: CONFIG.maxVelocity,
    
    flap() {
        if (gameState.current !== STATE.GAME_OVER) {
            this.velocity = this.flapPower;
            audio.playFlap();
            if (gameState.current === STATE.START) {
                gameState.current = STATE.PLAYING;
                audio.startMusic();
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
    gap: CONFIG.baseGap,
    width: CONFIG.pipeWidth,
    speed: CONFIG.baseSpeed,
    spawnInterval: CONFIG.baseSpawnInterval,
    
    // Calculate current difficulty based on level
    // Difficulty scales every CONFIG.pipesPerLevel pipes passed
    getCurrentGap() {
        const gap = CONFIG.baseGap - (gameState.level - 1) * CONFIG.gapDecrement;
        return Math.max(gap, CONFIG.minGap);
    },
    
    getCurrentSpeed() {
        const speed = CONFIG.baseSpeed + (gameState.level - 1) * CONFIG.speedIncrement;
        return Math.min(speed, CONFIG.maxSpeed);
    },
    
    getCurrentSpawnInterval() {
        const interval = CONFIG.baseSpawnInterval - (gameState.level - 1) * CONFIG.spawnDecrement;
        return Math.max(interval, CONFIG.minSpawnInterval);
    },
    
    spawn() {
        const minY = 50;
        const currentGap = this.getCurrentGap();
        const maxY = GAME_HEIGHT - CONFIG.groundHeight - currentGap - 100;
        const topHeight = Math.random() * (maxY - minY) + minY;
        
        this.list.push({
            x: GAME_WIDTH,
            topHeight: topHeight,
            bottomY: topHeight + currentGap,
            scored: false
        });
    },
    
    update() {
        if (gameState.current !== STATE.PLAYING) return;
        
        const currentSpeed = this.getCurrentSpeed();
        const currentInterval = this.getCurrentSpawnInterval();
        
        // Spawn new pipes at intervals (gets faster as level increases)
        if (gameState.frame % currentInterval === 0) {
            this.spawn();
        }
        
        // Update pipe positions and check collisions
        for (let i = this.list.length - 1; i >= 0; i--) {
            const pipe = this.list[i];
            pipe.x -= currentSpeed;
            
            // Remove off-screen pipes
            if (pipe.x + this.width < 0) {
                this.list.splice(i, 1);
                continue;
            }
            
            // Check collision
            if (this.checkCollision(pipe)) {
                endGame();
            }
            
            // Update score and check for level progression
            if (!pipe.scored && pipe.x + this.width < toilet.x) {
                pipe.scored = true;
                gameState.score++;
                gameState.pipesPassed++;
                audio.playScore();
                
                // Level up every N pipes - difficulty increases
                const newLevel = Math.floor(gameState.pipesPassed / CONFIG.pipesPerLevel) + 1;
                if (newLevel > gameState.level) {
                    gameState.level = newLevel;
                    if (gameState.level > gameState.bestLevel) {
                        gameState.bestLevel = gameState.level;
                    }
                }
            }
        }
    },
    
    checkCollision(pipe) {
        const toiletBounds = toilet.getBounds();
        
        // AABB collision detection: Check if toilet is horizontally aligned with pipe
        if (toiletBounds.x + toiletBounds.width > pipe.x && 
            toiletBounds.x < pipe.x + this.width) {
            
            // Check if toilet hits top pipe or bottom pipe (not in the gap)
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
    
    if (e.code === 'KeyP') {
        togglePause();
    }
    
    if (e.code === 'Escape') {
        if (gameState.showingHelp) {
            gameState.showingHelp = false;
        } else if (gameState.current === STATE.PAUSED) {
            togglePause();
        }
    }
});

// Mouse/Touch input
canvas.addEventListener('click', handleCanvasClick);

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleCanvasClick(touch);
});

// Enable audio context on first user interaction (required by browsers)
let audioInitialized = false;
function initAudio() {
    if (!audioInitialized) {
        audioContext.resume();
        audioInitialized = true;
    }
}

document.addEventListener('click', initAudio, { once: true });
document.addEventListener('keydown', initAudio, { once: true });

// ===========================
// GAME LOGIC
// ===========================
function endGame() {
    if (gameState.current !== STATE.GAME_OVER) {
        gameState.current = STATE.GAME_OVER;
        audio.playHit();
        audio.stopMusic();
        
        // Update high score and best level
        if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
        }
        if (gameState.level > gameState.bestLevel) {
            gameState.bestLevel = gameState.level;
        }
        saveGameData();
    }
}

function restart() {
    gameState.current = STATE.PLAYING;
    gameState.score = 0;
    gameState.frame = 0;
    gameState.level = 1;
    gameState.pipesPassed = 0;
    
    toilet.y = GAME_HEIGHT / 2;
    toilet.velocity = 0;
    
    pipes.reset();
    audio.startMusic();
}

function startGame() {
    gameState.current = STATE.PLAYING;
    toilet.flap();
}

function togglePause() {
    if (gameState.current === STATE.PLAYING) {
        gameState.current = STATE.PAUSED;
        bgMusic.pause();
    } else if (gameState.current === STATE.PAUSED) {
        gameState.current = STATE.PLAYING;
        if (!gameState.isMuted) {
            bgMusic.play().catch(e => console.log('Music playback failed:', e));
        }
    }
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
        // Main score with shadow
        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 4;
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.strokeText(gameState.score, GAME_WIDTH / 2, 60);
        ctx.fillText(gameState.score, GAME_WIDTH / 2, 60);
        
        // Level indicator (top left)
        ctx.fillStyle = '#333';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Level ${gameState.level}`, 10, 30);
        
        // Speed indicator (small visual feedback)
        const currentSpeed = pipes.getCurrentSpeed();
        const speedPercent = ((currentSpeed - CONFIG.baseSpeed) / (CONFIG.maxSpeed - CONFIG.baseSpeed)) * 100;
        ctx.fillStyle = '#666';
        ctx.font = '14px Arial';
        ctx.fillText(`Speed: ${Math.round(speedPercent)}%`, 10, 50);
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

function drawSmallButton(text, x, y, width, height) {
    // Smaller button variant
    ctx.fillStyle = 'rgba(70, 130, 180, 0.8)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#4682B4';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);
}

function drawHUD() {
    if (gameState.current === STATE.PLAYING || gameState.current === STATE.PAUSED) {
        // Pause button (top right)
        drawSmallButton('❚❚', GAME_WIDTH - 60, 10, 50, 35);
        
        // Mute indicator (top right, below pause)
        const muteIcon = gameState.isMuted ? '🔇' : '🔊';
        ctx.font = '24px Arial';
        ctx.fillText(muteIcon, GAME_WIDTH - 35, 65);
    }
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
    
    // Help button
    drawSmallButton('?', GAME_WIDTH / 2 - 25, 450, 50, 40);
    
    // Mute button
    const muteText = gameState.isMuted ? '🔇 MUTED' : '🔊 SOUND ON';
    ctx.fillStyle = '#666';
    ctx.font = '18px Arial';
    ctx.fillText(muteText, GAME_WIDTH / 2, 510);
    
    // High score
    if (gameState.highScore > 0) {
        ctx.fillStyle = '#888';
        ctx.font = '20px Arial';
        ctx.fillText(`Best Score: ${gameState.highScore}`, GAME_WIDTH / 2, 545);
        ctx.font = '16px Arial';
        ctx.fillText(`Best Level: ${gameState.bestLevel}`, GAME_WIDTH / 2, 565);
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
    ctx.fillText('GAME OVER', GAME_WIDTH / 2, 140);
    
    // Stats panel
    ctx.fillStyle = '#FFF';
    ctx.font = '28px Arial';
    ctx.fillText(`Score: ${gameState.score}`, GAME_WIDTH / 2, 200);
    ctx.font = '22px Arial';
    ctx.fillText(`Level Reached: ${gameState.level}`, GAME_WIDTH / 2, 235);
    ctx.fillText(`Pipes Passed: ${gameState.pipesPassed}`, GAME_WIDTH / 2, 265);
    
    // Best stats
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('BEST STATS', GAME_WIDTH / 2, 310);
    ctx.fillStyle = '#FFF';
    ctx.font = '20px Arial';
    ctx.fillText(`High Score: ${gameState.highScore}`, GAME_WIDTH / 2, 340);
    ctx.fillText(`Best Level: ${gameState.bestLevel}`, GAME_WIDTH / 2, 365);
    
    // Restart button
    drawButton('RESTART', GAME_WIDTH / 2 - 80, 400, 160, 50);
    
    // Help button
    drawSmallButton('?', GAME_WIDTH / 2 - 25, 465, 50, 35);
    
    // Mute button
    const muteText = gameState.isMuted ? 'UNMUTE (M)' : 'MUTE (M)';
    ctx.fillStyle = '#AAA';
    ctx.font = '16px Arial';
    ctx.fillText(muteText, GAME_WIDTH / 2, 525);
}

function drawPauseScreen() {
    if (gameState.current !== STATE.PAUSED) return;
    
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Pause text
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 64px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);
    
    ctx.font = '24px Arial';
    ctx.fillText('Press P to Resume', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40);
}

function drawHelpOverlay() {
    if (!gameState.showingHelp) return;
    
    // Full overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Help panel
    ctx.fillStyle = '#FFF';
    ctx.fillRect(30, 40, GAME_WIDTH - 60, GAME_HEIGHT - 80);
    
    ctx.fillStyle = '#2E7D32';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('HOW TO PLAY', GAME_WIDTH / 2, 90);
    
    // Instructions
    ctx.fillStyle = '#333';
    ctx.font = '18px Arial';
    ctx.textAlign = 'left';
    const leftMargin = 50;
    let yPos = 140;
    
    ctx.fillText('🎯 OBJECTIVE:', leftMargin, yPos);
    yPos += 25;
    ctx.font = '16px Arial';
    ctx.fillText('Keep the toilet flying through pipes', leftMargin + 10, yPos);
    yPos += 20;
    ctx.fillText('without crashing. Score points by passing', leftMargin + 10, yPos);
    yPos += 20;
    ctx.fillText('pipes. Game gets harder every 5 pipes!', leftMargin + 10, yPos);
    yPos += 35;
    
    ctx.font = 'bold 18px Arial';
    ctx.fillText('🎮 CONTROLS:', leftMargin, yPos);
    yPos += 25;
    ctx.font = '16px Arial';
    ctx.fillText('• SPACE or ↑ or CLICK/TAP - Flap', leftMargin + 10, yPos);
    yPos += 25;
    ctx.fillText('• P - Pause/Resume', leftMargin + 10, yPos);
    yPos += 25;
    ctx.fillText('• M - Mute/Unmute sounds', leftMargin + 10, yPos);
    yPos += 25;
    ctx.fillText('• R - Restart (after game over)', leftMargin + 10, yPos);
    yPos += 25;
    ctx.fillText('• ESC - Close this help', leftMargin + 10, yPos);
    yPos += 35;
    
    ctx.font = 'bold 18px Arial';
    ctx.fillText('📊 PROGRESSION:', leftMargin, yPos);
    yPos += 25;
    ctx.font = '16px Arial';
    ctx.fillText('• Every 5 pipes = Level Up!', leftMargin + 10, yPos);
    yPos += 25;
    ctx.fillText('• Speed increases gradually', leftMargin + 10, yPos);
    yPos += 25;
    ctx.fillText('• Pipe gaps get tighter', leftMargin + 10, yPos);
    yPos += 35;
    
    ctx.font = '14px Arial';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText('Audio: Procedurally generated sound effects', GAME_WIDTH / 2, yPos + 10);
    ctx.fillText('Graphics: Canvas 2D rendering', GAME_WIDTH / 2, yPos + 30);
    
    // Close button
    drawButton('CLOSE', GAME_WIDTH / 2 - 70, GAME_HEIGHT - 90, 140, 45);
    ctx.fillStyle = '#666';
    ctx.font = '14px Arial';
    ctx.fillText('or press ESC', GAME_WIDTH / 2, GAME_HEIGHT - 30);
}

// UI interaction helpers
const buttons = {
    playButton: { x: GAME_WIDTH / 2 - 80, y: 380, width: 160, height: 50 },
    restartButton: { x: GAME_WIDTH / 2 - 80, y: 400, width: 160, height: 50 },
    helpButtonStart: { x: GAME_WIDTH / 2 - 25, y: 450, width: 50, height: 40 },
    helpButtonGameOver: { x: GAME_WIDTH / 2 - 25, y: 465, width: 50, height: 35 },
    pauseButton: { x: GAME_WIDTH - 60, y: 10, width: 50, height: 35 },
    closeHelpButton: { x: GAME_WIDTH / 2 - 70, y: GAME_HEIGHT - 90, width: 140, height: 45 }
};

function isPointInButton(x, y, button) {
    return x >= button.x && x <= button.x + button.width &&
           y >= button.y && y <= button.y + button.height;
}

function handleCanvasClick(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = GAME_WIDTH / (canvas.width / dpr);
    const scaleY = GAME_HEIGHT / (canvas.height / dpr);
    const clickX = (event.clientX - rect.left) * scaleX;
    const clickY = (event.clientY - rect.top) * scaleY;
    
    // Help overlay takes priority
    if (gameState.showingHelp) {
        if (isPointInButton(clickX, clickY, buttons.closeHelpButton)) {
            gameState.showingHelp = false;
        }
        return;
    }
    
    if (gameState.current === STATE.START) {
        if (isPointInButton(clickX, clickY, buttons.playButton)) {
            startGame();
        } else if (isPointInButton(clickX, clickY, buttons.helpButtonStart)) {
            gameState.showingHelp = true;
        } else {
            toilet.flap();
        }
    } else if (gameState.current === STATE.PLAYING) {
        if (isPointInButton(clickX, clickY, buttons.pauseButton)) {
            togglePause();
        } else {
            toilet.flap();
        }
    } else if (gameState.current === STATE.PAUSED) {
        if (isPointInButton(clickX, clickY, buttons.pauseButton)) {
            togglePause();
        }
    } else if (gameState.current === STATE.GAME_OVER) {
        if (isPointInButton(clickX, clickY, buttons.restartButton)) {
            restart();
        } else if (isPointInButton(clickX, clickY, buttons.helpButtonGameOver)) {
            gameState.showingHelp = true;
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
    if (gameState.current === STATE.PLAYING) {
        toilet.update();
        pipes.update();
        gameState.frame++;
    }
    
    // Draw game objects
    pipes.draw();
    toilet.draw();
    
    // Draw UI layers
    drawScore();
    drawHUD();
    drawStartScreen();
    drawGameOver();
    drawPauseScreen();
    
    // Help overlay on top of everything
    drawHelpOverlay();
    
    // Continue loop
    requestAnimationFrame(gameLoop);
}

// ===========================
// START GAME
// ===========================
gameLoop();
