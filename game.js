// ===== GAME STATE =====
let gameState = {
    player: {
        playerId: null,
        username: "",
        character: "SpongeBob",
        currentXP: 50,        // Starting XP
        totalXP: 0,
        currentLevel: 1,
        completedLevels: [],  // Track which setting levels (1-4) are fully complete
        completedSubLevels: [],  // Track individual sub-levels like "1-1", "1-15", "2-3"
        answeredQuestions: [],
        completedStories: [],
        adventuresPlayed: 0,
        achievements: []
    },
    currentTab: "levels",
    currentStoryPage: 0,
    currentSettingView: null  // Which setting (1-4) is currently showing its 30 levels
};

// ===== STORY AUDIO PLAYER =====
let storyAudioPlayer = null;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    loadGameState();
    setupEventListeners();
    initializeStoryAudioPlayer();
    
    // Show welcome screen if no saved game
    if (!gameState.player.playerId) {
        showScreen('welcome-screen');
    } else {
        showScreen('game-screen');
        updateUI();
        setTimeout(() => {
            renderSettings();  // Show the 4 main settings first
            renderStories();
        }, 100);
            renderAdventures();  // FIXED: Add adventures rendering
    }
});

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Character selection - Show introduction modal
    document.querySelectorAll('.character-card').forEach(card => {
        card.addEventListener('click', function() {
            const characterName = this.dataset.character;
            selectedCharacterTemp = characterName;
            showCharacterIntro(characterName);
        });
    });

    // Character intro modal buttons
    document.getElementById('choose-character-btn').addEventListener('click', confirmCharacterChoice);
    document.getElementById('see-others-btn').addEventListener('click', function() {
        stopAllCharacterAudio();
        selectedCharacterTemp = null; // Reset temp selection when seeing others
        closeCharacterIntro();
    });

    // Start game
    document.getElementById('start-btn').addEventListener('click', startGame);

    // New game button
    document.getElementById('new-game-btn').addEventListener('click', function() {
        if (confirm('Start a new game? All progress will be lost.')) {
            stopAllCharacterAudio();
            localStorage.removeItem('spongeBobMathGame');
            
            gameState = {
                player: {
                    playerId: null,
                    username: "",
                    character: "SpongeBob",
                    currentXP: 50,
                    totalXP: 0,
                    currentLevel: 1,
                    completedLevels: [],
                    completedSubLevels: [],
                    answeredQuestions: [],
                    completedStories: [],
                    adventuresPlayed: 0,
                    achievements: []
                },
                currentTab: "levels",
                currentStoryPage: 0,
                currentSettingView: null
            };
            
            showScreen('welcome-screen');
        }
    });

    // Change character button
    document.getElementById('change-character-btn').addEventListener('click', function() {
        if (confirm('Change your character? Progress will be kept.')) {
            stopAllCharacterAudio();
            selectedCharacterTemp = null;
            enableCharacterSelection();
            showScreen('welcome-screen');
        }
    });

    // Tab navigation
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });

    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.classList.remove('active');
            
            if (modal.id === 'character-intro-modal') {
                stopAllCharacterAudio();
                selectedCharacterTemp = null;
            }

            if (modal.id === 'story-modal') {
            stopStoryAudio();
            }
            
            // FIXED: Stay in sub-levels view when closing questions modal
            if (modal.id === 'questions-modal' && gameState.currentSettingView !== null) {
                renderSubLevels(gameState.currentSettingView);
            }
        });
    });

    // Story navigation
    document.getElementById('story-prev').addEventListener('click', () => navigateStory(-1));
    document.getElementById('story-next').addEventListener('click', () => navigateStory(1));
}

// ===== CHARACTER SELECTION =====
let selectedCharacterTemp = null;

function showCharacterIntro(characterName) {
    const intro = CHARACTER_INTROS[characterName];
    if (!intro) {
        console.error("Character not found:", characterName);
        return;
    }

    // Play character audio
    const audioMap = {
        SpongeBob: "spongebob-audio",
        Patrick: "patrick-audio",
        Sandy: "sandy-audio",
        Squidward: "squidward-audio"
    };

    const audioId = audioMap[characterName];
    if (audioId) {
        document.querySelectorAll('audio[id$="-audio"]').forEach(a => {
            a.pause();
            a.currentTime = 0;
        });
        
        const audio = document.getElementById(audioId);
        if (audio) audio.play();
    }

    // Populate modal
    document.getElementById('intro-character-name').textContent = intro.name;
    document.getElementById('intro-character-quote').textContent = intro.quote;
    document.getElementById('intro-character-description').textContent = intro.description;
    
    const imgElement = document.getElementById('intro-character-img');
    imgElement.src = intro.image;
    imgElement.alt = intro.name;
    imgElement.onerror = function() {
        this.style.display = 'none';
        this.parentElement.innerHTML = `<span style="font-size: 5em;">${CHARACTER_EMOJIS[characterName]}</span>`;
    };

    const traitsList = document.getElementById('intro-character-traits');
    traitsList.innerHTML = intro.traits.map(trait => `<li>${trait}</li>`).join('');

    document.getElementById('character-intro-modal').classList.add('active');
}

function stopAllCharacterAudio() {
    const audios = [
        document.getElementById("spongebob-audio"),
        document.getElementById("patrick-audio"),
        document.getElementById("sandy-audio"),
        document.getElementById("squidward-audio")
    ];
    
    audios.forEach(audio => {
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    });
}

function closeCharacterIntro() {
    document.getElementById('character-intro-modal').classList.remove('active');
    // Don't reset selectedCharacterTemp here - keep the selection!
}

function confirmCharacterChoice() {
    if (selectedCharacterTemp) {
        // Visual feedback: mark the selected character card
        document.querySelectorAll('.character-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        const selectedCard = document.querySelector(`.character-card[data-character="${selectedCharacterTemp}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
        
        stopAllCharacterAudio();
        closeCharacterIntro();
        
        showNotification(`${selectedCharacterTemp} selected! Now enter your name and click Start Adventure!`, 'success');
    }
}

function enableCharacterSelection() {
    document.querySelectorAll('.character-card').forEach(card => {
        card.style.pointerEvents = 'auto';
        card.style.opacity = '1';
    });
}

// ===== START GAME =====
function startGame() {
    const name = document.getElementById('player-name').value.trim();
    
    if (!name) {
        showNotification('Please enter your name!', 'warning');
        return;
    }
    
    if (!selectedCharacterTemp) {
        showNotification('Please choose a character!', 'warning');
        return;
    }
    
    // Initialize player
    gameState.player.playerId = 'player_' + Date.now();
    gameState.player.username = name;
    gameState.player.character = selectedCharacterTemp;
    
    // Stop character audio
    stopAllCharacterAudio();
    
    // Save and show game screen
    saveGameState();
    showScreen('game-screen');
    updateUI();
    renderSettings();
    renderStories();
    renderAdventures();
    
    showNotification(`Welcome, ${name}! Let's learn circle geometry! 🎉`, 'success');
}

// ===== SCREEN MANAGEMENT =====
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// ===== TAB SWITCHING =====
function switchTab(tabName) {
    gameState.currentTab = tabName;
    
    // Update active tab button
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });
    
    // Update active content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + '-content').classList.add('active');
    
    // Render appropriate content
    if (tabName === 'levels') {
        if (gameState.currentSettingView === null) {
            renderSettings();
        } else {
            renderSubLevels(gameState.currentSettingView);
        }
    } else if (tabName === 'story') {
        renderStories();
    } else if (tabName === 'adventure') {  // ADD THIS
        renderAdventures();
    } else if (tabName === 'progress') {
        renderProgress();
    }
}

// ====================================================================
// FIXED MINI-GAME CODE WITH DEBUGGING
// Replace your adventure functions (lines 855-1219) with this
// ====================================================================

// ===== RENDER ADVENTURES =====
function renderAdventures() {
    console.log("✅ renderAdventures called");
    const container = document.getElementById('adventure-list');
    
    if (!container) {
        console.error("❌ adventure-list container not found");
        return;
    }
    
    container.innerHTML = '';
    
    if (!ADVENTURES || ADVENTURES.length === 0) {
        console.error("❌ No ADVENTURES data found");
        container.innerHTML = '<p class="info-text">No mini-games available yet!</p>';
        return;
    }
    
    console.log(`✅ Found ${ADVENTURES.length} adventures`);
    
    ADVENTURES.forEach(adventure => {
        const card = document.createElement('div');
        card.className = 'adventure-card';
        
        card.innerHTML = `
            <div class="adventure-icon">${adventure.icon}</div>
            <h3>${adventure.adventureName}</h3>
            <p class="adventure-description">${adventure.description}</p>
            <div class="adventure-info">
                <span class="adventure-difficulty">${adventure.difficulty}</span>
                <span class="adventure-reward">+${adventure.xpReward} XP</span>
            </div>
            <button class="btn-primary play-adventure-btn">Play Now!</button>
        `;
        
        container.appendChild(card);
        
        // Attach click listener to the button inside this card
        const playBtn = card.querySelector('.play-adventure-btn');
        playBtn.addEventListener('click', () => {
            console.log(`🎮 Starting adventure: ${adventure.adventureName}`);
            startAdventure(adventure);
        });
    });
}

// ===== START ADVENTURE =====
function startAdventure(adventure) {
    console.log("🎮 startAdventure called for:", adventure.adventureName);
    
    const modal = document.getElementById('adventure-modal');
    const container = document.getElementById('adventure-game-container');
    const title = document.getElementById('adventure-title');
    
    if (!modal) {
        console.error("❌ adventure-modal not found");
        return;
    }
    
    if (!container) {
        console.error("❌ adventure-game-container not found");
        return;
    }
    
    if (title) title.textContent = adventure.adventureName;
    
    container.innerHTML = '';
    modal.classList.add('active');
    
    console.log(`📝 Adventure type: ${adventure.type}`);
    
    // Short delay to ensure modal is visible before creating game
    setTimeout(() => {
        if (adventure.type === 'clicking-game') {
            console.log("🎯 Creating clicking game");
            createClickingGame(container, adventure);
        } else if (adventure.type === 'timing-game') {
            console.log("⏱️ Creating timing game");
            createTimingGame(container, adventure);
        } else {
            console.log("🎲 Creating simple game");
            createSimpleGame(container, adventure);
        }
    }, 100);
}

// ===== CLICKING GAME =====
function createClickingGame(container, adventure) {
    console.log("🎯 createClickingGame called");
    
    container.innerHTML = `
        <div class="mini-game-wrapper">
            <div class="game-info">
                <div class="game-stat">
                    <span class="stat-icon">⏱️</span>
                    <span>Time: <strong id="game-time">${adventure.gameData.duration}</strong>s</span>
                </div>
                <div class="game-stat">
                    <span class="stat-icon">🎯</span>
                    <span>Score: <strong id="game-score">0</strong></span>
                </div>
                <div class="game-stat">
                    <span class="stat-icon">⭐</span>
                    <span>Target: <strong>${adventure.gameData.targetScore}</strong></span>
                </div>
            </div>
            <div class="game-canvas-wrapper">
                <canvas id="game-canvas" width="600" height="400" style="border: 3px solid #667eea; border-radius: 10px;"></canvas>
                <div id="game-message" class="game-message" style="margin-top: 15px; font-size: 18px; font-weight: bold; color: #667eea;"></div>
            </div>
            <button id="start-game-btn" class="btn-primary btn-large" style="padding: 15px 40px; font-size: 18px; margin: 20px 0;">Start Game!</button>
            <div id="game-result" class="game-result" style="display: none;"></div>
        </div>
    `;
    
    // Small delay to ensure DOM is ready
    setTimeout(() => {
        const startBtn = document.getElementById('start-game-btn');
        if (!startBtn) {
            console.error("❌ start-game-btn not found");
            return;
        }
        
        console.log("✅ Start button found, attaching listener");
        startBtn.addEventListener('click', function() {
            console.log("▶️ Start button clicked!");
            this.style.display = 'none';
            const msgEl = document.getElementById('game-message');
            if (msgEl) msgEl.textContent = 'Click the targets!';
            startClickingGame(adventure);
        });
    }, 50);
}

function startClickingGame(adventure) {
    console.log("🚀 startClickingGame called");
    
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error("❌ Canvas not found!");
        return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("❌ Could not get canvas context!");
        return;
    }
    
    console.log("✅ Canvas and context ready");
    
    const timeDisplay = document.getElementById('game-time');
    const scoreDisplay = document.getElementById('game-score');
    const messageDisplay = document.getElementById('game-message');
    const resultDisplay = document.getElementById('game-result');
    
    let score = 0;
    let timeLeft = adventure.gameData.duration;
    let gameActive = true;
    let targets = [];
    
    function createTarget() {
        const size = 30 + Math.random() * 20;
        return {
            x: Math.random() * (canvas.width - size - 10) + 5,
            y: Math.random() * (canvas.height - size - 10) + size,
            size: size,
            speedX: (Math.random() - 0.5) * 3,
            speedY: (Math.random() - 0.5) * 3,
            emoji: adventure.icon
        };
    }
    
    // Create initial targets
    for (let i = 0; i < 5; i++) {
        targets.push(createTarget());
    }
    console.log(`✅ Created ${targets.length} targets`);
    
    function draw() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#4A90E2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw targets
        targets.forEach(target => {
            ctx.font = `${target.size}px Arial`;
            ctx.textBaseline = 'top';
            ctx.fillText(target.emoji, target.x, target.y);
            
            // Move targets
            target.x += target.speedX;
            target.y += target.speedY;
            
            // Bounce off walls
            if (target.x < 0 || target.x > canvas.width - target.size) target.speedX *= -1;
            if (target.y < target.size || target.y > canvas.height - 10) target.speedY *= -1;
        });
    }
    
    // Click handler
    canvas.style.cursor = 'crosshair';
    canvas.addEventListener('click', function clickHandler(e) {
        if (!gameActive) return;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;
        
        console.log(`🖱️ Click at ${clickX}, ${clickY}`);
        
        // Check if clicked on a target
        for (let i = targets.length - 1; i >= 0; i--) {
            const target = targets[i];
            const hitX = clickX >= target.x && clickX <= target.x + target.size;
            const hitY = clickY >= target.y && clickY <= target.y + target.size;
            
            if (hitX && hitY) {
                console.log(`✅ Hit target ${i}!`);
                score++;
                if (scoreDisplay) scoreDisplay.textContent = score;
                targets.splice(i, 1);
                targets.push(createTarget());
                if (messageDisplay) messageDisplay.textContent = '🎉 Nice catch!';
                setTimeout(() => {
                    if (gameActive && messageDisplay) messageDisplay.textContent = 'Keep going!';
                }, 500);
                break;
            }
        }
    });
    
    // Game loop
    const gameLoop = setInterval(() => {
        if (!gameActive) return;
        draw();
    }, 1000 / 30); // 30 FPS
    
    console.log("✅ Game loop started");
    
    // Timer
    const timer = setInterval(() => {
        if (!gameActive) return;
        timeLeft--;
        if (timeDisplay) timeDisplay.textContent = timeLeft;
        
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
    
    console.log("✅ Timer started");
    
    function endGame() {
        console.log(`🏁 Game ended. Score: ${score}/${adventure.gameData.targetScore}`);
        gameActive = false;
        clearInterval(gameLoop);
        clearInterval(timer);
        
        const won = score >= adventure.gameData.targetScore;
        
        if (won) {
            gameState.player.currentXP += adventure.xpReward;
            gameState.player.totalXP += adventure.xpReward;
            gameState.player.adventuresPlayed++;
            saveGameState();
            updateUI();
            checkAchievements();
            
            if (resultDisplay) {
                resultDisplay.innerHTML = `
                    <div class="game-success" style="background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); padding: 25px; border-radius: 10px; text-align: center;">
                        <h3 style="color: #155724; font-size: 28px; margin-bottom: 15px;">🎉 You Win!</h3>
                        <p style="color: #155724; font-size: 18px; margin: 10px 0;">Score: ${score} / ${adventure.gameData.targetScore}</p>
                        <p style="font-size: 24px; font-weight: bold; color: #667eea; margin: 15px 0;">+${adventure.xpReward} XP Earned!</p>
                        <button class="btn-primary" onclick="document.getElementById('adventure-modal').classList.remove('active'); renderAdventures();">Play Again</button>
                    </div>
                `;
                resultDisplay.style.display = 'block';
            }
        } else {
            if (resultDisplay) {
                resultDisplay.innerHTML = `
                    <div class="game-failure" style="background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%); padding: 25px; border-radius: 10px; text-align: center;">
                        <h3 style="color: #721c24; font-size: 28px; margin-bottom: 15px;">😔 Try Again!</h3>
                        <p style="color: #721c24; font-size: 18px; margin: 10px 0;">Score: ${score} / ${adventure.gameData.targetScore}</p>
                        <p style="color: #721c24; font-size: 18px; margin: 10px 0;">You were ${adventure.gameData.targetScore - score} away from winning!</p>
                        <button class="btn-primary" onclick="document.getElementById('adventure-modal').classList.remove('active'); renderAdventures();">Retry</button>
                    </div>
                `;
                resultDisplay.style.display = 'block';
            }
        }
        
        if (messageDisplay) messageDisplay.textContent = '';
        showNotification(won ? `You won ${adventure.xpReward} XP!` : 'Try again!', won ? 'success' : 'warning');
    }
}

// ===== TIMING GAME =====
function createTimingGame(container, adventure) {
    console.log("⏱️ createTimingGame called");
    
    container.innerHTML = `
        <div class="mini-game-wrapper">
            <div class="game-info">
                <div class="game-stat">
                    <span class="stat-icon">⏱️</span>
                    <span>Time: <strong id="game-time">${adventure.gameData.duration}</strong>s</span>
                </div>
                <div class="game-stat">
                    <span class="stat-icon">🍔</span>
                    <span>Flipped: <strong id="game-score">0</strong></span>
                </div>
                <div class="game-stat">
                    <span class="stat-icon">⭐</span>
                    <span>Target: <strong>${adventure.gameData.targetScore}</strong></span>
                </div>
            </div>
            <div class="timing-game-area">
                <div class="timing-bar" style="position: relative; width: 100%; height: 80px; background: linear-gradient(to right, #ff4444 0%, #ff4444 30%, #4CAF50 45%, #4CAF50 55%, #ff4444 70%, #ff4444 100%); border-radius: 10px; margin: 30px 0; overflow: hidden;">
                    <div id="timing-indicator" style="position: absolute; left: 0; top: 0; width: 8px; height: 100%; background: white; box-shadow: 0 0 10px rgba(255,255,255,0.8);"></div>
                    <div class="timing-target" style="position: absolute; left: 45%; top: 0; width: 10%; height: 100%; border-left: 3px dashed white; border-right: 3px dashed white; pointer-events: none;"></div>
                </div>
                <button id="flip-btn" class="btn-primary btn-large" disabled style="margin: 20px 0; padding: 20px 40px; font-size: 20px;">Click to Flip!</button>
                <div id="game-message" class="game-message"></div>
            </div>
            <button id="start-game-btn" class="btn-primary btn-large">Start Game!</button>
            <div id="game-result" class="game-result" style="display: none;"></div>
        </div>
    `;
    
    setTimeout(() => {
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            startBtn.addEventListener('click', function() {
                console.log("▶️ Timing game starting");
                this.style.display = 'none';
                startTimingGame(adventure);
            });
        }
    }, 50);
}

function startTimingGame(adventure) {
    console.log("🚀 startTimingGame called");
    
    const timeDisplay = document.getElementById('game-time');
    const scoreDisplay = document.getElementById('game-score');
    const flipBtn = document.getElementById('flip-btn');
    const indicator = document.getElementById('timing-indicator');
    const messageDisplay = document.getElementById('game-message');
    const resultDisplay = document.getElementById('game-result');
    
    let score = 0;
    let timeLeft = adventure.gameData.duration;
    let gameActive = true;
    let indicatorPosition = 0;
    let indicatorDirection = 1;
    
    if (flipBtn) flipBtn.disabled = false;
    if (messageDisplay) messageDisplay.textContent = 'Click when the bar is in the green zone!';
    
    // Animate indicator
    const indicatorLoop = setInterval(() => {
        if (!gameActive) return;
        
        indicatorPosition += indicatorDirection * 2;
        
        if (indicatorPosition >= 100 || indicatorPosition <= 0) {
            indicatorDirection *= -1;
        }
        
        if (indicator) indicator.style.left = indicatorPosition + '%';
    }, 20);
    
    // Click handler
    if (flipBtn) {
        flipBtn.addEventListener('click', function() {
            if (!gameActive) return;
            
            console.log(`🖱️ Flip clicked at position: ${indicatorPosition}`);
            
            if (indicatorPosition >= 45 && indicatorPosition <= 55) {
                score++;
                if (scoreDisplay) scoreDisplay.textContent = score;
                if (messageDisplay) messageDisplay.textContent = '🎉 Perfect flip!';
                setTimeout(() => { 
                    if (gameActive && messageDisplay) messageDisplay.textContent = 'Keep timing!';
                }, 500);
            } else {
                if (messageDisplay) messageDisplay.textContent = '❌ Missed!';
                setTimeout(() => { 
                    if (gameActive && messageDisplay) messageDisplay.textContent = 'Try again!'; 
                }, 500);
            }
        });
    }
    
    // Timer
    const timer = setInterval(() => {
        if (!gameActive) return;
        timeLeft--;
        if (timeDisplay) timeDisplay.textContent = timeLeft;
        
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
    
    function endGame() {
        console.log(`🏁 Timing game ended. Score: ${score}/${adventure.gameData.targetScore}`);
        gameActive = false;
        clearInterval(indicatorLoop);
        clearInterval(timer);
        if (flipBtn) flipBtn.disabled = true;
        
        const won = score >= adventure.gameData.targetScore;
        
        if (won) {
            gameState.player.currentXP += adventure.xpReward;
            gameState.player.totalXP += adventure.xpReward;
            gameState.player.adventuresPlayed++;
            saveGameState();
            updateUI();
            checkAchievements();
            
            if (resultDisplay) {
                resultDisplay.innerHTML = `
                    <div class="game-success" style="background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); padding: 25px; border-radius: 10px; text-align: center;">
                        <h3 style="color: #155724; font-size: 28px;">🎉 Excellent Work!</h3>
                        <p style="color: #155724; font-size: 18px; margin: 10px 0;">Perfect Flips: ${score} / ${adventure.gameData.targetScore}</p>
                        <p style="font-size: 24px; font-weight: bold; color: #667eea; margin: 15px 0;">+${adventure.xpReward} XP Earned!</p>
                        <button class="btn-primary" onclick="document.getElementById('adventure-modal').classList.remove('active'); renderAdventures();">Play Again</button>
                    </div>
                `;
                resultDisplay.style.display = 'block';
            }
        } else {
            if (resultDisplay) {
                resultDisplay.innerHTML = `
                    <div class="game-failure" style="background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%); padding: 25px; border-radius: 10px; text-align: center;">
                        <h3 style="color: #721c24; font-size: 28px;">😔 Keep Practicing!</h3>
                        <p style="color: #721c24; font-size: 18px; margin: 10px 0;">Perfect Flips: ${score} / ${adventure.gameData.targetScore}</p>
                        <p style="color: #721c24; font-size: 18px;">You need ${adventure.gameData.targetScore - score} more perfect flips!</p>
                        <button class="btn-primary" onclick="document.getElementById('adventure-modal').classList.remove('active'); renderAdventures();">Retry</button>
                    </div>
                `;
                resultDisplay.style.display = 'block';
            }
        }
        
        if (messageDisplay) messageDisplay.textContent = '';
        showNotification(won ? `You won ${adventure.xpReward} XP!` : 'Try again!', won ? 'success' : 'warning');
    }
}

// ===== SIMPLE GAME =====
function createSimpleGame(container, adventure) {
    console.log("🎲 createSimpleGame called");
    container.innerHTML = `
        <div class="simple-game" style="text-align: center; padding: 40px;">
            <p style="font-size: 18px; margin-bottom: 20px;">Challenge: ${adventure.adventureName}</p>
            <button class="btn-primary" onclick="this.parentElement.innerHTML = '<p>You earned ${adventure.xpReward} XP!</p>'; gameState.player.currentXP += ${adventure.xpReward}; gameState.player.totalXP += ${adventure.xpReward}; updateUI(); saveGameState();">Complete Challenge</button>
        </div>
    `;
}

// ====================================================================
// SUPER SIMPLE WORKING VERSION - Replace your adventure functions with this
// This is stripped down to the absolute basics that WILL work
// ====================================================================

// ===== RENDER ADVENTURES =====
function renderAdventures() {
    const container = document.getElementById('adventure-list');
    if (!container) return;
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; padding: 0 20px; max-width: 1200px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); padding: 25px; border-radius: 15px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <div style="font-size: 64px; margin-bottom: 15px;">🪼</div>
                <h3 style="margin: 15px 0 10px 0; color: #333; font-size: 22px;">Jellyfish Catching</h3>
                <p style="color: #666; font-size: 14px; margin-bottom: 15px;">Click the jellyfish to catch them!</p>
                <div style="display: flex; justify-content: space-around; margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.5); border-radius: 8px;">
                    <span style="font-size: 12px; font-weight: bold; text-transform: capitalize;">easy</span>
                    <span style="color: #667eea; font-weight: bold; font-size: 16px;">+10 XP</span>
                </div>
                <button onclick="playJellyfishGame()" style="width: 100%; padding: 12px; background: #667eea; color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer; font-weight: bold;">Play Now!</button>
            </div>
            
            <div style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); padding: 25px; border-radius: 15px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <div style="font-size: 64px; margin-bottom: 15px;">🍔</div>
                <h3 style="margin: 15px 0 10px 0; color: #333; font-size: 22px;">Krabby Patty Flip</h3>
                <p style="color: #666; font-size: 14px; margin-bottom: 15px;">Time your clicks perfectly!</p>
                <div style="display: flex; justify-content: space-around; margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.5); border-radius: 8px;">
                    <span style="font-size: 12px; font-weight: bold; text-transform: capitalize;">medium</span>
                    <span style="color: #667eea; font-weight: bold; font-size: 16px;">+15 XP</span>
                </div>
                <button onclick="playPattyGame()" style="width: 100%; padding: 12px; background: #667eea; color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer; font-weight: bold;">Play Now!</button>
            </div>
            
            <div style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); padding: 25px; border-radius: 15px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <div style="font-size: 64px; margin-bottom: 15px;">🫧</div>
                <h3 style="margin: 15px 0 10px 0; color: #333; font-size: 22px;">Bubble Popping</h3>
                <p style="color: #666; font-size: 14px; margin-bottom: 15px;">Pop the bubbles!</p>
                <div style="display: flex; justify-content: space-around; margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.5); border-radius: 8px;">
                    <span style="font-size: 12px; font-weight: bold; text-transform: capitalize;">easy</span>
                    <span style="color: #667eea; font-weight: bold; font-size: 16px;">+12 XP</span>
                </div>
                <button onclick="playBubbleGame()" style="width: 100%; padding: 12px; background: #667eea; color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer; font-weight: bold;">Play Now!</button>
            </div>
        </div>
    `;
}

// ===== JELLYFISH GAME =====
function playJellyfishGame() {
    const modal = document.getElementById('adventure-modal');
    const container = document.getElementById('adventure-game-container');
    
    modal.classList.add('active');
    
    container.innerHTML = `
        <div style="max-width: 700px; margin: 0 auto; padding: 20px;">
            <div style="display: flex; justify-content: space-around; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; color: white; margin-bottom: 20px;">
                <div style="text-align: center;"><span style="font-size: 24px;">⏱️</span><br>Time: <strong id="time-display">30</strong>s</div>
                <div style="text-align: center;"><span style="font-size: 24px;">🎯</span><br>Score: <strong id="score-display">0</strong></div>
                <div style="text-align: center;"><span style="font-size: 24px;">⭐</span><br>Target: <strong>10</strong></div>
            </div>
            
            <div style="text-align: center;">
                <canvas id="game-canvas" width="600" height="400" style="border: 3px solid #667eea; border-radius: 10px; max-width: 100%; background: linear-gradient(180deg, #87CEEB 0%, #4A90E2 100%); cursor: crosshair;"></canvas>
                <div id="message" style="margin-top: 15px; font-size: 18px; font-weight: bold; color: #667eea; min-height: 30px;"></div>
            </div>
            
            <button id="start-btn" onclick="startJellyfishGame()" style="display: block; width: 100%; padding: 15px 40px; font-size: 18px; font-weight: bold; background: #667eea; color: white; border: none; border-radius: 10px; cursor: pointer; margin-top: 20px;">Start Game!</button>
            
            <div id="result" style="display: none; margin-top: 20px;"></div>
        </div>
    `;
}

function startJellyfishGame() {
    document.getElementById('start-btn').style.display = 'none';
    document.getElementById('message').textContent = 'Click the jellyfish! 🪼';
    
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const timeDisplay = document.getElementById('time-display');
    const scoreDisplay = document.getElementById('score-display');
    const message = document.getElementById('message');
    const result = document.getElementById('result');
    
    let score = 0;
    let time = 30;
    let active = true;
    let jellyfish = [];
    
    // Create jellyfish
    for (let i = 0; i < 5; i++) {
        jellyfish.push({
            x: Math.random() * 550,
            y: Math.random() * 350 + 40,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4
        });
    }
    
    // Draw function
    function draw() {
        ctx.clearRect(0, 0, 600, 400);
        
        jellyfish.forEach(j => {
            ctx.font = '40px Arial';
            ctx.fillText('🪼', j.x, j.y);
            
            j.x += j.vx;
            j.y += j.vy;
            
            if (j.x < 0 || j.x > 560) j.vx *= -1;
            if (j.y < 40 || j.y > 400) j.vy *= -1;
        });
    }
    
    // Click handler
    canvas.onclick = (e) => {
        if (!active) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        for (let i = 0; i < jellyfish.length; i++) {
            const j = jellyfish[i];
            if (x > j.x && x < j.x + 40 && y > j.y - 40 && y < j.y) {
                score++;
                scoreDisplay.textContent = score;
                message.textContent = '🎉 Nice catch!';
                jellyfish[i] = {
                    x: Math.random() * 550,
                    y: Math.random() * 350 + 40,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4
                };
                setTimeout(() => { if (active) message.textContent = 'Keep going!'; }, 500);
                break;
            }
        }
    };
    
    // Game loop
    const loop = setInterval(() => {
        if (!active) return;
        draw();
    }, 33);
    
    // Timer
    const timer = setInterval(() => {
        if (!active) return;
        time--;
        timeDisplay.textContent = time;
        
        if (time <= 0) {
            active = false;
            clearInterval(loop);
            clearInterval(timer);
            
            const won = score >= 10;
            
            if (won) {
                gameState.player.currentXP += 10;
                gameState.player.totalXP += 10;
                saveGameState();
                updateUI();
                
                result.innerHTML = `
                    <div style="background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); padding: 25px; border-radius: 10px; text-align: center;">
                        <h3 style="color: #155724; font-size: 28px; margin-bottom: 15px;">🎉 You Win!</h3>
                        <p style="color: #155724; font-size: 18px;">Score: ${score} / 10</p>
                        <p style="font-size: 24px; font-weight: bold; color: #667eea; margin: 15px 0;">+10 XP Earned!</p>
                        <button onclick="document.getElementById('adventure-modal').classList.remove('active'); renderAdventures();" style="padding: 12px 30px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">Play Again</button>
                    </div>
                `;
            } else {
                result.innerHTML = `
                    <div style="background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%); padding: 25px; border-radius: 10px; text-align: center;">
                        <h3 style="color: #721c24; font-size: 28px; margin-bottom: 15px;">😔 Try Again!</h3>
                        <p style="color: #721c24; font-size: 18px;">Score: ${score} / 10</p>
                        <p style="color: #721c24; font-size: 18px;">You need ${10 - score} more!</p>
                        <button onclick="document.getElementById('adventure-modal').classList.remove('active'); renderAdventures();" style="padding: 12px 30px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">Retry</button>
                    </div>
                `;
            }
            
            result.style.display = 'block';
            message.textContent = '';
        }
    }, 1000);
}

// ===== PATTY FLIP GAME =====
function playPattyGame() {
    const modal = document.getElementById('adventure-modal');
    const container = document.getElementById('adventure-game-container');
    
    modal.classList.add('active');
    
    container.innerHTML = `
        <div style="max-width: 700px; margin: 0 auto; padding: 20px;">
            <div style="display: flex; justify-content: space-around; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; color: white; margin-bottom: 20px;">
                <div style="text-align: center;"><span style="font-size: 24px;">⏱️</span><br>Time: <strong id="time-display">45</strong>s</div>
                <div style="text-align: center;"><span style="font-size: 24px;">🍔</span><br>Flips: <strong id="score-display">0</strong></div>
                <div style="text-align: center;"><span style="font-size: 24px;">⭐</span><br>Target: <strong>15</strong></div>
            </div>
            
            <div style="text-align: center; padding: 20px;">
                <div style="position: relative; width: 100%; height: 80px; background: linear-gradient(to right, #ff4444 0%, #ff4444 30%, #4CAF50 45%, #4CAF50 55%, #ff4444 70%, #ff4444 100%); border-radius: 10px; margin: 30px 0; overflow: hidden;">
                    <div id="indicator" style="position: absolute; left: 0; top: 0; width: 8px; height: 100%; background: white; box-shadow: 0 0 10px rgba(255,255,255,0.8);"></div>
                    <div style="position: absolute; left: 45%; top: 0; width: 10%; height: 100%; border-left: 3px dashed white; border-right: 3px dashed white; pointer-events: none;"></div>
                </div>
                
                <button id="flip-btn" disabled style="margin: 20px 0; padding: 20px 40px; font-size: 20px; background: #ccc; color: white; border: none; border-radius: 10px; cursor: not-allowed;">Click to Flip!</button>
                <div id="message" style="margin-top: 10px; font-size: 18px; font-weight: bold; color: #667eea;"></div>
            </div>
            
            <button id="start-btn" onclick="startPattyGame()" style="display: block; width: 100%; padding: 15px 40px; font-size: 18px; font-weight: bold; background: #667eea; color: white; border: none; border-radius: 10px; cursor: pointer;">Start Game!</button>
            
            <div id="result" style="display: none; margin-top: 20px;"></div>
        </div>
    `;
}

function startPattyGame() {
    document.getElementById('start-btn').style.display = 'none';
    
    const timeDisplay = document.getElementById('time-display');
    const scoreDisplay = document.getElementById('score-display');
    const message = document.getElementById('message');
    const result = document.getElementById('result');
    const flipBtn = document.getElementById('flip-btn');
    const indicator = document.getElementById('indicator');
    
    flipBtn.disabled = false;
    flipBtn.style.background = '#667eea';
    flipBtn.style.cursor = 'pointer';
    message.textContent = 'Click when in the green zone!';
    
    let score = 0;
    let time = 45;
    let active = true;
    let pos = 0;
    let dir = 1;
    
    // Move indicator
    const moveLoop = setInterval(() => {
        if (!active) return;
        pos += dir * 2;
        if (pos >= 100 || pos <= 0) dir *= -1;
        indicator.style.left = pos + '%';
    }, 20);
    
    // Click handler
    flipBtn.onclick = () => {
        if (!active) return;
        
        if (pos >= 45 && pos <= 55) {
            score++;
            scoreDisplay.textContent = score;
            message.textContent = '🎉 Perfect!';
            setTimeout(() => { if (active) message.textContent = 'Keep timing!'; }, 500);
        } else {
            message.textContent = '❌ Missed!';
            setTimeout(() => { if (active) message.textContent = 'Try again!'; }, 500);
        }
    };
    
    // Timer
    const timer = setInterval(() => {
        if (!active) return;
        time--;
        timeDisplay.textContent = time;
        
        if (time <= 0) {
            active = false;
            clearInterval(moveLoop);
            clearInterval(timer);
            flipBtn.disabled = true;
            
            const won = score >= 15;
            
            if (won) {
                gameState.player.currentXP += 15;
                gameState.player.totalXP += 15;
                saveGameState();
                updateUI();
                
                result.innerHTML = `
                    <div style="background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); padding: 25px; border-radius: 10px; text-align: center;">
                        <h3 style="color: #155724; font-size: 28px;">🎉 Excellent!</h3>
                        <p style="color: #155724; font-size: 18px;">Perfect Flips: ${score} / 15</p>
                        <p style="font-size: 24px; font-weight: bold; color: #667eea; margin: 15px 0;">+15 XP Earned!</p>
                        <button onclick="document.getElementById('adventure-modal').classList.remove('active'); renderAdventures();" style="padding: 12px 30px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">Play Again</button>
                    </div>
                `;
            } else {
                result.innerHTML = `
                    <div style="background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%); padding: 25px; border-radius: 10px; text-align: center;">
                        <h3 style="color: #721c24; font-size: 28px;">😔 Keep Practicing!</h3>
                        <p style="color: #721c24; font-size: 18px;">Perfect Flips: ${score} / 15</p>
                        <p style="color: #721c24; font-size: 18px;">Need ${15 - score} more!</p>
                        <button onclick="document.getElementById('adventure-modal').classList.remove('active'); renderAdventures();" style="padding: 12px 30px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">Retry</button>
                    </div>
                `;
            }
            
            result.style.display = 'block';
            message.textContent = '';
        }
    }, 1000);
}

// ===== BUBBLE GAME =====
function playBubbleGame() {
    const modal = document.getElementById('adventure-modal');
    const container = document.getElementById('adventure-game-container');
    
    modal.classList.add('active');
    
    container.innerHTML = `
        <div style="max-width: 700px; margin: 0 auto; padding: 20px;">
            <div style="display: flex; justify-content: space-around; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; color: white; margin-bottom: 20px;">
                <div style="text-align: center;"><span style="font-size: 24px;">⏱️</span><br>Time: <strong id="time-display">40</strong>s</div>
                <div style="text-align: center;"><span style="font-size: 24px;">🎯</span><br>Score: <strong id="score-display">0</strong></div>
                <div style="text-align: center;"><span style="font-size: 24px;">⭐</span><br>Target: <strong>20</strong></div>
            </div>
            
            <div style="text-align: center;">
                <canvas id="game-canvas" width="600" height="400" style="border: 3px solid #667eea; border-radius: 10px; max-width: 100%; background: linear-gradient(180deg, #87CEEB 0%, #4A90E2 100%); cursor: crosshair;"></canvas>
                <div id="message" style="margin-top: 15px; font-size: 18px; font-weight: bold; color: #667eea; min-height: 30px;"></div>
            </div>
            
            <button id="start-btn" onclick="startBubbleGame()" style="display: block; width: 100%; padding: 15px 40px; font-size: 18px; font-weight: bold; background: #667eea; color: white; border: none; border-radius: 10px; cursor: pointer; margin-top: 20px;">Start Game!</button>
            
            <div id="result" style="display: none; margin-top: 20px;"></div>
        </div>
    `;
}

function startBubbleGame() {
    document.getElementById('start-btn').style.display = 'none';
    document.getElementById('message').textContent = 'Pop the bubbles! 🫧';
    
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const timeDisplay = document.getElementById('time-display');
    const scoreDisplay = document.getElementById('score-display');
    const message = document.getElementById('message');
    const result = document.getElementById('result');
    
    let score = 0;
    let time = 40;
    let active = true;
    let bubbles = [];
    
    // Create bubbles
    for (let i = 0; i < 5; i++) {
        bubbles.push({
            x: Math.random() * 550,
            y: Math.random() * 350 + 40,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4
        });
    }
    
    // Draw function
    function draw() {
        ctx.clearRect(0, 0, 600, 400);
        
        bubbles.forEach(b => {
            ctx.font = '40px Arial';
            ctx.fillText('🫧', b.x, b.y);
            
            b.x += b.vx;
            b.y += b.vy;
            
            if (b.x < 0 || b.x > 560) b.vx *= -1;
            if (b.y < 40 || b.y > 400) b.vy *= -1;
        });
    }
    
    // Click handler
    canvas.onclick = (e) => {
        if (!active) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        for (let i = 0; i < bubbles.length; i++) {
            const b = bubbles[i];
            if (x > b.x && x < b.x + 40 && y > b.y - 40 && y < b.y) {
                score++;
                scoreDisplay.textContent = score;
                message.textContent = '🎉 Pop!';
                bubbles[i] = {
                    x: Math.random() * 550,
                    y: Math.random() * 350 + 40,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4
                };
                setTimeout(() => { if (active) message.textContent = 'Keep popping!'; }, 500);
                break;
            }
        }
    };
    
    // Game loop
    const loop = setInterval(() => {
        if (!active) return;
        draw();
    }, 33);
    
    // Timer
    const timer = setInterval(() => {
        if (!active) return;
        time--;
        timeDisplay.textContent = time;
        
        if (time <= 0) {
            active = false;
            clearInterval(loop);
            clearInterval(timer);
            
            const won = score >= 20;
            
            if (won) {
                gameState.player.currentXP += 12;
                gameState.player.totalXP += 12;
                saveGameState();
                updateUI();
                
                result.innerHTML = `
                    <div style="background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); padding: 25px; border-radius: 10px; text-align: center;">
                        <h3 style="color: #155724; font-size: 28px; margin-bottom: 15px;">🎉 You Win!</h3>
                        <p style="color: #155724; font-size: 18px;">Score: ${score} / 20</p>
                        <p style="font-size: 24px; font-weight: bold; color: #667eea; margin: 15px 0;">+12 XP Earned!</p>
                        <button onclick="document.getElementById('adventure-modal').classList.remove('active'); renderAdventures();" style="padding: 12px 30px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">Play Again</button>
                    </div>
                `;
            } else {
                result.innerHTML = `
                    <div style="background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%); padding: 25px; border-radius: 10px; text-align: center;">
                        <h3 style="color: #721c24; font-size: 28px; margin-bottom: 15px;">😔 Try Again!</h3>
                        <p style="color: #721c24; font-size: 18px;">Score: ${score} / 20</p>
                        <p style="color: #721c24; font-size: 18px;">You need ${20 - score} more!</p>
                        <button onclick="document.getElementById('adventure-modal').classList.remove('active'); renderAdventures();" style="padding: 12px 30px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">Retry</button>
                    </div>
                `;
            }
            
            result.style.display = 'block';
            message.textContent = '';
        }
    }, 1000);
}

// ===== RENDER SETTINGS (4 main locations) =====
function renderSettings() {
    const container = document.getElementById('levels-list');
    container.innerHTML = ''; // Clear without duplicate heading
    
    LEVELS.forEach(setting => {
        const isUnlocked = !setting.isLocked || 
                          (setting.requiredPreviousLevel && gameState.player.completedLevels.includes(setting.requiredPreviousLevel));
        
        const isCompleted = gameState.player.completedLevels.includes(setting.levelId);
        
        // Count completed sub-levels
        const totalSubLevels = 30;
        const completedSubLevels = gameState.player.completedSubLevels.filter(
            sl => sl.startsWith(`${setting.levelId}-`)
        ).length;
        
        const card = document.createElement('div');
        card.className = `level-card ${isUnlocked ? 'unlocked' : 'locked'} ${isCompleted ? 'completed' : ''}`;
        
        card.innerHTML = `
            <div class="level-icon">${setting.icon}</div>
            <h3>${setting.levelName}</h3>
            <p class="level-subject">${setting.subject}</p>
            <p class="level-description">${setting.description}</p>
            <div class="level-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(completedSubLevels/totalSubLevels)*100}%"></div>
                </div>
                <span>${completedSubLevels} / ${totalSubLevels} Levels Complete</span>
            </div>
            ${!isUnlocked ? `<div class="locked-overlay">🔒 Locked<br>Required XP: ${setting.requiredXP}</div>` : ''}
            ${isCompleted ? '<div class="completed-badge">✅ Mastered!</div>' : ''}
        `;
        
        if (isUnlocked && !isCompleted) {
            card.addEventListener('click', () => {
                gameState.currentSettingView = setting.levelId;
                renderSubLevels(setting.levelId);
            });
        } else if (isCompleted) {
            card.addEventListener('click', () => {
                gameState.currentSettingView = setting.levelId;
                renderSubLevels(setting.levelId);
            });
        }
        
        container.appendChild(card);
    });
}

// ===== RENDER SUB-LEVELS (30 levels within a setting) =====
function renderSubLevels(settingId) {
    // Hide the main "Choose Your Setting" heading when in sublevel view
    const levelsContent = document.getElementById('levels-content');
    const mainHeading = levelsContent.querySelector('h2');
    if (mainHeading) {
        mainHeading.style.display = 'none';
    }
    
    const container = document.getElementById('levels-list');
    const setting = LEVELS.find(l => l.levelId === settingId);
    
    container.innerHTML = `
        <div class="sublevel-header">
            <button id="back-to-settings" class="btn-back">⬅ Back to Settings</button>
            <h2>${setting.icon} ${setting.levelName}</h2>
            <p class="setting-subject">${setting.subject}</p>
            <div class="setting-description">${setting.description}
            </div>
        </div>
        <div class="sublevels-grid"></div>
    `;
    
    document.getElementById('back-to-settings').addEventListener('click', () => {
        // Show the main heading again when going back
        if (mainHeading) {
            mainHeading.style.display = 'block';
        }
        gameState.currentSettingView = null;
        renderSettings();
    });
    
    const grid = container.querySelector('.sublevels-grid');
    
    // Create 30 sub-level buttons
    for (let i = 1; i <= 30; i++) {
        const subLevelId = `${settingId}-${i}`;
        const isCompleted = gameState.player.completedSubLevels.includes(subLevelId);
        const isUnlocked = i === 1 || gameState.player.completedSubLevels.includes(`${settingId}-${i-1}`);
        
        let difficulty = '';
        if (i <= 10) difficulty = 'easy';
        else if (i <= 20) difficulty = 'average';
        else difficulty = 'difficult';
        
        const btn = document.createElement('button');
        btn.className = `sublevel-btn ${difficulty} ${isCompleted ? 'completed' : ''} ${!isUnlocked ? 'locked' : ''}`;
        btn.innerHTML = `
            <span class="sublevel-number">${i}</span>
            ${isCompleted ? '<span class="check">✓</span>' : ''}
            ${!isUnlocked ? '<span class="lock">🔒</span>' : ''}
        `;
        
        if (isUnlocked) {
            btn.addEventListener('click', () => showSubLevelQuestion(settingId, i));
        }
        
        grid.appendChild(btn);
    }
}

// ===== SHOW SUB-LEVEL QUESTION =====
function showSubLevelQuestion(settingId, levelNumber) {
    const question = QUESTIONS.find(q => q.levelId === settingId && q.levelNumber === levelNumber);
    
    if (!question) {
        showNotification('Question not found!', 'error');
        return;
    }
    
    const alreadyAnswered = gameState.player.answeredQuestions.find(
        aq => aq.questionId === question.questionId && aq.correct
    );
    
    const modal = document.getElementById('questions-modal');
    const setting = LEVELS.find(l => l.levelId === settingId);
    
    document.getElementById('level-title').textContent = `${setting.levelName} - Level ${levelNumber}`;
    
    const container = document.getElementById('questions-container');
    container.innerHTML = '';
    
    const questionDiv = createQuestionElement(question, setting, alreadyAnswered);
    container.appendChild(questionDiv);
    
    // Add back button to modal
    addBackButtonToModal();
    
    modal.classList.add('active');
}

// ===== ADD BACK BUTTON TO MODAL =====
function addBackButtonToModal() {
    const modal = document.getElementById('questions-modal');
    const modalContent = modal.querySelector('.modal-content');
    
    // Check if back button already exists
    if (!document.getElementById('modal-back-btn')) {
        const backBtn = document.createElement('button');
        backBtn.id = 'modal-back-btn';
        backBtn.className = 'back-to-levels-btn';
        backBtn.innerHTML = '← Back';
        backBtn.addEventListener('click', function() {
            modal.classList.remove('active');
            if (gameState.currentSettingView !== null) {
                renderSubLevels(gameState.currentSettingView);
            }
        });
        // Insert at the beginning of modal content
        modalContent.insertBefore(backBtn, modalContent.firstChild);
    }
}

// ===== CREATE QUESTION ELEMENT =====
function createQuestionElement(question, setting, alreadyAnswered) {
    const div = document.createElement('div');
    div.className = 'question';
    div.id = `question-${question.questionId}`;
    
    if (alreadyAnswered) {
        div.classList.add('answered');
    }
    
    let difficultyBadge = '';
    if (question.difficulty === 'easy') difficultyBadge = '<span class="difficulty-badge easy">🟢 Easy</span>';
    else if (question.difficulty === 'average') difficultyBadge = '<span class="difficulty-badge average">🟡 Average</span>';
    else difficultyBadge = '<span class="difficulty-badge difficult">🔴 Difficult</span>';
    
    div.innerHTML = `
        <div class="question-header">
            ${difficultyBadge}
            <div class="question-character">${CHARACTER_EMOJIS[question.character]} ${question.character}</div>
        </div>
        <p class="question-text">${question.questionText}</p>
        ${alreadyAnswered ? '<div class="already-answered">✅ Already answered correctly!</div>' : ''}
        <div class="question-meta">
            <span>Cost: ${question.xpCost} XP</span>
            <span>Reward: ${question.xpReward} XP</span>
        </div>
        <div class="options" id="options-${question.questionId}">
            ${question.options.map(option => `
                <button class="option-btn" data-option-id="${option.id}" ${alreadyAnswered ? 'disabled' : ''}>
                    ${option.id.toUpperCase()}. ${option.text}
                </button>
            `).join('')}
        </div>
        <div id="feedback-${question.questionId}" class="feedback-container"></div>
    `;
    
    if (!alreadyAnswered) {
        // Add click handlers to options
        div.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                answerQuestion(question, this.dataset.optionId, setting);
            });
        });
    } else {
        // Show the correct answer with explanation
        const correctOption = question.options.find(opt => opt.isCorrect);
        const feedbackDiv = div.querySelector(`#feedback-${question.questionId}`);
        feedbackDiv.className = 'feedback-container already-correct';
        feedbackDiv.innerHTML = `
            <div class="correct-answer-review">
                <strong>✅ Correct Answer: ${correctOption.id.toUpperCase()}</strong>
                <p>${correctOption.feedback}</p>
            </div>
        `;
    }
    
    return div;
}

// ===== ANSWER QUESTION =====
function answerQuestion(question, selectedOptionId, setting) {
    // Check if player has enough XP
    if (gameState.player.currentXP < question.xpCost) {
        showNotification('Not enough XP! Need more to unlock this question.', 'warning');
        return;
    }
    
    // Deduct XP cost
    gameState.player.currentXP -= question.xpCost;
    
    // Get selected option
    const selectedOption = question.options.find(opt => opt.id === selectedOptionId);
    const isCorrect = selectedOption.isCorrect;
    
    // Disable all options and show feedback for selected option
    const optionsContainer = document.getElementById(`options-${question.questionId}`);
    optionsContainer.querySelectorAll('.option-btn').forEach(btn => {
        btn.disabled = true;
        
        const optionId = btn.dataset.optionId;
        if (optionId === selectedOptionId) {
            btn.classList.add(isCorrect ? 'correct' : 'incorrect');
        }
    });
    
    // Show feedback for the selected option
    const feedbackDiv = document.getElementById(`feedback-${question.questionId}`);
    feedbackDiv.className = `feedback-container ${isCorrect ? 'correct' : 'incorrect'}`;
    
    feedbackDiv.innerHTML = `
        <div class="feedback-content">
            <strong>${isCorrect ? '🎉 Correct!' : '❌ Incorrect'}</strong>
            <p>${selectedOption.feedback}</p>
            ${!isCorrect ? `<p class="hint"><strong>💡 Hint:</strong> ${question.hint}</p>` : ''}
        </div>
    `;
    
    if (isCorrect) {
        // Award XP
        gameState.player.currentXP += question.xpReward;
        gameState.player.totalXP += question.xpReward;
        
        // Record answered question
        gameState.player.answeredQuestions.push({
            questionId: question.questionId,
            correct: true,
            timestamp: Date.now()
        });
        
        // Mark sub-level as complete
        const subLevelId = `${question.levelId}-${question.levelNumber}`;
        if (!gameState.player.completedSubLevels.includes(subLevelId)) {
            gameState.player.completedSubLevels.push(subLevelId);
        }
        
        // Check if all 30 sub-levels in this setting are complete
        const completedInSetting = gameState.player.completedSubLevels.filter(
            sl => sl.startsWith(`${question.levelId}-`)
        ).length;
        
        if (completedInSetting === 30 && !gameState.player.completedLevels.includes(question.levelId)) {
            gameState.player.completedLevels.push(question.levelId);
            gameState.player.currentXP += setting.xpReward;
            gameState.player.totalXP += setting.xpReward;
            
            showNotification(`🎉 ${setting.levelName} MASTERED! +${setting.xpReward} XP Bonus!`, 'success');
        }
        
        // Add "Next Level" button if there are more levels
        if (question.levelNumber < 30) {
            const nextBtn = document.createElement('button');
            nextBtn.className = 'btn-primary next-level-btn';
            nextBtn.textContent = `Next Level →`;
            nextBtn.addEventListener('click', () => {
                document.getElementById('questions-modal').classList.remove('active');
                showSubLevelQuestion(question.levelId, question.levelNumber + 1);
            });
            feedbackDiv.appendChild(nextBtn);
        } else {
            // This was the last level
            const doneBtn = document.createElement('button');
            doneBtn.className = 'btn-primary';
            doneBtn.textContent = '🎉 Setting Complete!';
            doneBtn.addEventListener('click', () => {
                document.getElementById('questions-modal').classList.remove('active');
                gameState.currentSettingView = null;
                renderSettings();
            });
            feedbackDiv.appendChild(doneBtn);
        }
        
        checkAchievements();
    } else {
        // Show retry button
        const retryBtn = document.createElement('button');
        retryBtn.className = 'btn-secondary retry-btn';
        retryBtn.textContent = 'Try Again';
        retryBtn.addEventListener('click', () => {
            document.getElementById('questions-modal').classList.remove('active');
            showSubLevelQuestion(question.levelId, question.levelNumber);
        });
        feedbackDiv.appendChild(retryBtn);
    }
    
    // Update UI
    updateUI();
    saveGameState();
}
   
// ===== RENDER STORIES =====
function renderStories() {
    console.log("renderStories called");
    const container = document.getElementById('story-list');
    if (!container) { console.error("story-list not found"); return; }
    container.innerHTML = '';
    console.log("STORIES:", STORIES.length);
    
    STORIES.forEach(story => {
        const isUnlocked = !story.unlockCondition || 
                          (story.unlockCondition.type === 'level_complete' && 
                           gameState.player.completedLevels.includes(story.unlockCondition.levelId));
        
        const isCompleted = gameState.player.completedStories.includes(story.storyId);
        
        const card = document.createElement('div');
        card.className = `story-card ${isUnlocked ? 'unlocked' : 'locked'} ${isCompleted ? 'completed' : ''}`;
        
        card.innerHTML = `
            <div class="story-icon">${story.icon}</div>
            <h3>${story.title}</h3>
            <p>${story.subject}</p>
            <div class="story-meta">
                <span>⏱ ${story.estimatedTime} min</span>
                <span>+${story.xpReward} XP</span>
            </div>
            ${!isUnlocked ? '<div class="locked-overlay">🔒 Complete previous setting</div>' : ''}
            ${isCompleted ? '<div class="completed-badge">✓ Read</div>' : ''}
        `;
        
        if (isUnlocked) {
            card.addEventListener('click', () => readStory(story));
        }
        
        container.appendChild(card);
    });
}

// ===== READ STORY =====
function readStory(story) {
    gameState.currentStory = story;
    gameState.currentStoryPage = 0;
    
    const modal = document.getElementById('story-modal');
    document.getElementById('story-title').textContent = story.title;

    displayStoryPage();
    modal.classList.add('active');
}

function displayStoryPage() {
    const story = gameState.currentStory;
    const page = story.content[gameState.currentStoryPage];
    const container = document.getElementById('story-content-display');
    
    // Build the image HTML if image exists
    let imageHTML = '';
    if (page.image) {
        imageHTML = `
            <div class="story-image-container">
                <img src="${page.image}" alt="Story illustration" class="story-image" 
                     onerror="this.style.display='none'">
            </div>
        `;
    }  
    
    container.innerHTML = `
        <div class="story-page active">
            ${imageHTML}
            <div class="story-character">${CHARACTER_EMOJIS[page.character]} ${page.character}</div>
            <p class="story-text">${page.text}</p>
        </div>
    `;
    
    // Update navigation
    document.getElementById('story-progress').textContent = 
        `${gameState.currentStoryPage + 1} / ${story.content.length}`;
    
    document.getElementById('story-prev').disabled = gameState.currentStoryPage === 0;
    document.getElementById('story-next').disabled = 
        gameState.currentStoryPage === story.content.length - 1;
    
    // ===== LOAD AUDIO FOR THIS PAGE =====
    loadStoryPageAudio(story.storyId, gameState.currentStoryPage);

    // If last page and not completed, mark as completed
    if (gameState.currentStoryPage === story.content.length - 1 && 
        !gameState.player.completedStories.includes(story.storyId)) {
        
        gameState.player.completedStories.push(story.storyId);
        gameState.player.currentXP += story.xpReward;
        gameState.player.totalXP += story.xpReward;
        
        showNotification(`Story completed! +${story.xpReward} XP`, 'success');
        saveGameState();
        updateUI();
        checkAchievements();
    }
}

function navigateStory(direction) {
    const story = gameState.currentStory;
    const newPage = gameState.currentStoryPage + direction;
    
    if (newPage >= 0 && newPage < story.content.length) {
        gameState.currentStoryPage = newPage;
        displayStoryPage();

    setTimeout(() => {
            playStoryAudio();
        }, 500); // Small delay to let audio load
    }
}

// ===== RENDER PROGRESS =====
function renderProgress() {
    // Update stats
    const totalQuestions = QUESTIONS.length;
    const answeredCorrect = gameState.player.answeredQuestions.filter(aq => aq.correct).length;
    const levelsCompleted = gameState.player.completedLevels.length;
    const storiesCompleted = gameState.player.completedStories.length;
    
    document.getElementById('levels-completed').textContent = `${levelsCompleted} / 4`;
    document.getElementById('questions-answered').textContent = answeredCorrect;
    document.getElementById('stories-completed').textContent = `${storiesCompleted} / 4`;
    document.getElementById('total-xp-earned').textContent = gameState.player.totalXP;
    
    // Render achievements
    const achievementsList = document.getElementById('achievements-list');
    achievementsList.innerHTML = '';
    
    ACHIEVEMENTS.forEach(achievement => {
        const earned = gameState.player.achievements.includes(achievement.achievementId);
        
        const card = document.createElement('div');
        card.className = `achievement-card ${earned ? 'earned' : 'locked'}`;
        
        card.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-info">
                <h4>${achievement.name}</h4>
                <p>${achievement.description}</p>
                <span class="achievement-xp">+${achievement.xpBonus} XP</span>
            </div>
            ${earned ? '<div class="achievement-earned">✓ Earned</div>' : ''}
        `;
        
        achievementsList.appendChild(card);
    });
}

// ===== CHECK ACHIEVEMENTS =====
function checkAchievements() {
    ACHIEVEMENTS.forEach(achievement => {
        if (gameState.player.achievements.includes(achievement.achievementId)) {
            return; // Already earned
        }
        
        let earned = false;
        
        switch (achievement.requirement.type) {
            case 'questions_correct':
                const correctCount = gameState.player.answeredQuestions.filter(aq => aq.correct).length;
                earned = correctCount >= achievement.requirement.count;
                break;
                
            case 'level_complete':
                earned = gameState.player.completedLevels.length >= achievement.requirement.count;
                break;
                
            case 'stories_read':
                earned = gameState.player.completedStories.length >= achievement.requirement.count;
                break;
                
            case 'all_levels_complete':
                earned = gameState.player.completedLevels.length === 4;
                break;
        }
        
        if (earned) {
            gameState.player.achievements.push(achievement.achievementId);
            gameState.player.currentXP += achievement.xpBonus;
            gameState.player.totalXP += achievement.xpBonus;
            showNotification(`🏆 Achievement Unlocked: ${achievement.name}! +${achievement.xpBonus} XP`, 'success');
        }
    });
    
    saveGameState();
    updateUI();
}

// ===== UPDATE UI =====
function updateUI() {
    document.getElementById('display-name').textContent = gameState.player.username;
    document.getElementById('display-character').textContent = CHARACTER_EMOJIS[gameState.player.character];
    document.getElementById('current-xp').textContent = gameState.player.currentXP;
    document.getElementById('total-xp').textContent = gameState.player.totalXP;
    document.getElementById('current-level').textContent = gameState.player.currentLevel;
}

// ===== SAVE/LOAD GAME STATE =====
function saveGameState() {
    localStorage.setItem('spongeBobMathGame', JSON.stringify(gameState));
}

function loadGameState() {
    const saved = localStorage.getItem('spongeBobMathGame');
    if (saved) {
        const loaded = JSON.parse(saved);
        gameState = { ...gameState, ...loaded };
        
        // Ensure new properties exist
        if (!gameState.player.completedSubLevels) {
            gameState.player.completedSubLevels = [];
        }
        if (!gameState.currentSettingView) {
            gameState.currentSettingView = null;
        }
    }
}

// ===== NOTIFICATIONS =====
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} active`;
    
    setTimeout(() => {
        notification.classList.remove('active');
    }, 3000);
}

// ===== STORY AUDIO PLAYER FUNCTIONS =====

function initializeStoryAudioPlayer() {
    storyAudioPlayer = document.getElementById('story-audio-player');
    
    if (!storyAudioPlayer) return;
    
    const playBtn = document.getElementById('story-audio-play-btn');
    const pauseBtn = document.getElementById('story-audio-pause-btn');
    const progressBar = document.getElementById('audio-progress-bar');
    
    if (playBtn) playBtn.addEventListener('click', playStoryAudio);
    if (pauseBtn) pauseBtn.addEventListener('click', pauseStoryAudio);
    if (progressBar) progressBar.addEventListener('input', seekAudio);
    
    storyAudioPlayer.addEventListener('timeupdate', updateProgress);
    storyAudioPlayer.addEventListener('ended', onAudioEnded);
    storyAudioPlayer.addEventListener('loadedmetadata', onAudioLoaded);
    
    // Handle loading errors (if audio file doesn't exist)
    storyAudioPlayer.addEventListener('error', onAudioError);
}

function playStoryAudio() {
    if (storyAudioPlayer && storyAudioPlayer.src) {
        storyAudioPlayer.play().catch(err => {
            console.log('Audio play prevented:', err);
        });
        document.getElementById('story-audio-play-btn').style.display = 'none';
        document.getElementById('story-audio-pause-btn').style.display = 'inline-block';
    }
}

function pauseStoryAudio() {
    if (storyAudioPlayer) {
        storyAudioPlayer.pause();
        document.getElementById('story-audio-play-btn').style.display = 'inline-block';
        document.getElementById('story-audio-pause-btn').style.display = 'none';
    }
}

function seekAudio(e) {
    if (storyAudioPlayer && storyAudioPlayer.duration) {
        const seekTime = (e.target.value / 100) * storyAudioPlayer.duration;
        storyAudioPlayer.currentTime = seekTime;
    }
}

function updateProgress() {
    if (storyAudioPlayer && storyAudioPlayer.duration) {
        const progress = (storyAudioPlayer.currentTime / storyAudioPlayer.duration) * 100;
        document.getElementById('audio-progress-bar').value = progress;
        document.getElementById('audio-current-time').textContent = formatTime(storyAudioPlayer.currentTime);
        document.getElementById('audio-duration').textContent = formatTime(storyAudioPlayer.duration);
    }
}

function onAudioEnded() {
    document.getElementById('story-audio-play-btn').style.display = 'inline-block';
    document.getElementById('story-audio-pause-btn').style.display = 'none';
    document.getElementById('audio-progress-bar').value = 0;
    
    // Optional: Auto-play next page audio
    // Uncomment this if you want audio to continue to next page
    // navigateStory(1);
}

function onAudioLoaded() {
    if (storyAudioPlayer && storyAudioPlayer.duration) {
        document.getElementById('audio-duration').textContent = formatTime(storyAudioPlayer.duration);
    }
}

function onAudioError() {
    console.log('Audio file not found or failed to load');
    // Hide audio player if file doesn't exist
    const audioPlayerContainer = document.querySelector('.story-audio-player');
    if (audioPlayerContainer) {
        audioPlayerContainer.classList.add('hidden');
    }
}

function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Load audio for current story page
function loadStoryPageAudio(storyId, pageNumber) {
    const audioPlayerContainer = document.querySelector('.story-audio-player');
    
    if (!audioPlayerContainer || !storyAudioPlayer) return;
    
    const audioPath = `audio/${storyId}/page${pageNumber + 1}.mp3`;
    
    // Set the audio source
    storyAudioPlayer.src = audioPath;
    
    // Show the audio player
    audioPlayerContainer.classList.remove('hidden');
    
    // Reset controls
    document.getElementById('story-audio-play-btn').style.display = 'inline-block';
    document.getElementById('story-audio-pause-btn').style.display = 'none';
    document.getElementById('audio-progress-bar').value = 0;
    document.getElementById('audio-current-time').textContent = '0:00';
    document.getElementById('audio-duration').textContent = '0:00';
}

function stopStoryAudio() {
    if (storyAudioPlayer) {
        storyAudioPlayer.pause();
        storyAudioPlayer.currentTime = 0;
        storyAudioPlayer.src = ''; // Clear the source
        document.getElementById('story-audio-play-btn').style.display = 'inline-block';
        document.getElementById('story-audio-pause-btn').style.display = 'none';
        document.getElementById('audio-progress-bar').value = 0;
    }
}