/* ============================================================================
   ESCAPE LAB 48 - BABYLON.JS EDITION
   Main Game Engine
   ============================================================================ */

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('renderCanvas');
        this.engine = null;
        this.scene = null;
        this.camera = null;
        this.player = null;
        this.currentLevel = 1;
        this.isRunning = false;
        this.isPaused = false;
        this.havokPlugin = null;
        this.modelLoader = null;
        
        // Level instances
        this.levels = {};
        this.activeLevel = null;
    }
    
    async init() {
        this.updateLoadingBar(10, "Creating engine...");
        
        // Create Babylon engine
        this.engine = new BABYLON.Engine(this.canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            antialias: true
        });
        
        this.updateLoadingBar(20, "Initializing physics...");
        
        // Initialize Havok physics
        await this.initPhysics();
        
        this.updateLoadingBar(40, "Creating scene...");
        
        // Create scene
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.1, 1);
        this.scene.collisionsEnabled = true;
        
        // Enable physics on scene
        this.scene.enablePhysics(
            new BABYLON.Vector3(0, GAME.PHYSICS.GRAVITY, 0),
            this.havokPlugin
        );
        
        this.updateLoadingBar(50, "Setting up camera...");
        
        // Create camera (will be attached to player)
        this.setupCamera();
        
        this.updateLoadingBar(55, "Initializing model loader...");
        
        // Initialize model loader
        this.modelLoader = new ModelLoader(this.scene);
        
        // Initialize world items helper for modular placement
        this.worldItems = new WorldItems(this.scene);
        
        this.updateLoadingBar(60, "Creating lighting...");
        
        // Basic lighting
        this.setupLighting();
        
        this.updateLoadingBar(70, "Loading Level 1...");
        
        // Create Level 1
        this.levels[1] = new Level1_Cell(this);
        await this.levels[1].build();
        this.activeLevel = this.levels[1];
        
        this.updateLoadingBar(85, "Creating player...");
        
        // Create player
        this.player = new Player(this);
        await this.player.init();
        
        // Try to load Jake's 3D model
        // IMPORTANT: Set isRestrained BEFORE loading model so positionOnBed() is called after load
        this.player.isRestrained = true;  // Jake starts restrained on bed in intro sequence
        await this.player.loadModel(this.modelLoader);
        
        this.updateLoadingBar(95, "Finalizing...");
        
        // Setup input
        this.inputManager = new InputManager(this);
        this.inputManager.init();
        
        // Setup sound system
        this.soundSystem = new SoundSystem(this.scene);
        await this.soundSystem.init();
        
        // Setup HUD
        this.hud = new HUD(this);
        
        // Setup dialogue system
        this.dialogue = new DialogueSystem(this);
        
        // Setup level editor / debug tool (F9 to toggle)
        this.setupDebugRotationControls();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.engine.resize();
        });
        
        this.updateLoadingBar(100, "Ready!");
        
        // Hide loading screen after brief delay
        setTimeout(() => {
            document.getElementById('loadingScreen').classList.add('hidden');
            
            // Position Jake on the bed BEFORE the game starts
            this.setupInitialIntroPosition();
            
            this.start();
        }, 500);
    }
    
    setupInitialIntroPosition() {
        // ═══════════════════════════════════════════════════════════════════════
        // SECURITY CAMERA VIEW - Looking down at Jake on bed
        // ═══════════════════════════════════════════════════════════════════════
        // NOTE: Jake was already positioned on bed during model load (see Player.loadModel)
        // since isRestrained was set to true before loading the GLB
        
        // Camera position: corner view looking at bed
        this.camera.position = new BABYLON.Vector3(3.5, 3.5, 2.0);
        
        // Look toward Jake on the bed (back-left of cell)
        const targetPoint = new BABYLON.Vector3(-2, 0.8, -2.5);
        const direction = targetPoint.subtract(this.camera.position).normalize();
        const yaw = Math.atan2(direction.x, direction.z);
        const pitch = Math.asin(-direction.y);
        this.camera.rotation.x = pitch;
        this.camera.rotation.y = yaw;
        
        // Set introCameraMode so InputManager knows we're in intro
        if (this.activeLevel) {
            this.activeLevel.introCameraMode = 'ceiling';
        }
        
        // Sync InputManager yaw/pitch with camera rotation
        if (this.inputManager) {
            this.inputManager.yaw = this.camera.rotation.y;
            this.inputManager.pitch = this.camera.rotation.x;
        }
        
        // Note: startIntroSequence() will be called by start() when user clicks to begin
        
        console.log('Initial intro position set - Security camera view, Jake positioned on bed via model load');
    }
    
    async initPhysics() {
        // Initialize Havok physics engine
        const havokInstance = await HavokPhysics();
        this.havokPlugin = new BABYLON.HavokPlugin(true, havokInstance);
    }
    
    setupCamera() {
        // Create a universal camera for first/third person
        this.camera = new BABYLON.UniversalCamera(
            "playerCamera",
            new BABYLON.Vector3(0, 2, -5),
            this.scene
        );
        
        this.camera.fov = GAME.CAMERA.FOV * Math.PI / 180;
        this.camera.minZ = 0.1;  // Close near plane for better precision
        this.camera.maxZ = GAME.CAMERA.FAR;
        
        // Don't attach default controls - we'll handle input manually
        this.camera.inputs.clear();
        
        // Camera collision settings (prevents clipping through walls)
        this.camera.checkCollisions = true;
        this.camera.ellipsoid = new BABYLON.Vector3(0.5, 1, 0.5);
        this.camera.ellipsoidOffset = new BABYLON.Vector3(0, 1, 0);
    }
    
    setupLighting() {
        // Ambient light for base visibility
        const ambient = new BABYLON.HemisphericLight(
            "ambient",
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );
        ambient.intensity = 0.3;
        ambient.diffuse = new BABYLON.Color3(0.6, 0.6, 0.8);
        ambient.groundColor = new BABYLON.Color3(0.2, 0.2, 0.3);
        
        // Main directional light
        const sun = new BABYLON.DirectionalLight(
            "sun",
            new BABYLON.Vector3(-1, -2, 1),
            this.scene
        );
        sun.intensity = 0.7;
        
        // Enable shadows
        this.shadowGenerator = new BABYLON.ShadowGenerator(2048, sun);
        this.shadowGenerator.useBlurExponentialShadowMap = true;
        this.shadowGenerator.blurKernel = 32;
    }
    
    updateLoadingBar(percent, text) {
        document.getElementById('loadingBar').style.width = percent + '%';
        document.getElementById('loadingText').textContent = text;
    }
    
    start() {
        this.isRunning = true;
        this.introStarted = false;
        this.userClickedOnce = false;  // Safety flag to ensure intro only starts on user input
        
        // Show click prompt (on black screen)
        const clickPrompt = document.getElementById('clickPrompt');
        const fadeOverlay = document.getElementById('fadeOverlay');
        
        if (clickPrompt) {
            clickPrompt.style.display = 'block';
        }
        
        // Lock pointer for FPS controls - also triggers voice intro
        // MUST ONLY TRIGGER ON FIRST REAL USER CLICK
        this.canvas.addEventListener('click', () => {
            if (!this.isPaused && !this.userClickedOnce) {
                this.userClickedOnce = true;  // Lock to first click only
                
                this.canvas.requestPointerLock();
                
                // Start voice intro on first click (required for speech synthesis)
                if (!this.introStarted && this.activeLevel && this.activeLevel.startIntroSequence) {
                    this.introStarted = true;
                    
                    // Hide click prompt
                    if (clickPrompt) {
                        clickPrompt.style.display = 'none';
                    }
                    
                    // Start fade-in from black
                    if (fadeOverlay) {
                        fadeOverlay.classList.add('fading');
                        
                        // Remove overlay completely after fade completes
                        setTimeout(() => {
                            fadeOverlay.classList.add('hidden');
                        }, 2000);
                    }
                    
                    // Wait for fade to partially complete before starting intro
                    setTimeout(() => {
                        this.activeLevel.startIntroSequence();
                    }, 800); // Start intro partway through fade
                }
            }
        });
        
        // Main game loop
        this.engine.runRenderLoop(() => {
            if (!this.isPaused && this.isRunning) {
                this.update();
            }
            this.scene.render();
        });
    }
    
    update() {
        const deltaTime = this.engine.getDeltaTime() / 1000;
        
        // Update player
        if (this.player) {
            this.player.update(deltaTime);
        }
        
        // Update active level
        if (this.activeLevel) {
            this.activeLevel.update(deltaTime);
        }
        
        // Update HUD
        if (this.hud) {
            this.hud.update();
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // LEVEL EDITOR / DEBUG TOOL - Press F9 to toggle
    // Tab = cycle targets, WS=X, AD=Z, QE/Arrows=Y, Left/Right=rotate
    // ═══════════════════════════════════════════════════════════════════════════
    
    setupDebugRotationControls() {
        // Initialize but don't show - F9 toggles
        this.debugEditorActive = false;
        this.debugTargets = [];
        this.debugTargetIndex = 0;
        this.debugPosition = { x: 0, y: 0, z: 0 };
        this.debugRotation = { x: 0, y: 0, z: 0 };
        
        // Build target list
        this.rebuildDebugTargets = () => {
            this.debugTargets = [];
            
            // Add player
            if (this.player && this.player.visualMesh) {
                this.debugTargets.push({ name: 'Jake (Visual)', mesh: this.player.visualMesh });
            }
            if (this.player && this.player.mesh) {
                this.debugTargets.push({ name: 'Jake (Collider)', mesh: this.player.mesh });
            }
            
            // Add camera
            this.debugTargets.push({ name: 'Camera', mesh: this.camera, isCamera: true });
            
            // Add level objects
            if (this.activeLevel) {
                // Security camera
                if (this.activeLevel.securityCam) {
                    this.debugTargets.push({ name: 'Security Camera', mesh: this.activeLevel.securityCam });
                }
                // Bed
                if (this.activeLevel.bed) {
                    this.debugTargets.push({ name: 'Bed', mesh: this.activeLevel.bed });
                }
                // Door
                if (this.activeLevel.doorGroup) {
                    this.debugTargets.push({ name: 'Door', mesh: this.activeLevel.doorGroup });
                }
                // Computer
                if (this.activeLevel.computerScreen) {
                    this.debugTargets.push({ name: 'Computer', mesh: this.activeLevel.computerScreen });
                }
                // Find named meshes in scene
                this.scene.meshes.forEach(m => {
                    if (m.name && (m.name.includes('toilet') || m.name.includes('sink') || m.name.includes('restraint'))) {
                        this.debugTargets.push({ name: m.name, mesh: m });
                    }
                });
            }
        };
        
        // Create position display in bottom-right corner
        this.updateEditorPositionDisplay = (name, position, rotation) => {
            let posDisplay = document.getElementById('editorPositionDisplay');
            if (!posDisplay) {
                posDisplay = document.createElement('div');
                posDisplay.id = 'editorPositionDisplay';
                posDisplay.style.cssText = `
                    position: fixed;
                    bottom: 90px;
                    right: 10px;
                    background: rgba(0, 0, 0, 0.7);
                    color: #0ff;
                    padding: 6px 10px;
                    font-family: monospace;
                    font-size: 10px;
                    border: 1px solid #0ff;
                    border-radius: 3px;
                    z-index: 900;
                    display: none;
                `;
                document.body.appendChild(posDisplay);
            }
            
            if (this.debugEditorActive) {
                posDisplay.style.display = 'block';
                posDisplay.innerHTML = `
                    <b style="color: #ff0;">${name}</b><br>
                    Pos: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})<br>
                    Rot: (${rotation.x}°, ${rotation.y}°, ${rotation.z}°)
                `;
            } else {
                posDisplay.style.display = 'none';
            }
        };
        
        
        // Create UI
        let debugDiv = document.getElementById('debugEditor');
        if (!debugDiv) {
            debugDiv = document.createElement('div');
            debugDiv.id = 'debugEditor';
            debugDiv.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.85);
                color: #0f0;
                padding: 8px 12px;
                font-family: monospace;
                font-size: 11px;
                border: 1px solid #0f0;
                border-radius: 4px;
                z-index: 1000;
                display: none;
                line-height: 1.4;
            `;
            document.body.appendChild(debugDiv);
        }
        
        const updateDisplay = () => {
            if (!this.debugEditorActive) {
                debugDiv.style.display = 'none';
                return;
            }
            debugDiv.style.display = 'block';
            
            const target = this.debugTargets[this.debugTargetIndex];
            if (!target) return;
            
            const mesh = target.mesh;
            const pos = mesh.position;
            
            // Get rotation - check for quaternion first (used by WORLD space rotations)
            let rot;
            if (mesh.rotationQuaternion) {
                rot = mesh.rotationQuaternion.toEulerAngles();
            } else {
                rot = mesh.rotation || { x: 0, y: 0, z: 0 };
            }
            
            const toDeg = (rad) => {
                let deg = (rad * 180 / Math.PI) % 360;
                if (deg < 0) deg += 360;
                return deg.toFixed(1);
            };
            const toFixed = (n) => n.toFixed(2);
            
            // Check if Jake is locked on bed
            let bedLockStatus = '';
            if (this.activeLevel && this.activeLevel.player && this.activeLevel.player.bedLocked) {
                bedLockStatus = `<div style="color: #f80; margin-top: 6px; padding-top: 4px; border-top: 1px solid #333;">🛏️ LOCKED on bed</div>`;
            }
            
            debugDiv.innerHTML = `
                <div style="color: #ff0; border-bottom: 1px solid #444; padding-bottom: 4px; margin-bottom: 4px;">
                    ▶ EDITOR <span style="color: #888;">[F9 close]</span>
                </div>
                <div style="color: #0ff; margin-bottom: 4px;">
                    <b>${target.name}</b> <span style="color: #666;">[Tab]</span>
                </div>
                <div style="color: #888; margin-bottom: 2px;">─ Position (WASD/QE) ─</div>
                <div>X: <span style="color: #f66;">${toFixed(pos.x)}</span></div>
                <div>Y: <span style="color: #6f6;">${toFixed(pos.y)}</span></div>
                <div>Z: <span style="color: #66f;">${toFixed(pos.z)}</span></div>
                <div style="color: #888; margin: 2px 0;">─ Rotation (↑↓←→ +−) ─</div>
                <div>X: <span style="color: #f66;">${toDeg(rot.x)}°</span></div>
                <div>Y: <span style="color: #6f6;">${toDeg(rot.y)}°</span></div>
                <div>Z: <span style="color: #66f;">${toDeg(rot.z)}°</span></div>
                <div style="color: #555; margin-top: 4px; font-size: 9px;">
                    Shift=fast │ Ctrl=slow
                </div>
                ${bedLockStatus}
            `;
        };
        
        // F9 toggle handler
        window.addEventListener('keydown', (e) => {
            // If console is open, don't intercept any keys (let user type)
            if (typeof gameConsole !== 'undefined' && gameConsole && gameConsole.isOpen) {
                return;
            }
            
            // ESCAPE = Skip intro sequence
            if (e.key === 'Escape' && this.activeLevel && this.activeLevel.skipIntro && !this.activeLevel.introSkipped) {
                this.activeLevel.skipIntro();
                e.preventDefault();
                return;
            }
            
            if (e.key === 'F9') {
                this.debugEditorActive = !this.debugEditorActive;
                if (this.debugEditorActive) {
                    this.rebuildDebugTargets();
                    // Sync current values
                    const target = this.debugTargets[this.debugTargetIndex];
                    if (target && target.mesh) {
                        const m = target.mesh;
                        this.debugPosition = { x: m.position.x, y: m.position.y, z: m.position.z };
                        this.debugRotation = { x: m.rotation?.x || 0, y: m.rotation?.y || 0, z: m.rotation?.z || 0 };
                    }
                    console.log('🛠️ Level Editor ENABLED - Tab cycle, WS=X, AD=Z, QE/↑↓=Y, ←→=rotate');
                } else {
                    console.log('🛠️ Level Editor DISABLED');
                }
                updateDisplay();
                e.preventDefault();
                return;
            }
            
            if (!this.debugEditorActive) return;
            
            const target = this.debugTargets[this.debugTargetIndex];
            if (!target || !target.mesh) return;
            
            const mesh = target.mesh;
            
            // Speed modifiers
            let moveStep = 0.1;
            let rotStep = Math.PI / 36; // 5 degrees
            if (e.shiftKey) { moveStep = 0.5; rotStep = Math.PI / 12; } // Fast
            if (e.ctrlKey) { moveStep = 0.02; rotStep = Math.PI / 180; } // Slow (1 degree)
            
            let changed = false;
            
            // Tab = cycle targets forward, Shift+Tab = cycle backwards
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    // Backwards
                    this.debugTargetIndex = (this.debugTargetIndex - 1 + this.debugTargets.length) % this.debugTargets.length;
                } else {
                    // Forwards
                    this.debugTargetIndex = (this.debugTargetIndex + 1) % this.debugTargets.length;
                }
                const newTarget = this.debugTargets[this.debugTargetIndex];
                if (newTarget && newTarget.mesh) {
                    const m = newTarget.mesh;
                    this.debugPosition = { x: m.position.x, y: m.position.y, z: m.position.z };
                    this.debugRotation = { x: m.rotation?.x || 0, y: m.rotation?.y || 0, z: m.rotation?.z || 0 };
                }
                // Enable mouselook if camera is selected
                if (newTarget && newTarget.isCamera) {
                    this.canvas.requestPointerLock();
                }
                changed = true;
                e.preventDefault();
            }
            
            // WASD + QE = position (standard FPS controls)
            // W/S = forward/back (Z axis), A/D = left/right (X axis), Q/E = down/up (Y axis)
            if (e.key.toLowerCase() === 'w') { mesh.position.z += moveStep; changed = true; }  // Forward
            if (e.key.toLowerCase() === 's') { mesh.position.z -= moveStep; changed = true; }  // Backward
            if (e.key.toLowerCase() === 'a') { mesh.position.x -= moveStep; changed = true; }  // Left
            if (e.key.toLowerCase() === 'd') { mesh.position.x += moveStep; changed = true; }  // Right
            if (e.key.toLowerCase() === 'q') { mesh.position.y -= moveStep; changed = true; }  // Down
            if (e.key.toLowerCase() === 'e') { mesh.position.y += moveStep; changed = true; }  // Up
            
            // Arrow keys = ROTATION using WORLD SPACE axes (not local)
            if (e.key === 'ArrowUp') { 
                mesh.rotate(BABYLON.Axis.X, -rotStep, BABYLON.Space.WORLD);
                changed = true; e.preventDefault(); 
            }
            if (e.key === 'ArrowDown') { 
                mesh.rotate(BABYLON.Axis.X, rotStep, BABYLON.Space.WORLD);
                changed = true; e.preventDefault(); 
            }
            if (e.key === 'ArrowLeft') { 
                mesh.rotate(BABYLON.Axis.Y, -rotStep, BABYLON.Space.WORLD);
                changed = true; e.preventDefault(); 
            }
            if (e.key === 'ArrowRight') { 
                mesh.rotate(BABYLON.Axis.Y, rotStep, BABYLON.Space.WORLD);
                changed = true; e.preventDefault(); 
            }
            
            // +/- = Z rotation (roll) using WORLD SPACE
            if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') { 
                mesh.rotate(BABYLON.Axis.Z, rotStep, BABYLON.Space.WORLD);
                changed = true; e.preventDefault();
            }
            if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') { 
                mesh.rotate(BABYLON.Axis.Z, -rotStep, BABYLON.Space.WORLD);
                changed = true; e.preventDefault();
            }
            
            if (changed) {
                updateDisplay();
                e.preventDefault();
                
                // Get rotation - might be quaternion now
                let rotDeg;
                if (mesh.rotationQuaternion) {
                    const euler = mesh.rotationQuaternion.toEulerAngles();
                    rotDeg = {
                        x: (euler.x * 180/Math.PI).toFixed(1),
                        y: (euler.y * 180/Math.PI).toFixed(1),
                        z: (euler.z * 180/Math.PI).toFixed(1)
                    };
                } else {
                    rotDeg = {
                        x: (mesh.rotation.x * 180/Math.PI).toFixed(1),
                        y: (mesh.rotation.y * 180/Math.PI).toFixed(1),
                        z: (mesh.rotation.z * 180/Math.PI).toFixed(1)
                    };
                }
                
                // Update bottom-right display instead of console spam
                this.updateEditorPositionDisplay(target.name, mesh.position, rotDeg);
                
                // Also check if Jake visual mesh - show child transforms for debugging
                if (target.name === 'Jake (Visual)' && mesh.getChildren && mesh.getChildren().length > 0) {
                    const child = mesh.getChildren()[0];
                    const childRotDeg = {
                        x: (child.rotation?.x * 180/Math.PI).toFixed(1) || 0,
                        y: (child.rotation?.y * 180/Math.PI).toFixed(1) || 0,
                        z: (child.rotation?.z * 180/Math.PI).toFixed(1) || 0
                    };
                    console.log(`  └─ Child transforms: rot(${childRotDeg.x}°, ${childRotDeg.y}°, ${childRotDeg.z}°), quat: ${child.rotationQuaternion ? 'active' : 'null'}`);
                }
            }
        });
        
        // Initial build
        this.rebuildDebugTargets();
    }
    
    loadLevel(levelNumber) {
        console.log(`Loading Level ${levelNumber}...`);
        
        // Clean up current level
        if (this.activeLevel) {
            this.activeLevel.dispose();
        }
        
        this.currentLevel = levelNumber;
        
        // Create new level if not cached
        if (!this.levels[levelNumber]) {
            if (levelNumber === 2) {
                this.levels[2] = new Level2_Rescue(this);
            }
        }
        
        // Build and activate level
        this.levels[levelNumber].build().then(() => {
            this.activeLevel = this.levels[levelNumber];
            
            // Reset player position
            this.player.setPosition(this.activeLevel.playerSpawn);
            
            // Update HUD
            this.hud.setLevel(levelNumber);
        });
    }
    
    pause() {
        this.isPaused = true;
        document.exitPointerLock();
    }
    
    resume() {
        this.isPaused = false;
    }
}

// Global game instance
let game = null;
