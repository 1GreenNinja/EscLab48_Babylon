/* ============================================================================
   ESCAPE LAB 48 - BABYLON.JS EDITION
   HUD - Heads Up Display
   ============================================================================ */

class HUD {
    constructor(gameEngine) {
        this.game = gameEngine;
        
        this.healthBar = document.getElementById('healthBar');
        this.strengthBar = document.getElementById('strengthBar');
        this.strengthPercent = document.getElementById('strengthPercent');
        this.levelDisplay = document.getElementById('levelDisplay');
        this.objectiveDisplay = document.getElementById('objectiveDisplay');
        this.enemyCount = document.getElementById('enemyCount');
    }
    
    update() {
        const player = this.game.player;
        if (!player) return;
        
        // Update health bar
        const healthPercent = (player.health / player.maxHealth) * 100;
        this.healthBar.style.width = healthPercent + '%';
        
        // Update strength bar
        const strengthPercent = (player.strength / player.maxStrength) * 100;
        this.strengthBar.style.width = strengthPercent + '%';
        this.strengthPercent.textContent = Math.round(player.strength) + '%';
        
        // Color health bar based on amount
        if (healthPercent > 60) {
            this.healthBar.style.background = 'linear-gradient(90deg, #33cc33, #66ff66)';
        } else if (healthPercent > 30) {
            this.healthBar.style.background = 'linear-gradient(90deg, #ffaa00, #ffcc00)';
        } else {
            this.healthBar.style.background = 'linear-gradient(90deg, #ff3333, #ff6666)';
        }
        
        // Update enemy count
        if (this.game.activeLevel && this.game.activeLevel.enemies) {
            const aliveEnemies = this.game.activeLevel.enemies.filter(e => e.state !== 'dead').length;
            if (aliveEnemies > 0) {
                this.enemyCount.textContent = `⚠ ENEMIES: ${aliveEnemies}`;
            } else {
                this.enemyCount.textContent = '✓ AREA CLEAR';
                this.enemyCount.style.color = '#44ff44';
            }
        } else {
            this.enemyCount.textContent = '';
        }
    }
    
    setLevel(levelNumber) {
        const levelConfig = GAME.LEVELS[levelNumber];
        if (levelConfig) {
            this.levelDisplay.textContent = `LEVEL ${levelNumber}: ${levelConfig.name.toUpperCase()}`;
            this.objectiveDisplay.textContent = `Objective: ${levelConfig.objectives[0]}`;
        }
    }
    
    setObjective(text) {
        this.objectiveDisplay.textContent = `Objective: ${text}`;
    }
    
    showMessage(text, duration = 3000) {
        // Could add floating message display
        console.log(`HUD Message: ${text}`);
    }
}
