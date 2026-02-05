/* ============================================================================
   ESCAPE LAB 48 - BABYLON.JS EDITION
   Quake-Style Drop-Down Console
   ============================================================================ */

class GameConsole {
    constructor(gameEngine) {
        this.game = gameEngine;
        this.isOpen = false;
        this.history = [];
        this.historyIndex = -1;
        this.commandHistory = [];
        this.maxLines = 2000;
        
        this.createUI();
        this.hookConsole();
        this.registerCommands();
        this.bindKeys();
        
        this.log('═══════════════════════════════════════════════════', '#00ff00');
        this.log('  ESCAPE LAB 48 - DEVELOPER CONSOLE', '#00ff00');
        this.log('  Type "help" for available commands', '#888888');
        this.log('═══════════════════════════════════════════════════', '#00ff00');
    }
    
    createUI() {
        // Console container
        this.container = document.createElement('div');
        this.container.id = 'gameConsole';
        this.container.style.cssText = `
            position: fixed;
            top: -40%;
            left: 0;
            width: 100%;
            height: 40%;
            background: rgba(0, 0, 0, 0.92);
            border-bottom: 3px solid #00ff00;
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 14px;
            z-index: 9999;
            transition: top 0.3s ease-out;
            display: flex;
            flex-direction: column;
            box-shadow: 0 5px 30px rgba(0, 255, 0, 0.3);
        `;
        
        // Header bar
        const header = document.createElement('div');
        header.style.cssText = `
            background: linear-gradient(90deg, #001a00, #003300, #001a00);
            padding: 5px 15px;
            color: #00ff00;
            font-weight: bold;
            border-bottom: 1px solid #006600;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        header.innerHTML = `
            <span>ESCAPE LAB 48 CONSOLE</span>
            <span style="color: #666; font-size: 12px;">Press \` to close | ↑↓ history | Tab autocomplete</span>
        `;
        this.container.appendChild(header);
        
        // Output area
        this.output = document.createElement('div');
        this.output.id = 'consoleOutput';
        this.output.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 10px 15px;
            color: #00dd00;
            line-height: 1.4;
            scrollbar-width: thin;
            scrollbar-color: #00ff00 #001a00;
        `;
        this.container.appendChild(this.output);
        
        // Input line
        const inputContainer = document.createElement('div');
        inputContainer.style.cssText = `
            display: flex;
            align-items: center;
            padding: 8px 15px;
            background: #001a00;
            border-top: 1px solid #004400;
        `;
        
        const prompt = document.createElement('span');
        prompt.style.cssText = 'color: #00ff00; margin-right: 8px; font-weight: bold;';
        prompt.textContent = '>';
        inputContainer.appendChild(prompt);
        
        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.id = 'consoleInput';
        this.input.style.cssText = `
            flex: 1;
            background: transparent;
            border: none;
            outline: none;
            color: #00ff00;
            font-family: inherit;
            font-size: 14px;
            caret-color: #00ff00;
        `;
        this.input.placeholder = 'Enter command...';
        this.input.autocomplete = 'off';
        inputContainer.appendChild(this.input);
        
        this.container.appendChild(inputContainer);
        document.body.appendChild(this.container);
        
        // Input event handlers
        this.input.addEventListener('keydown', (e) => this.handleInput(e));
        
        // Allow all normal typing keys in console (WASDQE, numbers, symbols, etc)
        // These are handled by default HTML input behavior
        // Just make sure we DON'T prevent default for regular characters
    }
    
    hookConsole() {
        // Intercept console.log, warn, error
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;
        
        console.log = (...args) => {
            originalLog.apply(console, args);
            this.log(args.join(' '), '#00dd00');
        };
        
        console.warn = (...args) => {
            originalWarn.apply(console, args);
            this.log('⚠ ' + args.join(' '), '#ffaa00');
        };
        
        console.error = (...args) => {
            originalError.apply(console, args);
            this.log('✖ ' + args.join(' '), '#ff4444');
        };
    }
    
    bindKeys() {
        window.addEventListener('keydown', (e) => {
            // Backtick/tilde to toggle
            if (e.key === '`' || e.key === '~') {
                e.preventDefault();
                this.toggle();
            }
        });
    }
    
    toggle() {
        this.isOpen = !this.isOpen;
        
        if (this.isOpen) {
            this.container.style.top = '0';
            this.input.focus();
            // Pause game input but keep rendering
            if (this.game) {
                this.game.consolePaused = true;
            }
        } else {
            this.container.style.top = '-40%';
            this.input.blur();
            if (this.game) {
                this.game.consolePaused = false;
                // Re-lock pointer if game was running
                if (!this.game.isPaused) {
                    this.game.canvas.requestPointerLock();
                }
            }
        }
    }
    
    log(text, color = '#00dd00') {
        const line = document.createElement('div');
        line.style.color = color;
        line.style.whiteSpace = 'pre-wrap';
        line.style.wordBreak = 'break-word';
        line.textContent = text;
        
        this.output.appendChild(line);
        this.history.push({ text, color });
        
        // Limit history
        while (this.history.length > this.maxLines) {
            this.history.shift();
            if (this.output.firstChild) {
                this.output.removeChild(this.output.firstChild);
            }
        }
        
        // Auto-scroll to bottom
        this.output.scrollTop = this.output.scrollHeight;
    }
    
    handleInput(e) {
        // Allow normal text input (WASDQE and other characters)
        const key = e.key.toLowerCase();
        if (/^[a-z0-9 ]$/.test(key)) {
            // Normal typing - don't prevent, let it type naturally
            return;
        }
        
        if (e.key === 'Enter') {
            const cmd = this.input.value.trim();
            if (cmd) {
                this.log('> ' + cmd, '#ffffff');
                this.executeCommand(cmd);
                this.commandHistory.push(cmd);
                this.historyIndex = this.commandHistory.length;
            }
            this.input.value = '';
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.input.value = this.commandHistory[this.historyIndex];
            }
        }
        else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
                this.input.value = this.commandHistory[this.historyIndex];
            } else {
                this.historyIndex = this.commandHistory.length;
                this.input.value = '';
            }
        }
        else if (e.key === 'Tab') {
            e.preventDefault();
            this.autocomplete();
        }
        else if (e.key === 'Escape') {
            this.toggle();
        }
        // Allow +/- keys to pass through to editor when console is open
        else if (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '_' || e.code === 'NumpadAdd' || e.code === 'NumpadSubtract') {
            e.preventDefault();  // Don't let them type in the input
            // Keys will be handled by InputManager/GameEngine for editor rotation
        }
    }
    
    autocomplete() {
        const partial = this.input.value.toLowerCase();
        if (!partial) return;
        
        const matches = Object.keys(this.commands).filter(cmd => 
            cmd.startsWith(partial)
        );
        
        if (matches.length === 1) {
            this.input.value = matches[0] + ' ';
        } else if (matches.length > 1) {
            this.log('Matches: ' + matches.join(', '), '#888888');
        }
    }
    
    registerCommands() {
        this.commands = {
            help: {
                desc: 'Show available commands',
                fn: () => {
                    this.log('\n═══ AVAILABLE COMMANDS ═══', '#00ff00');
                    Object.entries(this.commands).forEach(([name, cmd]) => {
                        this.log(`  ${name.padEnd(15)} - ${cmd.desc}`, '#aaaaaa');
                    });
                    this.log('');
                }
            },
            
            clear: {
                desc: 'Clear console output',
                fn: () => {
                    this.output.innerHTML = '';
                    this.history = [];
                }
            },
            
            god: {
                desc: 'Toggle god mode (invincibility)',
                fn: () => {
                    if (this.game?.player) {
                        this.game.player.godMode = !this.game.player.godMode;
                        this.log(`God mode: ${this.game.player.godMode ? 'ON' : 'OFF'}`, '#ffff00');
                    }
                }
            },
            
            noclip: {
                desc: 'Toggle noclip (fly through walls)',
                fn: () => {
                    if (this.game?.player) {
                        this.game.player.noclip = !this.game.player.noclip;
                        
                        if (this.game.player.noclip) {
                            // Store original mass and disable physics collision
                            this.game.player._originalMass = 80;
                            if (this.game.player.physicsAggregate?.body) {
                                this.game.player.physicsAggregate.body.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);
                                this.game.player.physicsAggregate.body.setLinearVelocity(BABYLON.Vector3.Zero());
                            }
                            // Disable mesh collision
                            if (this.game.player.mesh) {
                                this.game.player.mesh.checkCollisions = false;
                            }
                            this.log('Noclip: ON - Use Space to fly up, Ctrl to fly down', '#00ffff');
                            this.log('Tip: Use WASD to move freely through walls!', '#888888');
                        } else {
                            // Re-enable physics
                            if (this.game.player.physicsAggregate?.body) {
                                this.game.player.physicsAggregate.body.setMotionType(BABYLON.PhysicsMotionType.DYNAMIC);
                            }
                            if (this.game.player.mesh) {
                                this.game.player.mesh.checkCollisions = true;
                            }
                            this.log('Noclip: OFF', '#ffff00');
                        }
                    }
                }
            },
            
            health: {
                desc: 'Set health (e.g., health 100)',
                fn: (args) => {
                    const amount = parseInt(args[0]) || 100;
                    if (this.game?.player) {
                        this.game.player.health = amount;
                        this.game.player.inventory.health = amount;
                        this.log(`Health set to ${amount}`, '#00ff00');
                    }
                }
            },
            
            strength: {
                desc: 'Set strength (e.g., strength 400)',
                fn: (args) => {
                    const amount = parseInt(args[0]) || 400;
                    if (this.game?.player) {
                        this.game.player.strength = amount;
                        this.log(`Strength set to ${amount}%`, '#ffaa00');
                    }
                }
            },
            
            give: {
                desc: 'Give item (e.g., give pistol, give keycard)',
                fn: (args) => {
                    const item = args[0]?.toLowerCase();
                    if (!item) {
                        this.log('Usage: give <item>', '#ff6666');
                        this.log('Items: pistol, rifle, shotgun, keycard, armor, health', '#888888');
                        return;
                    }
                    
                    if (this.game?.player) {
                        switch (item) {
                            case 'pistol':
                            case 'rifle':
                            case 'shotgun':
                                this.game.player.inventory.addWeapon(item);
                                this.log(`Given: ${item}`, '#00ff00');
                                break;
                            case 'keycard':
                                this.game.player.inventory.addItem('Security Keycard');
                                if (this.game.activeLevel) {
                                    this.game.activeLevel.hasKeycard = true;
                                }
                                this.log('Given: Security Keycard', '#00ff00');
                                break;
                            case 'armor':
                                this.game.player.inventory.addArmor(100);
                                this.log('Given: Full armor', '#00ff00');
                                break;
                            case 'health':
                                this.game.player.inventory.addHealth(100);
                                this.log('Given: Full health', '#00ff00');
                                break;
                            default:
                                this.log(`Unknown item: ${item}`, '#ff6666');
                        }
                        this.game.player.updateInventoryHUD();
                    }
                }
            },
            
            kill: {
                desc: 'Kill all enemies',
                fn: () => {
                    if (this.game?.activeLevel?.enemies) {
                        let count = 0;
                        this.game.activeLevel.enemies.forEach(e => {
                            if (e.state !== 'dead') {
                                e.die();
                                count++;
                            }
                        });
                        this.log(`Killed ${count} enemies`, '#ff4444');
                    }
                }
            },
            
            pos: {
                desc: 'Show player position',
                fn: () => {
                    if (this.game?.player?.mesh) {
                        const p = this.game.player.mesh.position;
                        this.log(`Position: X=${p.x.toFixed(2)}, Y=${p.y.toFixed(2)}, Z=${p.z.toFixed(2)}`, '#00ffff');
                    }
                }
            },
            
            tp: {
                desc: 'Teleport (e.g., tp 0 2 0)',
                fn: (args) => {
                    if (args.length < 3) {
                        this.log('Usage: tp <x> <y> <z>', '#ff6666');
                        return;
                    }
                    const x = parseFloat(args[0]) || 0;
                    const y = parseFloat(args[1]) || 2;
                    const z = parseFloat(args[2]) || 0;
                    
                    if (this.game?.player) {
                        this.game.player.setPosition(new BABYLON.Vector3(x, y, z));
                        this.log(`Teleported to (${x}, ${y}, ${z})`, '#00ffff');
                    }
                }
            },
            
            level: {
                desc: 'Load level (e.g., level 2)',
                fn: (args) => {
                    const num = parseInt(args[0]);
                    if (num && this.game) {
                        this.log(`Loading level ${num}...`, '#ffff00');
                        this.game.loadLevel(num);
                    } else {
                        this.log('Usage: level <number>', '#ff6666');
                    }
                }
            },
            
            unlock: {
                desc: 'Unlock the security door',
                fn: () => {
                    if (this.game?.activeLevel?.unlockDoor) {
                        this.game.activeLevel.unlockDoor();
                        this.log('Door unlocked!', '#00ff00');
                    }
                }
            },
            
            bendall: {
                desc: 'Bend all cell bars',
                fn: () => {
                    if (this.game?.activeLevel?.bars) {
                        this.game.activeLevel.bars.forEach(bar => {
                            if (bar.metadata?.interactable && !bar.metadata?.bent) {
                                this.game.player.bendBar(bar);
                            }
                        });
                        this.log('All bars bent!', '#00ff00');
                    }
                }
            },
            
            fps: {
                desc: 'Toggle FPS counter',
                fn: () => {
                    if (!this.fpsDisplay) {
                        this.fpsDisplay = document.createElement('div');
                        this.fpsDisplay.style.cssText = `
                            position: fixed;
                            top: 10px;
                            right: 10px;
                            background: rgba(0,0,0,0.7);
                            color: #0f0;
                            padding: 5px 10px;
                            font-family: monospace;
                            z-index: 1000;
                        `;
                        document.body.appendChild(this.fpsDisplay);
                        
                        this.fpsInterval = setInterval(() => {
                            if (this.game?.engine) {
                                this.fpsDisplay.textContent = `FPS: ${this.game.engine.getFps().toFixed(0)}`;
                            }
                        }, 100);
                        this.log('FPS display: ON', '#00ff00');
                    } else {
                        clearInterval(this.fpsInterval);
                        this.fpsDisplay.remove();
                        this.fpsDisplay = null;
                        this.log('FPS display: OFF', '#00ff00');
                    }
                }
            },
            
            wireframe: {
                desc: 'Toggle wireframe rendering',
                fn: () => {
                    if (this.game?.scene) {
                        this.game.scene.forceWireframe = !this.game.scene.forceWireframe;
                        this.log(`Wireframe: ${this.game.scene.forceWireframe ? 'ON' : 'OFF'}`, '#00ffff');
                    }
                }
            },
            
            timescale: {
                desc: 'Set game speed (e.g., timescale 0.5)',
                fn: (args) => {
                    const scale = parseFloat(args[0]) || 1.0;
                    if (this.game?.scene) {
                        // Babylon doesn't have built-in timescale, but we can affect animations
                        this.game.scene.animationGroups?.forEach(ag => {
                            ag.speedRatio = scale;
                        });
                        this.log(`Timescale: ${scale}`, '#00ffff');
                    }
                }
            },
            
            spawn: {
                desc: 'Spawn entity (e.g., spawn guard)',
                fn: (args) => {
                    const type = args[0]?.toLowerCase();
                    if (!type) {
                        this.log('Usage: spawn <guard|drone>', '#ff6666');
                        return;
                    }
                    
                    if (this.game?.player && this.game.activeLevel) {
                        const pos = this.game.player.mesh.position.clone();
                        pos.z += 3; // Spawn in front
                        
                        let enemy;
                        if (type === 'guard') {
                            enemy = new Guard(this.game.scene, pos);
                        } else if (type === 'drone') {
                            enemy = new Drone(this.game.scene, pos);
                        }
                        
                        if (enemy) {
                            enemy.init(this.game.modelLoader);
                            if (!this.game.activeLevel.enemies) {
                                this.game.activeLevel.enemies = [];
                            }
                            this.game.activeLevel.enemies.push(enemy);
                            this.log(`Spawned ${type} at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`, '#00ff00');
                        }
                    }
                }
            },
            
            say: {
                desc: 'Make Jake speak (e.g., say Hello world)',
                fn: (args) => {
                    const text = args.join(' ');
                    if (text && this.game?.activeLevel?.speak) {
                        this.game.activeLevel.speak(text);
                        this.log(`Jake: "${text}"`, '#ffaa00');
                    }
                }
            },

            speech: {
                desc: 'Toggle speech on/off (default off)',
                fn: () => {
                    if (!this.game?.activeLevel) return;
                    const level = this.game.activeLevel;
                    level.speechEnabled = !level.speechEnabled;
                    this.log(`Speech ${level.speechEnabled ? 'enabled' : 'disabled'}.`, '#00ff00');
                }
            },
            
            voices: {
                desc: 'List all available voices',
                fn: () => {
                    const synth = window.speechSynthesis;
                    const voices = synth.getVoices();
                    this.log('\n═══ AVAILABLE VOICES ═══', '#00ffff');
                    this.log('Use: voice <number> to select', '#888888');
                    this.log('');
                    voices.forEach((v, i) => {
                        const current = (this.game?.activeLevel?.jakeVoice?.name === v.name) ? ' ◄ CURRENT' : '';
                        const color = v.name.includes('Natural') ? '#00ff00' : 
                                     v.name.includes('Google') ? '#ffff00' : '#aaaaaa';
                        this.log(`  ${i.toString().padStart(2)}: ${v.name} (${v.lang})${current}`, color);
                    });
                    this.log('\nTip: "Natural" voices sound best!', '#00ff00');
                }
            },
            
            voice: {
                desc: 'Set Jake\'s voice (e.g., voice 5)',
                fn: (args) => {
                    const index = parseInt(args[0]);
                    const synth = window.speechSynthesis;
                    const voices = synth.getVoices();
                    
                    if (isNaN(index) || index < 0 || index >= voices.length) {
                        this.log(`Invalid voice index. Use 0-${voices.length - 1}`, '#ff6666');
                        this.log('Type "voices" to see available voices', '#888888');
                        return;
                    }
                    
                    if (this.game?.activeLevel) {
                        this.game.activeLevel.jakeVoice = voices[index];
                        this.log(`Voice set to: ${voices[index].name}`, '#00ff00');
                        // Test it
                        this.game.activeLevel.speak("Testing. One, two, three. I feel stronger.");
                    }
                }
            },
            
            pitch: {
                desc: 'Set voice pitch 0.5-2.0 (e.g., pitch 0.8)',
                fn: (args) => {
                    const val = parseFloat(args[0]);
                    if (isNaN(val) || val < 0.5 || val > 2.0) {
                        this.log('Pitch must be 0.5-2.0 (1.0 = normal, lower = deeper)', '#ff6666');
                        return;
                    }
                    if (this.game?.activeLevel) {
                        this.game.activeLevel.basePitch = val;
                        this.log(`Base pitch set to: ${val}`, '#00ff00');
                        this.game.activeLevel.speak("Testing pitch. I feel stronger.");
                    }
                }
            },
            
            rate: {
                desc: 'Set voice speed 0.5-2.0 (e.g., rate 0.9)',
                fn: (args) => {
                    const val = parseFloat(args[0]);
                    if (isNaN(val) || val < 0.5 || val > 2.0) {
                        this.log('Rate must be 0.5-2.0 (1.0 = normal)', '#ff6666');
                        return;
                    }
                    if (this.game?.activeLevel) {
                        this.game.activeLevel.baseRate = val;
                        this.log(`Base rate set to: ${val}`, '#00ff00');
                        this.game.activeLevel.speak("Testing speech rate.");
                    }
                }
            },
            
            // ═══════════════════════════════════════════════════
            // CLASSIC DOOM CHEAT CODES
            // ═══════════════════════════════════════════════════
            
            iddqd: {
                desc: '🎮 DOOM: God Mode (invincibility)',
                fn: () => {
                    if (this.game?.player) {
                        this.game.player.godMode = true;
                        this.game.player.health = this.game.player.maxHealth;
                        this.game.player.inventory.health = this.game.player.maxHealth;
                        this.log('', '#ffff00');
                        this.log('  ██╗██████╗ ██████╗  ██████╗ ██████╗ ', '#ff0000');
                        this.log('  ██║██╔══██╗██╔══██╗██╔═══██╗██╔══██╗', '#ff0000');
                        this.log('  ██║██║  ██║██║  ██║██║   ██║██║  ██║', '#ff0000');
                        this.log('  ██║██║  ██║██║  ██║██║▄▄ ██║██║  ██║', '#ff0000');
                        this.log('  ██║██████╔╝██████╔╝╚██████╔╝██████╔╝', '#ff0000');
                        this.log('  ╚═╝╚═════╝ ╚═════╝  ╚══▀▀═╝ ╚═════╝ ', '#ff0000');
                        this.log('', '#ffff00');
                        this.log('  "Degreelessness Mode" - You are INVINCIBLE!', '#ffff00');
                        this.log('', '#ffff00');
                        
                        // Play sound or speak
                        if (this.game.activeLevel?.speak) {
                            this.game.activeLevel.speak("I feel... invincible!");
                        }
                    }
                }
            },
            
            idkfa: {
                desc: '🎮 DOOM: All weapons, full ammo, keys',
                fn: () => {
                    if (this.game?.player) {
                        const inv = this.game.player.inventory;
                        
                        // All weapons
                        inv.addWeapon('pistol');
                        inv.addWeapon('rifle');
                        inv.addWeapon('shotgun');
                        
                        // Max ammo for all
                        inv.ammo.pistol = 200;
                        inv.ammo.rifle = 200;
                        inv.ammo.shotgun = 200;
                        
                        // Full armor
                        inv.addArmor(100);
                        this.game.player.armor = inv.armor;
                        
                        // All keycards
                        inv.addItem('Security Keycard');
                        inv.addItem('Lab Keycard');
                        inv.addItem('Master Keycard');
                        if (this.game.activeLevel) {
                            this.game.activeLevel.hasKeycard = true;
                        }
                        
                        // Update player reference
                        this.game.player.weapons = inv.weapons;
                        
                        this.log('', '#ffff00');
                        this.log('  ██╗██████╗ ██╗  ██╗███████╗ █████╗ ', '#00ff00');
                        this.log('  ██║██╔══██╗██║ ██╔╝██╔════╝██╔══██╗', '#00ff00');
                        this.log('  ██║██║  ██║█████╔╝ █████╗  ███████║', '#00ff00');
                        this.log('  ██║██║  ██║██╔═██╗ ██╔══╝  ██╔══██║', '#00ff00');
                        this.log('  ██║██████╔╝██║  ██╗██║     ██║  ██║', '#00ff00');
                        this.log('  ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝', '#00ff00');
                        this.log('', '#ffff00');
                        this.log('  "Keys Full Ammo" - All weapons, ammo, armor & keys!', '#ffff00');
                        this.log('', '#ffff00');
                        
                        this.game.player.updateInventoryHUD();
                        
                        if (this.game.activeLevel?.speak) {
                            this.game.activeLevel.speak("Now we're talking! Fully loaded.");
                        }
                    }
                }
            },
            
            idclip: {
                desc: '🎮 DOOM: Noclip (fly through walls)',
                fn: () => {
                    // Just calls noclip
                    this.commands.noclip.fn();
                    if (this.game?.player?.noclip) {
                        this.log('', '#00ffff');
                        this.log('  ██╗██████╗  ██████╗██╗     ██╗██████╗ ', '#00ffff');
                        this.log('  ██║██╔══██╗██╔════╝██║     ██║██╔══██╗', '#00ffff');
                        this.log('  ██║██║  ██║██║     ██║     ██║██████╔╝', '#00ffff');
                        this.log('  ██║██║  ██║██║     ██║     ██║██╔═══╝ ', '#00ffff');
                        this.log('  ██║██████╔╝╚██████╗███████╗██║██║     ', '#00ffff');
                        this.log('  ╚═╝╚═════╝  ╚═════╝╚══════╝╚═╝╚═╝     ', '#00ffff');
                        this.log('', '#00ffff');
                        this.log('  Use WASD + Space/Ctrl to fly! Walk through walls!', '#ffff00');
                    }
                }
            },
            
            idspispopd: {
                desc: '🎮 DOOM I: Original noclip code',
                fn: () => {
                    // Doom 1 noclip cheat
                    this.commands.idclip.fn();
                }
            },
            
            idbehold: {
                desc: '🎮 DOOM: Power-ups menu',
                fn: () => {
                    this.log('', '#ff00ff');
                    this.log('═══ IDBEHOLD POWER-UPS ═══', '#ff00ff');
                    this.log('  idbehold v - Invulnerability (god mode)', '#aaaaaa');
                    this.log('  idbehold s - Berserk (max strength)', '#aaaaaa');
                    this.log('  idbehold i - Invisibility (coming soon)', '#666666');
                    this.log('  idbehold a - Full Armor', '#aaaaaa');
                    this.log('  idbehold l - Light Amp (fullbright)', '#aaaaaa');
                    this.log('');
                }
            },
            
            'idbehold v': {
                desc: '🎮 Invulnerability sphere',
                fn: () => { this.commands.iddqd.fn(); }
            },
            
            'idbehold s': {
                desc: '🎮 Berserk pack (max strength)',
                fn: () => {
                    if (this.game?.player) {
                        this.game.player.strength = 999;
                        this.log('BERSERK! Strength maxed to 999%!', '#ff4444');
                        if (this.game.activeLevel?.speak) {
                            this.game.activeLevel.speak("RAAAGH! UNLIMITED POWER!");
                        }
                    }
                }
            },
            
            'idbehold a': {
                desc: '🎮 Full armor',
                fn: () => {
                    if (this.game?.player) {
                        this.game.player.inventory.addArmor(100);
                        this.game.player.armor = 100;
                        this.log('Full armor!', '#0088ff');
                        this.game.player.updateInventoryHUD();
                    }
                }
            },
            
            'idbehold l': {
                desc: '🎮 Light amplification (fullbright)',
                fn: () => {
                    if (this.game?.scene) {
                        const ambient = this.game.scene.getLightByName('ambient');
                        if (ambient) {
                            if (ambient.intensity < 1) {
                                ambient.intensity = 2.0;
                                this.log('FULLBRIGHT ON - Light amplification goggles!', '#ffff00');
                            } else {
                                ambient.intensity = 0.3;
                                this.log('Fullbright OFF', '#888888');
                            }
                        }
                    }
                }
            },
            
            // ═══════════════════════════════════════════════════════
            // QUAKE 3 STYLE COMMANDS
            // ═══════════════════════════════════════════════════════
            
            cg_fov: {
                desc: 'Set field of view (60-120)',
                fn: (args) => {
                    const fov = parseInt(args[0]) || 75;
                    const clampedFov = Math.max(60, Math.min(120, fov));
                    if (this.game?.camera) {
                        this.game.camera.fov = clampedFov * Math.PI / 180;
                        this.log(`FOV set to ${clampedFov}`, '#00ff00');
                    }
                }
            },
            
            cg_thirdperson: {
                desc: 'Toggle third person view (0/1)',
                fn: (args) => {
                    if (this.game?.player) {
                        const val = args[0];
                        if (val === '0') {
                            this.game.player.firstPersonMode = true;
                            this.log('First person mode', '#00ffff');
                        } else if (val === '1') {
                            this.game.player.firstPersonMode = false;
                            this.log('Third person mode', '#00ffff');
                        } else {
                            this.game.player.firstPersonMode = !this.game.player.firstPersonMode;
                            this.log(`Camera: ${this.game.player.firstPersonMode ? 'First' : 'Third'} person`, '#00ffff');
                        }
                    }
                }
            },
            
            thirdperson: {
                desc: 'Switch to third person view',
                fn: () => {
                    if (this.game?.player) {
                        this.game.player.firstPersonMode = false;
                        this.log('Third person mode enabled', '#00ffff');
                    }
                }
            },
            
            firstperson: {
                desc: 'Switch to first person view',
                fn: () => {
                    if (this.game?.player) {
                        this.game.player.firstPersonMode = true;
                        this.log('First person mode enabled', '#00ffff');
                    }
                }
            },
            
            notarget: {
                desc: 'Toggle enemy targeting (enemies ignore you)',
                fn: () => {
                    if (this.game?.player) {
                        this.game.player.notarget = !this.game.player.notarget;
                        this.log(`Notarget: ${this.game.player.notarget ? 'ON - Enemies ignore you' : 'OFF'}`, '#ffff00');
                    }
                }
            },
            
            fly: {
                desc: 'Toggle flight mode (with gravity)',
                fn: () => {
                    if (this.game?.player) {
                        this.game.player.flyMode = !this.game.player.flyMode;
                        this.log(`Flight mode: ${this.game.player.flyMode ? 'ON' : 'OFF'}`, '#00ffff');
                        if (this.game.player.flyMode) {
                            this.log('Press Space to ascend, Ctrl to descend', '#888888');
                        }
                    }
                }
            },
            
            idfa: {
                desc: '🎮 DOOM: Full ammo + weapons (no keys)',
                fn: () => {
                    if (this.game?.player) {
                        const inv = this.game.player.inventory;
                        inv.addWeapon('pistol');
                        inv.addWeapon('rifle');
                        inv.addWeapon('shotgun');
                        inv.ammo.pistol = 200;
                        inv.ammo.rifle = 200;
                        inv.ammo.shotgun = 200;
                        inv.addArmor(100);
                        this.game.player.weapons = inv.weapons;
                        this.game.player.armor = inv.armor;
                        this.log('IDFA - All weapons, max ammo, full armor!', '#00ff00');
                        this.game.player.updateInventoryHUD();
                    }
                }
            },
            
            iddt: {
                desc: '🎮 DOOM: Toggle map reveal (see enemies)',
                fn: () => {
                    if (!this.mapReveal) this.mapReveal = 0;
                    this.mapReveal = (this.mapReveal + 1) % 3;
                    
                    if (this.game?.activeLevel?.enemies) {
                        this.game.activeLevel.enemies.forEach(enemy => {
                            if (enemy.mesh) {
                                // Create or update enemy marker
                                if (!enemy.mapMarker) {
                                    enemy.mapMarker = BABYLON.MeshBuilder.CreateSphere('marker', { diameter: 0.5 }, this.game.scene);
                                    const mat = new BABYLON.StandardMaterial('markerMat', this.game.scene);
                                    mat.emissiveColor = new BABYLON.Color3(1, 0, 0);
                                    mat.disableLighting = true;
                                    enemy.mapMarker.material = mat;
                                    enemy.mapMarker.renderingGroupId = 3;
                                }
                                enemy.mapMarker.isVisible = this.mapReveal > 0;
                                enemy.mapMarker.position = enemy.position.clone();
                                enemy.mapMarker.position.y += 3;
                            }
                        });
                    }
                    
                    const msgs = ['Map reveal OFF', 'Map reveal ON (items)', 'Map reveal ON (enemies + items)'];
                    this.log(msgs[this.mapReveal], '#ffff00');
                }
            },
            
            idmypos: {
                desc: '🎮 DOOM: Show coordinates',
                fn: () => { this.commands.pos.fn(); }
            },
            
            idclev: {
                desc: '🎮 DOOM: Warp to level (e.g., idclev 2)',
                fn: (args) => {
                    const lvl = parseInt(args[0]);
                    if (lvl && this.game) {
                        this.log(`Warping to level ${lvl}...`, '#ffff00');
                        this.game.loadLevel(lvl);
                    } else {
                        this.log('Usage: idclev <level_number>', '#ff6666');
                    }
                }
            },
            
            'give all': {
                desc: 'Give everything (Quake style)',
                fn: () => { this.commands.idkfa.fn(); }
            },
            
            'give weapons': {
                desc: 'Give all weapons',
                fn: () => {
                    if (this.game?.player) {
                        const inv = this.game.player.inventory;
                        inv.addWeapon('pistol');
                        inv.addWeapon('rifle');
                        inv.addWeapon('shotgun');
                        this.game.player.weapons = inv.weapons;
                        this.log('All weapons given!', '#00ff00');
                        this.game.player.updateInventoryHUD();
                    }
                }
            },
            
            'give ammo': {
                desc: 'Give max ammo',
                fn: () => {
                    if (this.game?.player) {
                        const inv = this.game.player.inventory;
                        inv.ammo.pistol = 200;
                        inv.ammo.rifle = 200;
                        inv.ammo.shotgun = 200;
                        this.log('Max ammo!', '#00ff00');
                        this.game.player.updateInventoryHUD();
                    }
                }
            },
            
            com_maxfps: {
                desc: 'Set max FPS (0 = unlimited)',
                fn: (args) => {
                    const fps = parseInt(args[0]);
                    if (this.game?.engine) {
                        if (fps === 0) {
                            this.game.engine.setHardwareScalingLevel(1);
                            this.log('FPS: Unlimited', '#00ff00');
                        } else {
                            // Babylon doesn't have direct FPS cap, but we can suggest VSync
                            this.log(`Target FPS: ${fps} (use browser VSync for best results)`, '#ffff00');
                        }
                    }
                }
            },
            
            r_fullbright: {
                desc: 'Toggle fullbright (0/1)',
                fn: (args) => {
                    this.commands['idbehold l'].fn();
                }
            },
            
            // ═══════════════════════════════════════════════════════
            // GAME COMMANDS
            // ═══════════════════════════════════════════════════════
            
            save: {
                desc: 'Save game state',
                fn: (args) => {
                    const slot = args[0] || 'quicksave';
                    if (this.game) {
                        const saveData = {
                            version: 1,
                            timestamp: Date.now(),
                            level: this.game.currentLevel,
                            player: {
                                position: this.game.player?.mesh?.position ? {
                                    x: this.game.player.mesh.position.x,
                                    y: this.game.player.mesh.position.y,
                                    z: this.game.player.mesh.position.z
                                } : null,
                                health: this.game.player?.health,
                                armor: this.game.player?.armor,
                                strength: this.game.player?.strength,
                                inventory: this.game.player?.inventory ? {
                                    weapons: [...this.game.player.inventory.weapons],
                                    ammo: {...this.game.player.inventory.ammo},
                                    items: [...this.game.player.inventory.items],
                                    health: this.game.player.inventory.health,
                                    armor: this.game.player.inventory.armor
                                } : null
                            },
                            levelState: {
                                hasKeycard: this.game.activeLevel?.hasKeycard,
                                doorUnlocked: this.game.activeLevel?.doorUnlocked,
                                barsBent: this.game.activeLevel?.bars?.filter(b => b.metadata?.bent).length || 0
                            }
                        };
                        
                        localStorage.setItem(`escapelab48_save_${slot}`, JSON.stringify(saveData));
                        this.log(`Game saved to slot: ${slot}`, '#00ff00');
                        this.log(`Level ${saveData.level}, HP: ${saveData.player.health}`, '#888888');
                    }
                }
            },
            
            load: {
                desc: 'Load game state',
                fn: (args) => {
                    const slot = args[0] || 'quicksave';
                    const saveJson = localStorage.getItem(`escapelab48_save_${slot}`);
                    
                    if (!saveJson) {
                        this.log(`No save found in slot: ${slot}`, '#ff6666');
                        this.log('Available: ' + this.getSaveSlots().join(', ') || 'none', '#888888');
                        return;
                    }
                    
                    try {
                        const saveData = JSON.parse(saveJson);
                        this.log(`Loading save: ${slot}...`, '#ffff00');
                        
                        // Load level if different
                        if (this.game.currentLevel !== saveData.level) {
                            this.game.loadLevel(saveData.level);
                        }
                        
                        // Restore player state
                        setTimeout(() => {
                            if (saveData.player.position && this.game.player) {
                                this.game.player.setPosition(new BABYLON.Vector3(
                                    saveData.player.position.x,
                                    saveData.player.position.y,
                                    saveData.player.position.z
                                ));
                            }
                            
                            if (this.game.player) {
                                this.game.player.health = saveData.player.health;
                                this.game.player.armor = saveData.player.armor;
                                this.game.player.strength = saveData.player.strength;
                                
                                // Restore inventory
                                if (saveData.player.inventory) {
                                    Object.assign(this.game.player.inventory, saveData.player.inventory);
                                    this.game.player.weapons = this.game.player.inventory.weapons;
                                }
                                
                                this.game.player.updateInventoryHUD();
                            }
                            
                            // Restore level state
                            if (this.game.activeLevel && saveData.levelState) {
                                this.game.activeLevel.hasKeycard = saveData.levelState.hasKeycard;
                                this.game.activeLevel.doorUnlocked = saveData.levelState.doorUnlocked;
                            }
                            
                            this.log(`Loaded! Level ${saveData.level}`, '#00ff00');
                        }, 500);
                        
                    } catch (e) {
                        this.log(`Error loading save: ${e.message}`, '#ff4444');
                    }
                }
            },
            
            savelist: {
                desc: 'List all save slots',
                fn: () => {
                    const slots = this.getSaveSlots();
                    if (slots.length === 0) {
                        this.log('No saves found', '#888888');
                    } else {
                        this.log('═══ SAVE SLOTS ═══', '#00ffff');
                        slots.forEach(slot => {
                            const data = JSON.parse(localStorage.getItem(`escapelab48_save_${slot}`));
                            const date = new Date(data.timestamp).toLocaleString();
                            this.log(`  ${slot}: Level ${data.level}, HP ${data.player.health} - ${date}`, '#aaaaaa');
                        });
                    }
                }
            },
            
            deletesave: {
                desc: 'Delete a save slot',
                fn: (args) => {
                    const slot = args[0];
                    if (!slot) {
                        this.log('Usage: deletesave <slot_name>', '#ff6666');
                        return;
                    }
                    localStorage.removeItem(`escapelab48_save_${slot}`);
                    this.log(`Deleted save: ${slot}`, '#ffff00');
                }
            },
            
            // ═══════════════════════════════════════════════════════
            // SOUND COMMANDS
            // ═══════════════════════════════════════════════════════
            
            music: {
                desc: 'Toggle or set music volume (0-100)',
                fn: (args) => {
                    if (this.game?.soundSystem) {
                        if (args[0]) {
                            const vol = parseInt(args[0]) / 100;
                            this.game.soundSystem.setMusicVolume(vol);
                            this.log(`Music volume: ${args[0]}%`, '#00ff00');
                        } else {
                            this.game.soundSystem.toggleMusic();
                        }
                    } else {
                        this.log('Sound system not initialized', '#888888');
                    }
                }
            },
            
            sfx: {
                desc: 'Set sound effects volume (0-100)',
                fn: (args) => {
                    if (this.game?.soundSystem) {
                        const vol = parseInt(args[0] || '100') / 100;
                        this.game.soundSystem.setSFXVolume(vol);
                        this.log(`SFX volume: ${Math.round(vol * 100)}%`, '#00ff00');
                    }
                }
            },
            
            playsound: {
                desc: 'Play a sound effect',
                fn: (args) => {
                    const sound = args[0] || 'punch';
                    if (this.game?.soundSystem) {
                        this.game.soundSystem.play(sound);
                        this.log(`Playing: ${sound}`, '#00ff00');
                    }
                }
            },
            
            testrot: {
                desc: 'Test Jake rotation (e.g., testrot 90 0 90)',
                fn: (args) => {
                    if (args.length < 3) {
                        this.log('Usage: testrot <x degrees> <y degrees> <z degrees>', '#ff6666');
                        this.log('Example: testrot 90 0 90', '#888888');
                        return;
                    }
                    
                    const xDeg = parseFloat(args[0]);
                    const yDeg = parseFloat(args[1]);
                    const zDeg = parseFloat(args[2]);
                    
                    if (this.game?.player?.visualMesh) {
                        const x = xDeg * Math.PI / 180;
                        const y = yDeg * Math.PI / 180;
                        const z = zDeg * Math.PI / 180;
                        
                        this.game.player.visualMesh.rotation.set(x, y, z);
                        this.log(`Jake rotated to: X=${xDeg}°, Y=${yDeg}°, Z=${zDeg}°`, '#00ff00');
                    }
                }
            },
            
            quit: {
                desc: 'Close the console',
                fn: () => {
                    this.toggle();
                }
            },
            
            skipintro: {
                desc: 'Skip the intro sequence',
                fn: () => {
                    if (this.game?.activeLevel?.skipIntro) {
                        this.game.activeLevel.skipIntro();
                        this.log('Intro skipped!', '#00ff00');
                    } else {
                        this.log('Intro skip not available', '#ff6666');
                    }
                }
            },
            
            restrain: {
                desc: 'Put Jake in restraints on the bed',
                fn: () => {
                    if (this.game?.player) {
                        this.game.player.isRestrained = true;
                        this.game.player.controlsEnabled = false;
                        this.game.player.positionOnBed();
                        this.log('Jake is now restrained on the bed', '#00ff00');
                    }
                }
            },
            
            unrestrain: {
                desc: 'Release Jake from restraints',
                fn: () => {
                    if (this.game?.player) {
                        this.game.player.isRestrained = false;
                        this.game.player.controlsEnabled = true;
                        this.log('Jake is now free!', '#00ff00');
                    }
                }
            },
            
            resumeintro: {
                desc: 'Resume/restart the intro sequence',
                fn: () => {
                    if (this.game?.activeLevel?.startIntroSequence) {
                        this.log('Starting intro sequence...', '#00ff00');
                        this.game.activeLevel.introSkipped = false;
                        this.game.activeLevel.introStep = 0;
                        this.game.player.isRestrained = true;
                        this.game.player.controlsEnabled = false;
                        this.game.player.positionOnBed();
                        this.game.activeLevel.startIntroSequence();
                    } else {
                        this.log('Intro not available', '#ff6666');
                    }
                }
            },
            
            testbed: {
                desc: 'Position Jake on bed for rotation testing (use F9 editor)',
                fn: () => {
                    if (this.game?.player) {
                        // Position on bed but NOT restrained (allows rotation without locking)
                        this.game.player.mesh.position = new BABYLON.Vector3(-2, 0.87, -2.5);
                        this.game.player.visualMesh.position = new BABYLON.Vector3(-2, 0.87, -2.5);
                        this.game.player.controlsEnabled = false; // Disable WASD movement
                        this.log('Jake positioned on bed for testing!', '#00ff00');
                        this.log('Press F9 to open editor and rotate him', '#888888');
                        this.log('Tab to select Jake (Visual), then use arrows/+- to rotate', '#888888');
                    }
                }
            }
        };
    }
    
    getSaveSlots() {
        const slots = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('escapelab48_save_')) {
                slots.push(key.replace('escapelab48_save_', ''));
            }
        }
        return slots;
    }
    
    executeCommand(input) {
        const parts = input.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        if (this.commands[cmd]) {
            try {
                this.commands[cmd].fn(args);
            } catch (e) {
                this.log(`Error: ${e.message}`, '#ff4444');
            }
        } else {
            this.log(`Unknown command: ${cmd}`, '#ff6666');
            this.log('Type "help" for available commands', '#888888');
        }
    }
}

// Global reference
let gameConsole = null;
