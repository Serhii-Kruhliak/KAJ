// Game namespace to avoid global pollution
const CopChaseGame = {
    // Game state
    canvas: null,
    ctx: null,
    minimap: null,
    minimapCtx: null,
    gameRunning: false,
    score: 0,
    startTime: 0,
    
    // Game objects
    player: {
        x: 400,
        y: 300,
        width: 20,
        height: 20,
        speed: 3,
        health: 100,
        color: '#5b1616'
    },
    
    cops: [],
    powerups: [],
    obstacles: [],
    
    // Input handling
    keys: {},

    // Difficulty level
    difficulty: {
        level: 1,
        timeThresholds: [30, 60, 120, 180, 300, 450, 600], // seconds for each level
        baseScoreMultiplier: 1,
        currentScoreMultiplier: 1
    },
    
    // Game settings
    settings: {
        baseCopSpawnRate: 0.02,
        basePowerupSpawnRate: 0.01,
        baseMaxCops: 8,
        maxPowerups: 3,
        // Current values (will be calculated)
        copSpawnRate: 0.02,
        maxCops: 8
    },

    // Initialize game
    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.minimap = document.getElementById('minimap');
        this.minimapCtx = this.minimap.getContext('2d');
        
        // Resize canvas for responsive design
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.setupEventListeners();
        this.generateObstacles();
        this.startGame();
        
        // Hide loading
        document.getElementById('loading').style.display = 'none';
    },

    resizeCanvas() {
        const container = document.getElementById('gameContainer');
        const rect = container.getBoundingClientRect();
        
        if (window.innerWidth <= 1220 || window.innerHeight <= 820) {
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
        } else {
            this.canvas.width = 1200;
            this.canvas.height = 800;
        }
    },

    setupEventListeners() {
        // Keyboard input
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            e.preventDefault();
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            e.preventDefault();
        });

        // Touch controls for mobile
        let touchStartX, touchStartY;
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!touchStartX || !touchStartY) return;
            
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            const deltaX = touchX - touchStartX;
            const deltaY = touchY - touchStartY;
            
            // Reset keys
            this.keys = {};
            
            // Set movement based on swipe direction
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                this.keys[deltaX > 0 ? 'ArrowRight' : 'ArrowLeft'] = true;
            } else {
                this.keys[deltaY > 0 ? 'ArrowDown' : 'ArrowUp'] = true;
            }
        });

        // Restart button
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartGame();
        });
    },

    generateObstacles() {
        this.obstacles = [];
        const buffer = 30;
        let attempts = 0;

        // Generate random obstacles
        do {
            const obstacle = {
                x: Math.random() * (this.canvas.width - 60) + 30,
                y: Math.random() * (this.canvas.height - 60) + 30,
                width: 40 + Math.random() * 40,
                height: 40 + Math.random() * 40,
                color: '#0d7312'
            }

            const overlapsPlayer =
                obstacle.x < this.player.x + this.player.width + buffer &&
                obstacle.x + obstacle.width > this.player.x - buffer &&
                obstacle.y < this.player.y + this.player.height + buffer &&
                obstacle.y + obstacle.height > this.player.y - buffer;

            if (!overlapsPlayer) {
                this.obstacles.push(obstacle);
            }

            attempts++;

        } while (this.obstacles.length < 15 && attempts < 50);
    },

    startGame() {
        this.gameRunning = true;
        this.startTime = Date.now();
        this.score = 0;
        this.player.health = 100;
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height / 2;
        this.cops = [];
        this.powerups = [];

        // Reset difficulty
        this.difficulty.level = 1;
        this.difficulty.currentScoreMultiplier = 1;
        this.settings.copSpawnRate = this.settings.baseCopSpawnRate;
        this.settings.maxCops = this.settings.baseMaxCops;
        
        this.gameLoop();
    },

    gameLoop() {
        if (!this.gameRunning) return;
        
        this.update();
        this.render();
        this.renderMinimap();
        
        requestAnimationFrame(() => this.gameLoop());
    },

    update() {
        // Calculate survival time
        const survivalTime = (Date.now() - this.startTime) / 1000; // in seconds

        // Update difficulty based on survival time
        this.updateDifficulty(survivalTime);

        // Update score with current multiplier
        const baseScore = Math.floor(survivalTime * 10); // 10 points per second
        this.score = Math.floor(baseScore * this.difficulty.currentScoreMultiplier);
        document.getElementById('scoreValue').textContent = this.score;

        // Update player position
        this.updatePlayer();

        // Spawn cops with scaled spawn rate
        if (Math.random() < this.settings.copSpawnRate && this.cops.length < this.settings.maxCops) {
            this.spawnCop();
        }

        // Spawn power-ups (slightly increase spawn rate at higher difficulties)
        const powerupRate = this.settings.basePowerupSpawnRate * (1 + (this.difficulty.level - 1) * 0.1);
        if (Math.random() < powerupRate && this.powerups.length < this.settings.maxPowerups) {
            this.spawnPowerup();
        }

        // Update cops
        this.cops.forEach(cop => this.updateCop(cop));

        // Check collisions
        this.checkCollisions();

        // Update health bar
        const healthPercent = Math.max(0, this.player.health) / 100 * 100;
        document.getElementById('healthFill').style.width = healthPercent + '%';

        // Check game over
        if (this.player.health <= 0) {
            this.gameOver();
        }
    },

    updateDifficulty(survivalTime) {
        // Determine current difficulty level
        let newLevel = 1;
        for (let i = 0; i < this.difficulty.timeThresholds.length; i++) {
            if (survivalTime >= this.difficulty.timeThresholds[i]) {
                newLevel = i + 2; // Level 2, 3, 4, etc.
            }
        }

        // Check if difficulty level changed
        if (newLevel !== this.difficulty.level) {
            this.difficulty.level = newLevel;
            this.onDifficultyIncrease();
        }

        // Scale difficulty parameters based on current level
        const difficultyMultiplier = 1 + (this.difficulty.level - 1) * 0.4; // 40% increase per level

        // Increase cop spawn rate and max cops
        this.settings.copSpawnRate = Math.min(0.08, this.settings.baseCopSpawnRate * difficultyMultiplier);
        this.settings.maxCops = Math.min(20, Math.floor(this.settings.baseMaxCops * difficultyMultiplier));

        // Increase score multiplier (reward for surviving higher difficulty)
        this.difficulty.currentScoreMultiplier = 1 + (this.difficulty.level - 1) * 0.3; // 30% bonus per level

        // Optional: Make cops slightly faster at higher levels
        this.scaleCopSpeed();
    },

    onDifficultyIncrease() {
        // Visual feedback when difficulty increases
        console.log(`Difficulty increased to Level ${this.difficulty.level}!`);
    },

    scaleCopSpeed() {
        // Make existing cops slightly faster at higher difficulty levels
        const speedMultiplier = 1 + (this.difficulty.level - 1) * 0.05; // 5% faster per level
        this.cops.forEach(cop => {
        if (!cop.baseSpeed) {
            cop.baseSpeed = cop.speed; // Store original speed
        }
        cop.speed = cop.baseSpeed * speedMultiplier;
        });
    },

    updatePlayer() {
        let dx = 0, dy = 0;
        
        // Handle input (WASD and Arrow keys)
        if (this.keys.KeyW || this.keys.ArrowUp) dy = -this.player.speed;
        if (this.keys.KeyS || this.keys.ArrowDown) dy = this.player.speed;
        if (this.keys.KeyA || this.keys.ArrowLeft) dx = -this.player.speed;
        if (this.keys.KeyD || this.keys.ArrowRight) dx = this.player.speed;
        if (this.keys.Escape) this.player.health = 0;
        
        // Apply movement with boundary checking
        const newX = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x + dx));
        const newY = Math.max(0, Math.min(this.canvas.height - this.player.height, this.player.y + dy));
        
        // Check obstacle collisions
        const futurePlayer = { x: newX, y: newY, width: this.player.width, height: this.player.height };
        if (!this.checkObstacleCollision(futurePlayer)) {
            this.player.x = newX;
            this.player.y = newY;
        }
    },

    spawnCop() {
        const sides = ['top', 'right', 'bottom', 'left'];
        const side = sides[Math.floor(Math.random() * sides.length)];
        let x, y;
        
        switch (side) {
            case 'top':
                x = Math.random() * this.canvas.width;
                y = -30;
                break;
            case 'right':
                x = this.canvas.width + 30;
                y = Math.random() * this.canvas.height;
                break;
            case 'bottom':
                x = Math.random() * this.canvas.width;
                y = this.canvas.height + 30;
                break;
            case 'left':
                x = -30;
                y = Math.random() * this.canvas.height;
                break;
        }
        
        const baseSpeed = 1.5 + (this.difficulty.level - 1) * 0.6;

        const cop = {
            x: x,
            y: y,
            width: 18,
            height: 18,
            speed: baseSpeed,
            baseSpeed: baseSpeed, // Store for scaling
            color: this.difficulty.level > 3 ? '#a1ff5b' : '#f0ffe5', // Darker at higher levels
            health: this.difficulty.level > 2 ? 1.5 : 1 // Tougher cops at higher levels
        };

        this.cops.push(cop);
    },

    getDifficultyInfo() {
        return {
            level: this.difficulty.level,
            scoreMultiplier: this.difficulty.currentScoreMultiplier.toFixed(1),
            copsMax: this.settings.maxCops,
            spawnRate: (this.settings.copSpawnRate * 100).toFixed(1) + '%'
        };
    },

    spawnPowerup() {
        let x, y;
        let attempts = 0;
        
        do {
            x = Math.random() * (this.canvas.width - 20);
            y = Math.random() * (this.canvas.height - 20);
            attempts++;
        } while (this.checkObstacleCollision({x, y, width: 20, height: 20}) && attempts < 10);
        
        this.powerups.push({
            x: x,
            y: y,
            width: 15,
            height: 15,
            type: Math.random() < 0.5 ? 'health' : 'speed',
            color: Math.random() < 0.5 ? '#ff69b4' : '#ffd700',
            bobOffset: Math.random() * Math.PI * 2
        });
    },

    updateCop(cop) {
        // Simple AI: move towards player
        const dx = this.player.x - cop.x;
        const dy = this.player.y - cop.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            cop.x += (dx / distance) * cop.speed;
            cop.y += (dy / distance) * cop.speed;
        }
    },

    checkCollisions() {
        // Player-cop collisions
        this.cops.forEach((cop, index) => {
            if (this.isColliding(this.player, cop)) {
                this.player.health -= 10 * cop.health;
                this.cops.splice(index, 1);
                this.playSoundWithMediaAPI("assets/audio/damage.mp3");
                
                // Visual feedback
                document.getElementById('gameContainer').classList.add('player-hit');
                setTimeout(() => {
                    document.getElementById('gameContainer').classList.remove('player-hit');
                }, 200);
            }
        });
        
        // Player-powerup collisions
        this.powerups.forEach((powerup, index) => {
            if (this.isColliding(this.player, powerup)) {
                if (powerup.type === 'health') {
                    this.player.health = Math.min(100, this.player.health + 20);
                } else if (powerup.type === 'speed') {
                    // Temporary speed boost
                    this.player.speed = 4.2;
                    setTimeout(() => {
                        this.player.speed = 3;
                    }, 3000);
                }
                this.powerups.splice(index, 1);
                this.score += 25;
                this.playSoundWithMediaAPI("assets/audio/pwrup.mp3");
            }
        });
    },

    checkObstacleCollision(rect) {
        return this.obstacles.some(obstacle => this.isColliding(rect, obstacle));
    },

    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    },

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background pattern
        this.drawBackground();
        
        // Draw obstacles
        this.obstacles.forEach(obstacle => {
            this.ctx.fillStyle = obstacle.color;
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            // Add some shading
            this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
            this.ctx.fillRect(obstacle.x + 2, obstacle.y + 2, obstacle.width - 2, obstacle.height - 2);
        });
        
        // Draw powerups with bob animation
        this.powerups.forEach(powerup => {
            const bobY = powerup.y + Math.sin(Date.now() * 0.005 + powerup.bobOffset) * 3;
            this.ctx.fillStyle = powerup.color;
            this.ctx.fillRect(powerup.x, bobY, powerup.width, powerup.height);
            
            // Add glow effect
            this.ctx.shadowColor = powerup.color;
            this.ctx.shadowBlur = 10;
            this.ctx.fillRect(powerup.x, bobY, powerup.width, powerup.height);
            this.ctx.shadowBlur = 0;
        });
        
        // Draw cops
        this.cops.forEach(cop => {
            this.ctx.fillStyle = '#3c0080';
            this.ctx.fillRect(cop.x - 2, cop.y - 2, cop.width + 4, cop.height + 4);

            this.ctx.fillStyle = cop.color;
            this.ctx.fillRect(cop.x, cop.y, cop.width, cop.height);
            
            // Add cop details
            this.ctx.fillStyle = '#ff4017';
            this.ctx.fillRect(cop.x + 4, cop.y + 2, 5, 5);
            this.ctx.fillStyle = '#414fff';
            this.ctx.fillRect(cop.x + 11, cop.y + 2, 5, 5);
        });
        
        // Draw player
        this.ctx.fillStyle = this.player.color;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Add player details
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(this.player.x + 2, this.player.y + 3, 7, 7);
        this.ctx.fillRect(this.player.x + 12, this.player.y + 3, 7, 7);
        this.ctx.fillRect(this.player.x + 2, this.player.y + 12, 15, 6);

        this.ctx.fillStyle = "#4b0000"
        this.ctx.fillRect(this.player.x + 4, this.player.y + 4, 4, 4);
        this.ctx.fillRect(this.player.x + 14, this.player.y + 4, 4, 4);

        this.ctx.fillStyle = '#e20000';
        this.ctx.fillRect(this.player.x + 4, this.player.y + 13, 12, 5);
    },

    drawBackground() {
        // Draw a simple grid pattern
        this.ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x < this.canvas.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.canvas.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    },

    renderMinimap() {
        const scaleX = this.minimap.width / this.canvas.width;
        const scaleY = this.minimap.height / this.canvas.height;
        
        // Clear minimap
        this.minimapCtx.fillStyle = 'rgba(0,0,0,0.8)';
        this.minimapCtx.fillRect(0, 0, this.minimap.width, this.minimap.height);
        
        // Draw obstacles
        this.minimapCtx.fillStyle = '#8B4513';
        this.obstacles.forEach(obstacle => {
            this.minimapCtx.fillRect(
                obstacle.x * scaleX,
                obstacle.y * scaleY,
                obstacle.width * scaleX,
                obstacle.height * scaleY
            );
        });
        
        // Draw cops
        this.minimapCtx.fillStyle = '#ff0000';
        this.cops.forEach(cop => {
            this.minimapCtx.fillRect(
                cop.x * scaleX,
                cop.y * scaleY,
                4, 4
            );
        });
        
        // Draw powerups
        this.minimapCtx.fillStyle = '#ffff00';
        this.powerups.forEach(powerup => {
            this.minimapCtx.fillRect(
                powerup.x * scaleX,
                powerup.y * scaleY,
                3, 3
            );
        });
        
        // Draw player
        this.minimapCtx.fillStyle = '#00ff00';
        this.minimapCtx.fillRect(
            this.player.x * scaleX,
            this.player.y * scaleY,
            4, 4
        );
    },

    gameOver() {
        this.gameRunning = false;
        const timeSurvived = Math.floor((Date.now() - this.startTime) / 1000);

        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('timeSurvived').textContent = timeSurvived;
        document.getElementById('gameOver').style.display = 'block';

        this.playSoundWithMediaAPI("assets/audio/game_over.mp3");

        // Store high score in memory
        if (!this.highScore || this.score > this.highScore) {
            this.highScore = this.score;
        }

        // Save score to leaderboard
        this.saveScoreToLeaderboard(this.score, timeSurvived);
    },

    // Play sound
    async playSoundWithMediaAPI(audioUrl) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        try {
            // Fetch and decode the audio data
            const response = await fetch(audioUrl);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // Create source and play
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start(0);

            console.log("Audio is playing...");
        } catch (error) {
            console.error("Error playing sound:", error);
        }
    },

    // New method to save score to leaderboard
    async saveScoreToLeaderboard(score, timeSurvived) {
        try {
            // Get logged in user from session storage
            const username = sessionStorage.getItem('loggedInUser');

            if (!username) {
                console.warn('No logged in user found, score not saved to leaderboard');
                return;
            }

            // Only save if score is greater than 0
            if (score <= 0) {
                return;
            }

            const response = await fetch('php/save_score.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    score: score,
                    time_survived: timeSurvived,
                    timestamp: new Date().toISOString()
                })
            });

            const result = await response.json();

            if (result.status === 'success') {
                console.log('Score saved to leaderboard successfully');
    
                // Optionally show a message to the player if it's a high score
                if (result.is_high_score) {
                    this.showHighScoreMessage(result.rank);
                }
            } else {
                console.warn('Failed to save score:', result.message);
            }

        } catch (error) {
            console.error('Error saving score to leaderboard:', error);
        }
    },

    // Optional: Show high score achievement message
    showHighScoreMessage(rank) {
    // Create or update a high score message element
    let messageEl = document.getElementById('high-score-message');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'high-score-message';
        messageEl.style.cssText = `
            position: fixed;
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(45deg, #ff9a00, #ffd54f);
            color: #000;
            padding: 20px 30px;
            border-radius: 15px;
            font-size: 18px;
            font-weight: bold;
         text-align: center;
            z-index: 10000;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            animation: highScorePulse 2s ease-in-out;
        `;
        document.body.appendChild(messageEl);

        // Add CSS animation if not already present
        if (!document.getElementById('high-score-animation')) {
            const style = document.createElement('style');
            style.id = 'high-score-animation';
            style.textContent = `
                @keyframes highScorePulse {
                    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    let message = '';
    if (rank === 1) {
        message = '🏆 NEW HIGH SCORE! 🏆<br>You\'re #1 on the leaderboard!';
    } else if (rank <= 3) {
        message = `🥇 HIGH SCORE! 🥇<br>You made it to #${rank} on the leaderboard!`;
    } else if (rank <= 10) {
        message = `🎉 GREAT SCORE! 🎉<br>You're in the top 10 (#${rank})!`;
    } else {
        message = `✨ NICE SCORE! ✨<br>You made the leaderboard at #${rank}!`;
    }

    messageEl.innerHTML = message;
    messageEl.style.display = 'block';

    // Hide message after 4 seconds
    setTimeout(() => {
        messageEl.style.display = 'none';
        }, 4000);
    },

    // Optional: Add a method to view leaderboard from game over screen
    showLeaderboard() {
        window.location.href = 'leaderboard.html';
    },

    restartGame() {
        document.getElementById('gameOver').style.display = 'none';
        this.startGame();
    }
};

// DOM Content Loaded event listener
document.addEventListener("DOMContentLoaded", () => {
    // Initialize game when DOM is loaded
    CopChaseGame.init();

    // Setup leaderboard button event listener
    const leaderboardBtn = document.getElementById("leaderboardBtn");

    if (leaderboardBtn) {
        leaderboardBtn.addEventListener("click", () => {
            window.location.href = "leaderboard.html";
        });
    } else {
        console.warn("Leaderboard button not found.");
    }
});

// Handle page visibility for pause/resume
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause game logic could go here
    } else {
        // Resume game logic could go here
    }
});

// Export the game object for module usage
export default CopChaseGame;