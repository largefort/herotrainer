class HeroTrainingTycoon {
    constructor() {
        this.gameData = {
            coins: 1000,
            gems: 50,
            exp: 0,
            level: 1,
            heroes: [],
            enemyLevel: 1,
            upgrades: {
                trainingSpeed: 1,
                battleRewards: 1,
                trainingSlots: 3
            },
            settings: {
                autoBattle: false,
                autoTrainer: false
            }
        };
        
        this.selectedHeroes = [];
        this.trainingSlots = [];
        this.battleInProgress = false;
        this.audioContext = null;
        this.autoTrainerInterval = null;
        
        this.init();
    }
    
    init() {
        this.initAudio();
        this.bindEvents();
        this.updateUI();
        this.startGameLoop();
        this.loadGame();
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Audio context not available');
        }
    }
    
    playSound(frequency, duration = 0.2, type = 'sine') {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    bindEvents() {
        document.getElementById('recruitBtn').addEventListener('click', () => this.recruitHero());
        document.getElementById('startTrainingBtn').addEventListener('click', () => this.startTraining());
        document.getElementById('battleBtn').addEventListener('click', () => this.startBattle());
        document.getElementById('autoBtn').addEventListener('click', () => this.toggleAutoBattle());
        document.getElementById('autoTrainerBtn').addEventListener('click', () => this.toggleAutoTrainer());
        
        // Upgrade buttons
        document.getElementById('upgradeTraining').addEventListener('click', () => this.buyUpgrade('training'));
        document.getElementById('upgradeRewards').addEventListener('click', () => this.buyUpgrade('rewards'));
        document.getElementById('upgradeSlots').addEventListener('click', () => this.buyUpgrade('slots'));
        
        // Touch events for mobile
        document.addEventListener('touchstart', (e) => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        }, { once: true });
        
        // Auto-save
        setInterval(() => this.saveGame(), 30000); // Save every 30 seconds
    }
    
    generateHeroName() {
        const prefixes = ['Sir', 'Lady', 'Captain', 'Lord', 'Dame', 'Knight', 'Warrior', 'Guardian'];
        const names = ['Aether', 'Blaze', 'Crimson', 'Dawn', 'Echo', 'Frost', 'Gale', 'Hawk', 'Iron', 'Jade'];
        const suffixes = ['blade', 'heart', 'storm', 'shield', 'fist', 'wing', 'fire', 'steel', 'light', 'shadow'];
        
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const name = names[Math.floor(Math.random() * names.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        
        return `${prefix} ${name}${suffix}`;
    }
    
    recruitHero() {
        if (this.gameData.coins < 500) {
            return;
        }
        
        const hero = {
            id: Date.now(),
            name: this.generateHeroName(),
            level: 1,
            attack: Math.floor(Math.random() * 20) + 10,
            defense: Math.floor(Math.random() * 20) + 10,
            speed: Math.floor(Math.random() * 20) + 10,
            status: 'idle',
            trainingProgress: 0,
            experience: 0
        };
        
        this.gameData.heroes.push(hero);
        this.gameData.coins -= 500;
        
        this.playSound(440, 0.3);
        this.updateUI();
        this.saveGame();
    }
    
    selectHero(heroId) {
        const heroCard = document.querySelector(`[data-hero-id="${heroId}"]`);
        if (!heroCard) return;
        
        const hero = this.gameData.heroes.find(h => h.id === heroId);
        if (!hero || hero.status !== 'idle') return;
        
        if (this.selectedHeroes.includes(heroId)) {
            this.selectedHeroes = this.selectedHeroes.filter(id => id !== heroId);
            heroCard.classList.remove('selected');
        } else if (this.selectedHeroes.length < this.gameData.upgrades.trainingSlots) {
            this.selectedHeroes.push(heroId);
            heroCard.classList.add('selected');
        }
        
        this.updateTrainingButton();
        this.playSound(330, 0.1);
    }
    
    updateTrainingButton() {
        const btn = document.getElementById('startTrainingBtn');
        const hasSelectedHeroes = this.selectedHeroes.length > 0;
        const hasIdleSlots = this.trainingSlots.filter(slot => slot && slot.hero).length < this.gameData.upgrades.trainingSlots;
        
        btn.disabled = !hasSelectedHeroes || !hasIdleSlots;
        
        if (hasSelectedHeroes && hasIdleSlots) {
            btn.textContent = `Start Training (${this.selectedHeroes.length} heroes)`;
        } else {
            btn.textContent = 'Start Training';
        }
    }
    
    startTraining() {
        if (this.selectedHeroes.length === 0) return;
        
        let slotIndex = 0;
        for (const heroId of this.selectedHeroes) {
            while (slotIndex < this.gameData.upgrades.trainingSlots && this.trainingSlots[slotIndex]?.hero) {
                slotIndex++;
            }
            
            if (slotIndex >= this.gameData.upgrades.trainingSlots) break;
            
            const hero = this.gameData.heroes.find(h => h.id === heroId);
            if (hero) {
                hero.status = 'training';
                hero.trainingProgress = 0;
                
                if (!this.trainingSlots[slotIndex]) {
                    this.trainingSlots[slotIndex] = {};
                }
                this.trainingSlots[slotIndex].hero = hero;
                this.trainingSlots[slotIndex].startTime = Date.now();
            }
            slotIndex++;
        }
        
        this.selectedHeroes = [];
        this.playSound(523, 0.4);
        this.updateUI();
        this.saveGame();
    }
    
    updateTraining() {
        const trainingDuration = 10000 / this.gameData.upgrades.trainingSpeed; // 10 seconds base
        
        for (let i = 0; i < this.trainingSlots.length; i++) {
            const slot = this.trainingSlots[i];
            if (slot && slot.hero && slot.startTime) {
                const elapsed = Date.now() - slot.startTime;
                const progress = Math.min(elapsed / trainingDuration, 1);
                slot.hero.trainingProgress = progress;
                
                if (progress >= 1) {
                    // Training complete
                    this.completeTraining(slot.hero);
                    this.trainingSlots[i] = { hero: null };
                }
            }
        }
    }
    
    completeTraining(hero) {
        hero.level++;
        hero.attack += Math.floor(Math.random() * 5) + 2;
        hero.defense += Math.floor(Math.random() * 5) + 2;
        hero.speed += Math.floor(Math.random() * 5) + 2;
        hero.status = 'idle';
        hero.trainingProgress = 0;
        hero.experience += 50;
        
        // Award gold for completed training
        const goldReward = hero.level * 25; // 25 gold per hero level
        this.gameData.coins += goldReward;
        
        this.gameData.exp += 25;
        this.checkLevelUp();
        
        this.playSound(659, 0.5);
        this.updateUI();
        this.saveGame();
    }
    
    startBattle() {
        const availableHeroes = this.gameData.heroes.filter(h => h.status === 'idle');
        if (availableHeroes.length === 0) {
            return;
        }
        
        // Select best hero for battle
        const battleHero = availableHeroes.sort((a, b) => (b.attack + b.defense + b.speed) - (a.attack + a.defense + a.speed))[0];
        battleHero.status = 'battle';
        
        this.battleInProgress = true;
        document.getElementById('battleOverlay').classList.remove('hidden');
        
        this.playSound(220, 0.6, 'sawtooth');
        
        // Battle duration based on hero stats vs enemy level
        const heroPower = battleHero.attack + battleHero.defense + battleHero.speed;
        const enemyPower = this.gameData.enemyLevel * 30;
        const battleDuration = Math.max(2000, 5000 - (heroPower - enemyPower) * 10);
        
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 100 / (battleDuration / 100);
            document.getElementById('battleProgressBar').style.width = `${Math.min(progress, 100)}%`;
        }, 100);
        
        setTimeout(() => {
            clearInterval(progressInterval);
            this.completeBattle(battleHero);
        }, battleDuration);
    }
    
    completeBattle(hero) {
        hero.status = 'idle';
        this.battleInProgress = false;
        document.getElementById('battleOverlay').classList.add('hidden');
        document.getElementById('battleProgressBar').style.width = '0%';
        
        const heroPower = hero.attack + hero.defense + hero.speed;
        const enemyPower = this.gameData.enemyLevel * 30;
        const victory = heroPower > enemyPower * 0.8; // 80% threshold for victory
        
        if (victory) {
            const reward = Math.floor(this.gameData.enemyLevel * 100 * this.gameData.upgrades.battleRewards);
            this.gameData.coins += reward;
            this.gameData.exp += this.gameData.enemyLevel * 10;
            hero.experience += this.gameData.enemyLevel * 20;
            
            // Chance to level up enemy
            if (Math.random() < 0.3) {
                this.gameData.enemyLevel++;
            }
            
            this.playSound(880, 0.8);
        } else {
            this.playSound(165, 1.0, 'sawtooth');
        }
        
        this.checkLevelUp();
        this.updateUI();
        this.saveGame();
        
        // Auto battle
        if (this.gameData.settings.autoBattle && victory) {
            setTimeout(() => {
                if (!this.battleInProgress) {
                    this.startBattle();
                }
            }, 2000);
        }
    }
    
    toggleAutoBattle() {
        this.gameData.settings.autoBattle = !this.gameData.settings.autoBattle;
        const btn = document.getElementById('autoBtn');
        btn.innerHTML = `
            <img src="auto-icon.png" alt="Auto" class="btn-icon">
            Auto Battle: ${this.gameData.settings.autoBattle ? 'ON' : 'OFF'}
        `;
        
        if (this.gameData.settings.autoBattle) {
            btn.classList.add('primary');
            btn.classList.remove('secondary');
        } else {
            btn.classList.add('secondary');
            btn.classList.remove('primary');
        }
        
        this.playSound(440, 0.2);
        this.saveGame();
    }
    
    toggleAutoTrainer() {
        this.gameData.settings.autoTrainer = !this.gameData.settings.autoTrainer;
        const btn = document.getElementById('autoTrainerBtn');
        btn.innerHTML = `
            <img src="auto-icon.png" alt="Auto Trainer" class="btn-icon">
            Auto Trainer: ${this.gameData.settings.autoTrainer ? 'ON' : 'OFF'}
        `;
        
        if (this.gameData.settings.autoTrainer) {
            btn.classList.add('primary');
            btn.classList.remove('secondary');
            this.startAutoTrainer();
        } else {
            btn.classList.add('secondary');
            btn.classList.remove('primary');
            this.stopAutoTrainer();
        }
        
        this.playSound(440, 0.2);
        this.saveGame();
    }
    
    startAutoTrainer() {
        if (this.autoTrainerInterval) {
            clearInterval(this.autoTrainerInterval);
        }
        
        this.autoTrainerInterval = setInterval(() => {
            this.performAutoTraining();
        }, 5000); // 5 second interval
    }
    
    stopAutoTrainer() {
        if (this.autoTrainerInterval) {
            clearInterval(this.autoTrainerInterval);
            this.autoTrainerInterval = null;
        }
    }
    
    performAutoTraining() {
        if (!this.gameData.settings.autoTrainer) return;
        
        // Check for available training slots
        const occupiedSlots = this.trainingSlots.filter(slot => slot && slot.hero).length;
        const availableSlots = this.gameData.upgrades.trainingSlots - occupiedSlots;
        
        if (availableSlots <= 0) return;
        
        // Get idle heroes
        const idleHeroes = this.gameData.heroes.filter(h => h.status === 'idle');
        
        if (idleHeroes.length === 0) return;
        
        // Select heroes to train (up to available slots)
        const heroesToTrain = idleHeroes.slice(0, availableSlots);
        
        // Clear any existing selections and select heroes for training
        this.selectedHeroes = heroesToTrain.map(h => h.id);
        
        // Start training automatically
        this.startTraining();
    }
    
    checkLevelUp() {
        const requiredExp = this.gameData.level * 100;
        if (this.gameData.exp >= requiredExp) {
            this.gameData.level++;
            this.gameData.exp -= requiredExp;
            
            this.playSound(1108, 1.0);
        }
    }
    
    buyUpgrade(type) {
        let cost, effect;
        
        switch (type) {
            case 'training':
                cost = Math.floor(2000 * Math.pow(1.5, this.gameData.upgrades.trainingSpeed - 1));
                if (this.gameData.coins >= cost) {
                    this.gameData.coins -= cost;
                    this.gameData.upgrades.trainingSpeed += 0.1;
                } else {
                    return;
                }
                break;
                
            case 'rewards':
                cost = Math.floor(1500 * Math.pow(1.4, this.gameData.upgrades.battleRewards - 1));
                if (this.gameData.coins >= cost) {
                    this.gameData.coins -= cost;
                    this.gameData.upgrades.battleRewards += 0.25;
                } else {
                    return;
                }
                break;
                
            case 'slots':
                cost = Math.floor(5000 * Math.pow(2, this.gameData.upgrades.trainingSlots - 3));
                if (this.gameData.coins >= cost) {
                    this.gameData.coins -= cost;
                    this.gameData.upgrades.trainingSlots++;
                    this.trainingSlots.push({ hero: null });
                } else {
                    return;
                }
                break;
        }
        
        this.playSound(698, 0.4);
        this.updateUI();
        this.saveGame();
    }
    
    updateUI() {
        // Update resources
        document.getElementById('coinCount').textContent = Math.floor(this.gameData.coins);
        document.getElementById('gemCount').textContent = Math.floor(this.gameData.gems);
        document.getElementById('expCount').textContent = Math.floor(this.gameData.exp);
        document.getElementById('playerLevel').textContent = this.gameData.level;
        
        // Update enemy info
        document.getElementById('enemyLevel').textContent = this.gameData.enemyLevel;
        document.getElementById('battleReward').textContent = Math.floor(this.gameData.enemyLevel * 100 * this.gameData.upgrades.battleRewards);
        
        // Update heroes list
        this.updateHeroesList();
        
        // Update training slots
        this.updateTrainingSlots();
        
        // Update battle button
        const availableHeroes = this.gameData.heroes.filter(h => h.status === 'idle');
        document.getElementById('battleBtn').disabled = availableHeroes.length === 0 || this.battleInProgress;
        
        // Update auto trainer button
        const autoTrainerBtn = document.getElementById('autoTrainerBtn');
        if (autoTrainerBtn) {
            autoTrainerBtn.innerHTML = `
                <img src="auto-icon.png" alt="Auto Trainer" class="btn-icon">
                Auto Trainer: ${this.gameData.settings.autoTrainer ? 'ON' : 'OFF'}
            `;
            
            if (this.gameData.settings.autoTrainer) {
                autoTrainerBtn.classList.add('primary');
                autoTrainerBtn.classList.remove('secondary');
            } else {
                autoTrainerBtn.classList.add('secondary');
                autoTrainerBtn.classList.remove('primary');
            }
        }
        
        // Update upgrade buttons
        this.updateUpgradeButtons();
        
        // Update recruit button
        document.getElementById('recruitBtn').disabled = this.gameData.coins < 500;
        
        this.updateTrainingButton();
    }
    
    updateHeroesList() {
        const container = document.getElementById('heroList');
        container.innerHTML = '';
        
        this.gameData.heroes.forEach(hero => {
            const heroElement = document.createElement('div');
            heroElement.className = 'hero-card';
            heroElement.dataset.heroId = hero.id;
            
            if (this.selectedHeroes.includes(hero.id)) {
                heroElement.classList.add('selected');
            }
            
            heroElement.innerHTML = `
                <div class="hero-info">
                    <div class="hero-name">${hero.name}</div>
                    <div class="hero-level-status">
                        <div class="hero-level">Lv.${hero.level}</div>
                        <div class="hero-status status-${hero.status}">${hero.status.toUpperCase()}</div>
                    </div>
                </div>
                <div class="hero-stats">
                    <div class="stat">ATK: <span class="stat-value">${hero.attack}</span></div>
                    <div class="stat">DEF: <span class="stat-value">${hero.defense}</span></div>
                    <div class="stat">SPD: <span class="stat-value">${hero.speed}</span></div>
                </div>
            `;
            
            heroElement.addEventListener('click', () => this.selectHero(hero.id));
            container.appendChild(heroElement);
        });
    }
    
    updateTrainingSlots() {
        // First ensure we have enough slot elements in the DOM
        const trainingArea = document.querySelector('.training-slots');
        const currentSlots = trainingArea.querySelectorAll('.training-slot').length;
        
        // Add missing slot elements if needed
        if (currentSlots < this.gameData.upgrades.trainingSlots) {
            for (let i = currentSlots; i < this.gameData.upgrades.trainingSlots; i++) {
                const slotElement = document.createElement('div');
                slotElement.className = 'training-slot';
                slotElement.id = `slot${i + 1}`;
                trainingArea.appendChild(slotElement);
            }
        }
        
        for (let i = 0; i < 6; i++) { // Max 6 slots for UI
            const slotElement = document.getElementById(`slot${i + 1}`);
            if (!slotElement) continue;
            
            if (i >= this.gameData.upgrades.trainingSlots) {
                slotElement.style.display = 'none';
                continue;
            }
            
            slotElement.style.display = 'flex';
            
            const slot = this.trainingSlots[i];
            if (slot && slot.hero) {
                slotElement.classList.add('occupied');
                const progress = Math.floor(slot.hero.trainingProgress * 100);
                slotElement.innerHTML = `
                    <div class="slot-hero">
                        ${slot.hero.name}
                        <div class="training-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progress}%"></div>
                            </div>
                            <div>${progress}%</div>
                        </div>
                    </div>
                `;
            } else {
                slotElement.classList.remove('occupied');
                slotElement.innerHTML = '<div class="slot-empty">Empty</div>';
            }
        }
    }
    
    updateUpgradeButtons() {
        // Training speed upgrade
        const trainingCost = Math.floor(2000 * Math.pow(1.5, this.gameData.upgrades.trainingSpeed - 1));
        const trainingBtn = document.getElementById('upgradeTraining');
        trainingBtn.disabled = this.gameData.coins < trainingCost;
        trainingBtn.querySelector('.upgrade-cost').textContent = `Cost: ${trainingCost} coins`;
        
        // Battle rewards upgrade
        const rewardsCost = Math.floor(1500 * Math.pow(1.4, this.gameData.upgrades.battleRewards - 1));
        const rewardsBtn = document.getElementById('upgradeRewards');
        rewardsBtn.disabled = this.gameData.coins < rewardsCost;
        rewardsBtn.querySelector('.upgrade-cost').textContent = `Cost: ${rewardsCost} coins`;
        
        // Training slots upgrade
        const slotsCost = Math.floor(5000 * Math.pow(2, this.gameData.upgrades.trainingSlots - 3));
        const slotsBtn = document.getElementById('upgradeSlots');
        slotsBtn.disabled = this.gameData.coins < slotsCost || this.gameData.upgrades.trainingSlots >= 6;
        slotsBtn.querySelector('.upgrade-cost').textContent = `Cost: ${slotsCost} coins`;
    }
    
    startGameLoop() {
        setInterval(() => {
            this.updateTraining();
            this.updateUI();
        }, 100);
    }
    
    saveGame() {
        const saveData = {
            ...this.gameData,
            trainingSlots: this.trainingSlots.map(slot => ({
                hero: slot.hero ? slot.hero.id : null,
                startTime: slot.startTime
            }))
        };
        localStorage.setItem('heroTrainingTycoon', JSON.stringify(saveData));
    }
    
    loadGame() {
        const savedData = localStorage.getItem('heroTrainingTycoon');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                this.gameData = { ...this.gameData, ...data };
                
                // Restore training slots
                if (data.trainingSlots) {
                    this.trainingSlots = data.trainingSlots.map(slot => {
                        if (slot.hero) {
                            const hero = this.gameData.heroes.find(h => h.id === slot.hero);
                            return {
                                hero: hero,
                                startTime: slot.startTime
                            };
                        }
                        return { hero: null };
                    });
                } else {
                    // Initialize training slots
                    this.trainingSlots = Array(this.gameData.upgrades.trainingSlots).fill().map(() => ({ hero: null }));
                }
                
                // Restart auto trainer if it was enabled
                if (this.gameData.settings.autoTrainer) {
                    this.startAutoTrainer();
                }
                
                this.updateUI();
            } catch (e) {
                console.error('Failed to load game:', e);
            }
        } else {
            // Initialize training slots for new game
            this.trainingSlots = Array(this.gameData.upgrades.trainingSlots).fill().map(() => ({ hero: null }));
        }
    }
}

// Start the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new HeroTrainingTycoon();
});