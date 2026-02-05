/* ============================================================================
   ESCAPE LAB 48 - BABYLON.JS EDITION
   Input Manager - Handles keyboard, mouse, and gamepad input
   ============================================================================ */

class InputManager {
    constructor(gameEngine) {
        this.game = gameEngine;
        this.scene = gameEngine.scene;
        
        // Key states
        this.keys = {};
        this.keysJustPressed = {};
        
        // Mouse state
        this.mouse = {
            x: 0,
            y: 0,
            deltaX: 0,
            deltaY: 0,
            leftButton: false,
            rightButton: false,
            leftJustPressed: false,
            rightJustPressed: false
        };
        
        // Camera rotation - initial values match intro camera orientation
        // From back-left corner (-4.5, 2.8, -3.5) looking at (1, 1, 2)
        // yaw = atan2(5.5, 5.5) ≈ 0.785 (45°), pitch ≈ 0.22 (slight down look)
        this.yaw = 0.785;    // Horizontal rotation (looking toward front-right)
        this.pitch = 0.22;   // Slight downward tilt to see floor area
        
        // Movement vector
        this.moveDirection = new BABYLON.Vector3(0, 0, 0);
        
        // ═══════════════════════════════════════════════════════════════════
        // CAMERA MODE SYSTEM - F1 cycles through views
        // ═══════════════════════════════════════════════════════════════════
        this.cameraModes = ['third-person', 'first-person', 'bed-overview', 'security-cam-1', 'security-cam-2'];
        this.currentCameraMode = 0; // Start in third-person
    }
    
    init() {
        // Keyboard events
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // Mouse events
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mouseup', (e) => this.onMouseUp(e));
        window.addEventListener('wheel', (e) => this.onMouseWheel(e));
        
        // Pointer lock change
        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
        
        // Clear just-pressed states each frame
        this.scene.onBeforeRenderObservable.add(() => {
            this.keysJustPressed = {};
            this.mouse.leftJustPressed = false;
            this.mouse.rightJustPressed = false;
            this.mouse.deltaX = 0;
            this.mouse.deltaY = 0;
        });
    }
    
    onKeyDown(event) {
        const key = event.key.toLowerCase();
        
        // If console is open, let ALL keys through to the console input
        if (typeof gameConsole !== 'undefined' && gameConsole && gameConsole.isOpen) {
            return;
        }
        
        // If debug editor is active (F9), let editor handle WASD/arrow/+- keys
        // Only track keys that aren't editor controls
        if (this.game && this.game.debugEditorActive) {
            const editorKeys = ['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', '+', '-', '=', '_', 'tab'];
            if (editorKeys.includes(key) || editorKeys.includes(event.key.toLowerCase()) || editorKeys.includes(event.key)) {
                // Don't track these as game input - let editor handle them
                return;
            }
        }
        
        // If debug editor is active (F9), let editor handle WASD/arrow/+- keys
        // Only track keys that aren't editor controls
        if (this.game && this.game.debugEditorActive) {
            const editorKeys = ['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', '+', '-', '=', '_', 'tab'];
            if (editorKeys.includes(key) || editorKeys.includes(event.key.toLowerCase()) || editorKeys.includes(event.key)) {
                // Don't track these as game input - let editor handle them
                return;
            }
        }
        
        if (!this.keys[key]) {
            this.keysJustPressed[key] = true;
        }
        this.keys[key] = true;
        
        // Prevent default for game keys (only when console is closed)
        if (['w', 'a', 's', 'd', ' ', 'e', 'shift', 'control', 'c', '1', '2', '3', '4', '5', 'r', 'q', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
            event.preventDefault();
        }
        
        // Weapon switching with number keys
        if (key >= '1' && key <= '5' && this.game.player) {
            this.game.player.switchWeapon(parseInt(key) - 1);
        }
        
        // Q for previous weapon
        if (key === 'q' && this.game.player) {
            this.game.player.prevWeapon();
        }
        
        // R for reload
        if (key === 'r' && this.game.player) {
            this.game.player.reload();
        }
        
        // Escape to pause
        if (event.key === 'Escape') {
            if (this.game.isPaused) {
                this.game.resume();
            } else {
                this.game.pause();
            }
        }
        
        // F1 - Cycle ALL camera modes (including security cams)
        if (event.key === 'F1') {
            event.preventDefault();
            this.cycleCameraMode();
        }
        
        // F2 - Toggle between 1st and 3rd person only
        if (event.key === 'F2') {
            event.preventDefault();
            this.toggleFirstThirdPerson();
        }
        
        // F6/F7 - Voice pitch control
        if (event.key === 'F6') {
            event.preventDefault();
            this.adjustVoicePitch(-0.05);
        }
        if (event.key === 'F7') {
            event.preventDefault();
            this.adjustVoicePitch(0.05);
        }
        
        // F8 - Cycle through available voices
        if (event.key === 'F8') {
            event.preventDefault();
            this.cycleVoice();
        }
        
        // F10/F11 - Voice rate control
        if (event.key === 'F10') {
            event.preventDefault();
            this.adjustVoiceRate(-0.05);
        }
        if (event.key === 'F11') {
            event.preventDefault();
            this.adjustVoiceRate(0.05);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // F2 - Toggle between first and third person only
    // ═══════════════════════════════════════════════════════════════════════
    toggleFirstThirdPerson() {
        const player = this.game.player;
        if (!player) return;
        
        const currentMode = player.cameraMode || 'third-person';
        
        // Toggle between first and third person only
        if (currentMode === 'first-person') {
            this.applyCameraMode('third-person');
            this.showCameraModeNotification('third-person');
            // Update camera mode index
            this.currentCameraMode = 0;
        } else {
            this.applyCameraMode('first-person');
            this.showCameraModeNotification('first-person');
            this.currentCameraMode = 1;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // VOICE TUNING CONTROLS
    // ═══════════════════════════════════════════════════════════════════════
    
    adjustVoicePitch(delta) {
        const level = this.game.activeLevel;
        if (!level) return;
        
        // Initialize pitch if not set
        if (typeof level.basePitch !== 'number') level.basePitch = 0.95;
        
        level.basePitch = Math.max(0.1, Math.min(2.0, level.basePitch + delta));
        
        this.showVoiceSettings();
        this.testVoice();
    }
    
    adjustVoiceRate(delta) {
        const level = this.game.activeLevel;
        if (!level) return;
        
        // Initialize rate if not set
        if (typeof level.baseRate !== 'number') level.baseRate = 1.05;
        
        level.baseRate = Math.max(0.3, Math.min(2.0, level.baseRate + delta));
        
        this.showVoiceSettings();
        this.testVoice();
    }
    
    cycleVoice() {
        const level = this.game.activeLevel;
        if (!level || !level.synth) return;
        
        const voices = level.synth.getVoices();
        if (voices.length === 0) return;
        
        // Initialize voice index if not set
        if (typeof level.voiceIndex !== 'number') {
            level.voiceIndex = voices.indexOf(level.jakeVoice);
            if (level.voiceIndex < 0) level.voiceIndex = 0;
        }
        
        // Cycle to next voice
        level.voiceIndex = (level.voiceIndex + 1) % voices.length;
        level.jakeVoice = voices[level.voiceIndex];
        
        console.log(`Voice ${level.voiceIndex + 1}/${voices.length}: ${level.jakeVoice.name}`);
        
        this.showVoiceSettings();
        this.testVoice();
    }
    
    showVoiceSettings() {
        let display = document.getElementById('voiceSettingsDisplay');
        if (!display) {
            display = document.createElement('div');
            display.id = 'voiceSettingsDisplay';
            display.style.cssText = `
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 40, 0, 0.9);
                color: #0f0;
                padding: 12px 20px;
                font-family: monospace;
                font-size: 12px;
                border: 2px solid #0f0;
                border-radius: 8px;
                z-index: 1000;
                text-align: center;
                min-width: 300px;
            `;
            document.body.appendChild(display);
        }
        
        const level = this.game.activeLevel;
        if (!level) return;
        
        const pitch = (level.basePitch || 0.95).toFixed(2);
        const rate = (level.baseRate || 1.05).toFixed(2);
        const voiceName = level.jakeVoice?.name || 'Default';
        const voices = level.synth?.getVoices() || [];
        const voiceIdx = level.voiceIndex || 0;
        
        display.innerHTML = `
            <div style="color: #ff0; margin-bottom: 8px; font-weight: bold;">═ VOICE TUNING ═</div>
            <div style="margin-bottom: 4px;">
                <span style="color: #0ff;">F6/F7</span> Pitch: <span style="color: #ff0;">${pitch}</span>
            </div>
            <div style="margin-bottom: 4px;">
                <span style="color: #0ff;">F10/F11</span> Rate: <span style="color: #ff0;">${rate}</span>
            </div>
            <div style="margin-bottom: 4px;">
                <span style="color: #0ff;">F8</span> Voice ${voiceIdx + 1}/${voices.length}:
            </div>
            <div style="color: #f80; font-size: 10px; max-width: 280px; word-wrap: break-word;">
                ${voiceName}
            </div>
        `;
        
        display.style.display = 'block';
        
        // Hide after 4 seconds
        clearTimeout(this.voiceDisplayTimeout);
        this.voiceDisplayTimeout = setTimeout(() => {
            display.style.display = 'none';
        }, 4000);
    }
    
    testVoice() {
        const level = this.game.activeLevel;
        if (!level || !level.speak) return;
        
        // Short test phrase
        level.speak("Testing voice.");
    }
    
    cycleCameraMode() {
        this.currentCameraMode = (this.currentCameraMode + 1) % this.cameraModes.length;
        const mode = this.cameraModes[this.currentCameraMode];
        
        console.log('Camera mode:', mode);
        
        // Show camera mode notification
        this.showCameraModeNotification(mode);
        
        // Apply camera mode
        this.applyCameraMode(mode);
    }
    
    showCameraModeNotification(mode) {
        let notification = document.getElementById('cameraModeNotification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'cameraModeNotification';
            notification.style.cssText = `
                position: fixed;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                color: #0ff;
                padding: 10px 25px;
                font-family: monospace;
                font-size: 16px;
                border: 2px solid #0ff;
                border-radius: 5px;
                z-index: 1000;
                transition: opacity 0.3s;
            `;
            document.body.appendChild(notification);
        }
        
        const modeNames = {
            'third-person': '📷 THIRD PERSON',
            'first-person': '👁️ FIRST PERSON (Jake\'s Eyes)',
            'bed-overview': '🛏️ BED OVERVIEW (Middle View)',
            'security-cam-1': '🎥 SECURITY CAM 1 (Cell Corner)',
            'security-cam-2': '🎥 SECURITY CAM 2 (Door View)'
        };
        
        notification.textContent = modeNames[mode] || mode;
        notification.style.opacity = '1';
        
        // Fade out after 2 seconds
        clearTimeout(this.cameraNotificationTimeout);
        this.cameraNotificationTimeout = setTimeout(() => {
            notification.style.opacity = '0';
        }, 2000);
    }
    
    applyCameraMode(mode) {
        const camera = this.game.camera;
        const player = this.game.player;
        
        if (!camera || !player) return;
        
        // Store the mode for updateCamera to use
        player.cameraMode = mode;
        
        switch (mode) {
            case 'first-person':
                // Hide Jake's body in first person
                if (player.visualMesh) {
                    player.visualMesh.setEnabled(false);
                }
                break;
                
            case 'third-person':
                // Show Jake's body in third person
                if (player.visualMesh) {
                    player.visualMesh.setEnabled(true);
                }
                break;
                
            case 'bed-overview':
                // Middle view - closer to bed, overhead angle
                if (player.visualMesh) {
                    player.visualMesh.setEnabled(true);
                }
                camera.position = new BABYLON.Vector3(1.0, 2.8, -0.5);
                camera.setTarget(new BABYLON.Vector3(-2, 0.85, -2.5)); // Look at Jake on bed
                break;
                
            case 'security-cam-1':
                // Cell corner camera (front-right, looking at bed)
                if (player.visualMesh) {
                    player.visualMesh.setEnabled(true);
                }
                camera.position = new BABYLON.Vector3(3.3, 3.4, 2.0);
                camera.setTarget(new BABYLON.Vector3(-2, 1, -2.5)); // Look at bed area
                break;
                
            case 'security-cam-2':
                // Door area camera (back corner, looking at bars/door)
                if (player.visualMesh) {
                    player.visualMesh.setEnabled(true);
                }
                camera.position = new BABYLON.Vector3(-3.3, 3.4, -3.0);
                camera.setTarget(new BABYLON.Vector3(0, 1.5, 2.5)); // Look at bars/door
                break;
        }
    }
    
    getCameraMode() {
        return this.cameraModes[this.currentCameraMode];
    }
    
    onKeyUp(event) {
        // If console is open, don't track key states
        if (typeof gameConsole !== 'undefined' && gameConsole && gameConsole.isOpen) {
            return;
        }
        
        const key = event.key.toLowerCase();
        this.keys[key] = false;
    }
    
    onMouseMove(event) {
        // Don't process mouse look when console is open
        if (typeof gameConsole !== 'undefined' && gameConsole && gameConsole.isOpen) {
            return;
        }
        
        // F9 Editor mode - allow mouse look when camera is selected
        if (this.game?.debugEditorActive && this.game?.debugTargets?.[this.game.debugTargetIndex]?.isCamera) {
            if (document.pointerLockElement === this.game.canvas) {
                this.mouse.deltaX = event.movementX;
                this.mouse.deltaY = event.movementY;
                
                this.yaw += event.movementX * GAME.CAMERA.SENSITIVITY;
                this.pitch -= event.movementY * GAME.CAMERA.SENSITIVITY;
                this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
                
                // Update camera rotation
                const camera = this.game.camera;
                const lookDistance = 5;
                const lookTarget = new BABYLON.Vector3(
                    camera.position.x + Math.sin(this.yaw) * lookDistance,
                    camera.position.y + Math.sin(this.pitch) * lookDistance,
                    camera.position.z + Math.cos(this.yaw) * lookDistance
                );
                camera.setTarget(lookTarget);
            }
            return;
        }
        
        // During intro cutscene - LIMITED head movement only (Jake is restrained!)
        if (this.game?.activeLevel?.introCameraMode === 'ceiling') {
            if (document.pointerLockElement === this.game.canvas) {
                // Track head rotation with limits (can only turn head so far while restrained)
                const headSensitivity = GAME.CAMERA.SENSITIVITY * 0.5; // Slower, more deliberate
                
                this.headYaw = (this.headYaw || 0) + event.movementX * headSensitivity;
                this.headPitch = (this.headPitch || 0) - event.movementY * headSensitivity;
                
                // Clamp head movement - can only turn head ~45 degrees each way while on back
                this.headYaw = Math.max(-0.6, Math.min(0.6, this.headYaw));
                this.headPitch = Math.max(-0.3, Math.min(0.4, this.headPitch)); // Can look down at body more than up
                
                // Apply head rotation to Jake's visual mesh
                if (this.game.player?.visualMesh) {
                    // Jake is lying on his back, so Y rotation turns head left/right
                    // We'll rotate around Z (since he's rotated -90 on X to lay down)
                    this.game.player.visualMesh.rotation.z = this.headYaw;
                    // Slight Y rotation for looking up/down the body
                    this.game.player.visualMesh.rotation.y = this.headPitch * 0.5;
                }
            }
            return;
        }
        
        // Don't process full camera control if player controls are disabled (but head movement above is ok)
        if (this.game?.player && !this.game.player.controlsEnabled) {
            return;
        }
        
        if (document.pointerLockElement === this.game.canvas) {
            this.mouse.deltaX = event.movementX;
            this.mouse.deltaY = event.movementY;
            
            // Update camera rotation - standard third-person controls
            this.yaw += event.movementX * GAME.CAMERA.SENSITIVITY;
            this.pitch -= event.movementY * GAME.CAMERA.SENSITIVITY;  // Inverted for natural feel
            
            // Clamp pitch
            this.pitch = Math.max(GAME.CAMERA.MIN_PITCH, Math.min(GAME.CAMERA.MAX_PITCH, this.pitch));
        }
    }
    
    onMouseDown(event) {
        if (event.button === 0) {
            this.mouse.leftButton = true;
            this.mouse.leftJustPressed = true;
        } else if (event.button === 2) {
            this.mouse.rightButton = true;
            this.mouse.rightJustPressed = true;
        }
    }
    
    onMouseUp(event) {
        if (event.button === 0) {
            this.mouse.leftButton = false;
        } else if (event.button === 2) {
            this.mouse.rightButton = false;
        }
    }
    
    onMouseWheel(event) {
        // Don't process when console is open
        if (typeof gameConsole !== 'undefined' && gameConsole && gameConsole.isOpen) {
            return;
        }
        
        // Scroll wheel cycles weapons
        if (this.game.player) {
            if (event.deltaY > 0) {
                this.game.player.nextWeapon();
            } else if (event.deltaY < 0) {
                this.game.player.prevWeapon();
            }
        }
        
        event.preventDefault();
    }
    
    onPointerLockChange() {
        if (document.pointerLockElement !== this.game.canvas) {
            // Pointer unlocked - might want to pause
        }
    }
    
    // Helper methods
    isKeyDown(key) {
        // Don't process game input when console is open
        if (typeof gameConsole !== 'undefined' && gameConsole && gameConsole.isOpen) {
            return false;
        }
        return this.keys[key.toLowerCase()] === true;
    }
    
    isKeyJustPressed(key) {
        // Don't process game input when console is open
        if (typeof gameConsole !== 'undefined' && gameConsole && gameConsole.isOpen) {
            return false;
        }
        return this.keysJustPressed[key.toLowerCase()] === true;
    }
    
    isMovingForward() {
        return this.isKeyDown('w') || this.isKeyDown('arrowup');
    }
    
    isMovingBackward() {
        return this.isKeyDown('s') || this.isKeyDown('arrowdown');
    }
    
    isMovingLeft() {
        return this.isKeyDown('a');
    }
    
    isMovingRight() {
        return this.isKeyDown('d');
    }
    
    // Arrow-left/right should turn the camera, not strafe
    getTurnInput() {
        let yawDelta = 0;
        if (this.isKeyDown('arrowleft')) yawDelta -= GAME.CAMERA.KEY_TURN_SPEED || 0.025;
        if (this.isKeyDown('arrowright')) yawDelta += GAME.CAMERA.KEY_TURN_SPEED || 0.025;
        return yawDelta;
    }
    
    isSprinting() {
        return this.isKeyDown('shift');
    }
    
    isJumping() {
        return this.isKeyJustPressed(' ');
    }
    
    isCrouching() {
        return this.isKeyDown('c') || this.isKeyDown('control');
    }
    
    isInteracting() {
        return this.isKeyDown('e');
    }
    
    isInteractJustPressed() {
        return this.isKeyJustPressed('e');
    }
    
    isAttacking() {
        // Don't process game input when console is open
        if (typeof gameConsole !== 'undefined' && gameConsole && gameConsole.isOpen) {
            return false;
        }
        return this.mouse.leftJustPressed;
    }
    
    // Get movement vector relative to camera direction (camera-facing for WASD)
    getMovementVector() {
        let forward = 0;
        let right = 0;
        
        if (this.isMovingForward()) forward += 1;
        if (this.isMovingBackward()) forward -= 1;
        if (this.isMovingRight()) right += 1;
        if (this.isMovingLeft()) right -= 1;
        
        // Normalize diagonal movement
        if (forward !== 0 && right !== 0) {
            const len = Math.sqrt(forward * forward + right * right);
            forward /= len;
            right /= len;
        }
        
        // Camera-relative movement so W = forward, S = back, A/D = strafe relative to where you look
        // Adjust yaw by -90° to align with model's corrective rotation (-Math.PI/2)
        const adjustedYaw = this.yaw - Math.PI / 2;
        const forwardDir = new BABYLON.Vector3(Math.sin(adjustedYaw), 0, Math.cos(adjustedYaw));
        const rightDir = new BABYLON.Vector3(Math.cos(adjustedYaw), 0, -Math.sin(adjustedYaw));
        
        const moveVec = forwardDir.scale(forward).add(rightDir.scale(right));
        this.moveDirection.x = moveVec.x;
        this.moveDirection.z = moveVec.z;
        this.moveDirection.y = 0;
        
        return this.moveDirection;
    }
}
