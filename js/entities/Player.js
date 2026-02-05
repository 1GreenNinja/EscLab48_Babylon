/* ============================================================================
   ESCAPE LAB 48 - BABYLON.JS EDITION
   Player - Jake with 400% enhanced strength
   ============================================================================ */

// PERSISTENT INVENTORY - survives level transitions
const PersistentInventory = {
    weapons: [],
    currentWeapon: null,
    ammo: {
        pistol: 0,
        rifle: 0,
        shotgun: 0
    },
    health: 100,
    maxHealth: 100,
    armor: 0,
    items: [],  // Key cards, special items, etc.
    
    addWeapon(weaponType) {
        if (!this.weapons.includes(weaponType)) {
            this.weapons.push(weaponType);
            if (!this.currentWeapon) {
                this.currentWeapon = weaponType;
            }
        }
        // Give starting ammo for the weapon
        this.addAmmo(weaponType, 30);
    },
    
    hasWeapon(weaponType) {
        return this.weapons.includes(weaponType);
    },
    
    addAmmo(weaponType, amount) {
        if (this.ammo[weaponType] !== undefined) {
            this.ammo[weaponType] = Math.min(this.ammo[weaponType] + amount, 200);
        }
    },
    
    getAmmo(weaponType) {
        return this.ammo[weaponType] || 0;
    },
    
    useAmmo(weaponType, amount = 1) {
        if (this.ammo[weaponType] >= amount) {
            this.ammo[weaponType] -= amount;
            return true;
        }
        return false;
    },
    
    addHealth(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    },
    
    addArmor(amount) {
        this.armor = Math.min(100, this.armor + amount);
    },
    
    addItem(itemName) {
        if (!this.items.includes(itemName)) {
            this.items.push(itemName);
        }
    },
    
    hasItem(itemName) {
        return this.items.includes(itemName);
    },
    
    reset() {
        this.weapons = [];
        this.currentWeapon = null;
        this.ammo = { pistol: 0, rifle: 0, shotgun: 0 };
        this.health = 100;
        this.maxHealth = 100;
        this.armor = 0;
        this.items = [];
    }
};

class Player {
    constructor(gameEngine) {
        this.game = gameEngine;
        this.scene = gameEngine.scene;
        
        // Link to persistent inventory
        this.inventory = PersistentInventory;
        
        // Stats - sync from persistent inventory
        this.health = this.inventory.health;
        this.maxHealth = this.inventory.maxHealth;
        this.strength = GAME.PLAYER.STRENGTH;
        this.maxStrength = GAME.PLAYER.STRENGTH_MAX;
        this.armor = this.inventory.armor;
        
        // Weapons from inventory
        this.weapons = this.inventory.weapons;
        this.currentWeapon = this.inventory.currentWeapon;
        
        // State
        this.isGrounded = false;
        this.isCrouching = false;
        this.isSprinting = false;
        this.isInteracting = false;
        this.interactTarget = null;
        this.interactProgress = 0;
        this.controlsEnabled = true; // Can be disabled during cutscenes
        this.firstPersonMode = false; // Switches to first person near computer
        this.nearComputer = false;
        
        // Physics body
        this.mesh = null;
        this.physicsBody = null;
        this.velocity = new BABYLON.Vector3(0, 0, 0);
        
        // Visual mesh (separate from collider)
        this.visualMesh = null;
        this.modelLoaded = false;
        this.animController = null;
        this.isMoving = false;
        this.lastMoveSpeed = 0;
        this.isRestrained = false;  // Will be set to true before model loads for intro sequence
    }
    
    async init() {
        // Create invisible physics collider (capsule)
        this.mesh = BABYLON.MeshBuilder.CreateCapsule("playerCollider", {
            height: GAME.PLAYER.HEIGHT,
            radius: GAME.PLAYER.RADIUS
        }, this.scene);
        
        this.mesh.position = new BABYLON.Vector3(0, GAME.PLAYER.HEIGHT / 2 + 0.5, 0);
        this.mesh.isVisible = false; // Invisible collider
        
        // Physics aggregate
        this.physicsAggregate = new BABYLON.PhysicsAggregate(
            this.mesh,
            BABYLON.PhysicsShapeType.CAPSULE,
            {
                mass: 80,
                friction: 0.5,
                restitution: 0
            },
            this.scene
        );
        
        // Lock rotation so player doesn't tip over
        this.physicsAggregate.body.setMassProperties({
            inertia: new BABYLON.Vector3(0, 0, 0)
        });
        
        // Create visual representation (temporary until we load model)
        this.createVisualMesh();
        
        // Add to shadow caster
        if (this.game.shadowGenerator) {
            this.game.shadowGenerator.addShadowCaster(this.visualMesh);
        }
    }
    
    async loadModel(modelLoader) {
        // Load Jake's GLB model with 22 Mixamo animations embedded
        if (modelLoader) {
            try {
                const basePath = 'assets/models/jake/';
                
                // Use the new GLB with all animations embedded
                console.log('📦 Loading Jake GLB model (22 actions)...');
                
                const result = await BABYLON.SceneLoader.ImportMeshAsync(
                    "", basePath, "Jake_22_actions.glb", this.scene
                );
                
                if (result.meshes.length > 0) {
                    // Remove old visual mesh if exists
                    if (this.visualMesh) {
                        this.visualMesh.dispose();
                    }
                    
                    // Create a container for the model
                    this.visualMesh = new BABYLON.TransformNode("jakeVisual", this.scene);
                    const rootMesh = result.meshes[0];
                    rootMesh.parent = this.visualMesh;
                    
                    // ════════════════════════════════════════════════════════════════
                    // CRITICAL: Apply corrective transforms to make model respond to
                    // normal axis rotations. GLB Mixamo models often export with
                    // unusual pivot points or rotations.
                    // ════════════════════════════════════════════════════════════════
                    
                    // Apply corrective rotation and scaling to normalize the model
                    // Most Mixamo models export standing upright, but may have odd rotations
                    rootMesh.scaling = new BABYLON.Vector3(1.0, 1.0, 1.0);
                    rootMesh.rotationQuaternion = null;  // Clear any quaternion that might override
                    
                    // Reset rotation completely - this is key for fixing axis issues
                    // CORRECTIVE ROTATION: Model comes in sideways from GLB export
                    // Apply 90° rotation around Y-axis to face model forward correctly
                    rootMesh.rotation = new BABYLON.Vector3(0, -Math.PI / 2, 0);  // Rotate 90° to correct sideways orientation
                    
                    // NOW calculate bounding box AFTER rotation to get correct center
                    const bounds = rootMesh.getHierarchyBoundingVectors();
                    const size = bounds.max.subtract(bounds.min);
                    const center = bounds.min.add(size.scale(0.5));
                    console.log(`📏 Model bounds - X: ${size.x.toFixed(2)}, Y: ${size.y.toFixed(2)}, Z: ${size.z.toFixed(2)}`);
                    console.log(`📍 Model center offset: (${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`);
                    
                    // CRITICAL: Offset the model so it rotates around its CENTER, not the hand
                    // Negate the center offset so rotations happen around (0,0,0)
                    rootMesh.position = new BABYLON.Vector3(-center.x, -center.y, -center.z);
                    
                    // Ensure all animations rotate with the visualization container, not internally
                    result.meshes.forEach(mesh => {
                        mesh.rotationQuaternion = null;  // Use Euler angles for consistency
                        // Reset mesh transforms to origin for consistent behavior
                        if (mesh !== rootMesh) {
                            mesh.position = new BABYLON.Vector3(0, 0, 0);
                            mesh.rotation = new BABYLON.Vector3(0, 0, 0);
                        }
                    });
                    
                    // Force the visualMesh container to use Euler angles too
                    this.visualMesh.rotationQuaternion = null;
                    
                    console.log('✅ Model loaded with corrective rotation - axes should now be aligned correctly');
                    
                    // Store skeleton
                    this.skeleton = result.skeletons.length > 0 ? result.skeletons[0] : null;

                    // DEBUG: Log skeleton bone list and parent info to help diagnose export issues
                    if (this.skeleton) {
                        try {
                            console.log('🔍 Skeleton bones:', this.skeleton.bones.map(b => b.name));
                            const roots = this.skeleton.bones.filter(b => !b.getParent()).map(b => b.name);
                            console.log('🔗 Skeleton root bones (no parent):', roots);
                            this.skeleton.bones.forEach(b => {
                                const parent = b.getParent();
                                console.log(`  bone: ${b.name}  parent: ${parent ? parent.name : '<root>'}`);
                            });
                        } catch (skErr) {
                            console.warn('Could not enumerate skeleton bones:', skErr.message);
                        }
                    }
                    
                    // Make all meshes visible and add shadows
                    result.meshes.forEach(mesh => {
                        mesh.isVisible = true;
                        if (this.game.shadowGenerator) {
                            this.game.shadowGenerator.addShadowCaster(mesh);
                        }
                    });
                    
                    console.log(`✅ Jake GLB loaded: ${result.meshes.length} meshes, ${result.skeletons.length} skeletons, ${result.animationGroups.length} animations`);
                    
                    // Map animation groups by name
                    this.animationGroups = new Map();
                    result.animationGroups.forEach(ag => {
                        // Normalize animation name for easy lookup
                        const normalizedName = this.normalizeAnimationName(ag.name);
                        this.animationGroups.set(normalizedName, ag);
                        ag.stop();
                        console.log(`  🎬 ${normalizedName}: ${ag.name}`);
                    });
                    
                    // Create animation controller
                    this.animController = {
                        currentAnimation: null,
                        
                        play: (name, loop = true, speed = 1.0) => {
                            const normalizedName = this.normalizeAnimationName(name);
                            const animGroup = this.animationGroups.get(normalizedName);
                            if (!animGroup) {
                                // Try direct match
                                const direct = this.animationGroups.get(name);
                                if (!direct) return false;
                                return this.animController.playGroup(direct, name, loop, speed);
                            }
                            return this.animController.playGroup(animGroup, normalizedName, loop, speed);
                        },
                        
                        playGroup: (animGroup, name, loop, speed) => {
                            if (this.animController.currentAnimation === name) return true;
                            
                            // Stop current
                            if (this.animController.currentAnimation) {
                                this.animationGroups.forEach(ag => ag.stop());
                            }
                            
                            // Play new
                            animGroup.speedRatio = speed;
                            animGroup.loopAnimation = loop;
                            animGroup.start(loop, speed);
                            this.animController.currentAnimation = name;
                            return true;
                        },
                        
                        stop: () => {
                            this.animationGroups.forEach(ag => ag.stop());
                            this.animController.currentAnimation = null;
                        },
                        
                        hasAnimation: (name) => {
                            const norm = this.normalizeAnimationName(name);
                            return this.animationGroups.has(norm) || this.animationGroups.has(name);
                        },
                        getAnimationNames: () => Array.from(this.animationGroups.keys())
                    };
                    
                    console.log('🎬 Animations ready:', this.animController.getAnimationNames());
                    
                    // Start idle animation (unless restrained)
                    if (!this.isRestrained && this.animController.hasAnimation('idle')) {
                        this.animController.play('idle', true);
                    }
                    
                    this.modelLoaded = true;
                    console.log('✅ Jake model loaded with all animations!');
                    
                    // Re-position on bed if intro sequence already started
                    if (this.isRestrained) {
                        console.log('🛏️ Repositioning Jake on bed after model load');
                        this.positionOnBed();
                    }
                    return;
                }
            } catch (e) {
                console.warn('Could not load Jake GLB, trying fallback:', e.message);
                
                // Try simpler GLB as fallback
                try {
                    const basePath = 'assets/models/jake/';
                    const result = await BABYLON.SceneLoader.ImportMeshAsync(
                        "", basePath, "base_basic_shaded.glb", this.scene
                    );
                    
                    if (result.meshes.length > 0) {
                        if (this.visualMesh) this.visualMesh.dispose();
                        
                        this.visualMesh = new BABYLON.TransformNode("jakeVisual", this.scene);
                        const rootMesh = result.meshes[0];
                        rootMesh.parent = this.visualMesh;
                        rootMesh.scaling = new BABYLON.Vector3(1.0, 1.0, 1.0);
                        rootMesh.position = new BABYLON.Vector3(0, -0.9, 0);
                        
                        result.meshes.forEach(mesh => {
                            mesh.isVisible = true;
                            if (this.game.shadowGenerator) {
                                this.game.shadowGenerator.addShadowCaster(mesh);
                            }
                        });
                        
                        // Setup basic animation controller (GLB may have embedded anims)
                        this.animationGroups = new Map();
                        result.animationGroups?.forEach(ag => {
                            this.animationGroups.set(ag.name.toLowerCase(), ag);
                            ag.stop();
                        });
                        
                        this.animController = {
                            currentAnimation: null,
                            play: (name, loop = true, speed = 1.0) => {
                                const ag = this.animationGroups.get(name) || this.animationGroups.get(name.toLowerCase());
                                if (!ag) return false;
                                if (this.animController.currentAnimation) {
                                    const curr = this.animationGroups.get(this.animController.currentAnimation);
                                    if (curr) curr.stop();
                                }
                                ag.speedRatio = speed;
                                ag.start(loop);
                                this.animController.currentAnimation = name;
                                return true;
                            },
                            stop: () => { this.animController.currentAnimation = null; },
                            hasAnimation: (name) => this.animationGroups.has(name) || this.animationGroups.has(name.toLowerCase()),
                            getAnimationNames: () => Array.from(this.animationGroups.keys())
                        };
                        
                        this.modelLoaded = true;
                        console.log('✅ Jake GLB fallback loaded!');
                        
                        // Re-position on bed if intro sequence already started
                        if (this.isRestrained) {
                            this.positionOnBed();
                        }
                        return;
                    }
                } catch (glbErr) {
                    console.warn('GLB also failed:', glbErr.message);
                }
            }
        }
        
        // Fallback to procedural mesh
        this.createFallbackMesh();
        
        // If Jake was supposed to be restrained (intro sequence started before model load)
        // re-position him on the bed now that visualMesh exists
        if (this.isRestrained && this.visualMesh) {
            this.positionOnBed();
        }
    }
    
    // Normalize animation names from Mixamo format to simple names
    normalizeAnimationName(name) {
        if (!name) return 'unknown';
        const lower = name.toLowerCase();
        
        // Common Mixamo animation name patterns
        if (lower.includes('idle') || lower.includes('breathing')) return 'idle';
        if (lower.includes('walk')) return 'walk';
        if (lower.includes('run') || lower.includes('sprint')) return 'run';
        if (lower.includes('jump')) return 'jump';
        if (lower.includes('crouch') || lower.includes('sneak')) return 'crouch';
        if (lower.includes('punch') || lower.includes('jab') || lower.includes('cross')) return 'punch';
        if (lower.includes('kick')) return 'kick';
        if (lower.includes('die') || lower.includes('death') || lower.includes('dying')) return 'die';
        if (lower.includes('fall')) return 'fall';
        if (lower.includes('pain') || lower.includes('hit') || lower.includes('hurt')) return 'pain';
        if (lower.includes('look') || lower.includes('behind')) return 'look';
        if (lower.includes('kneel')) return 'kneel';
        if (lower.includes('prone') || lower.includes('crawl')) return 'prone';
        if (lower.includes('type') || lower.includes('typing')) return 'type';
        if (lower.includes('reload')) return 'reload';
        if (lower.includes('aim') || lower.includes('shoot')) return 'aim';
        if (lower.includes('fight') && lower.includes('idle')) return 'fight_idle';
        if (lower.includes('bounce')) return 'bounce';
        
        // Return cleaned version of original name
        return lower.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    }
    
    createVisualMesh() {
        this.createFallbackMesh();
    }
    
    createFallbackMesh() {
        // Create Jake's body (temporary mesh until GLB loaded)
        const body = BABYLON.MeshBuilder.CreateCapsule("jakeBody", {
            height: 1.4,
            radius: 0.35
        }, this.scene);
        
        const bodyMat = new BABYLON.StandardMaterial("jakeMat", this.scene);
        bodyMat.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.8); // Blue outfit
        body.material = bodyMat;
        
        // Head
        const head = BABYLON.MeshBuilder.CreateSphere("jakeHead", {
            diameter: 0.4
        }, this.scene);
        head.position.y = 0.9;
        
        const headMat = new BABYLON.StandardMaterial("headMat", this.scene);
        headMat.diffuseColor = new BABYLON.Color3(0.9, 0.75, 0.6); // Skin tone
        head.material = headMat;
        head.parent = body;
        
        // Arms (show strength!)
        const armMat = new BABYLON.StandardMaterial("armMat", this.scene);
        armMat.diffuseColor = new BABYLON.Color3(0.9, 0.75, 0.6);
        
        const leftArm = BABYLON.MeshBuilder.CreateCapsule("leftArm", {
            height: 0.7,
            radius: 0.12
        }, this.scene);
        leftArm.position = new BABYLON.Vector3(-0.5, 0.3, 0);
        leftArm.rotation.z = Math.PI / 6;
        leftArm.material = armMat;
        leftArm.parent = body;
        
        const rightArm = BABYLON.MeshBuilder.CreateCapsule("rightArm", {
            height: 0.7,
            radius: 0.12
        }, this.scene);
        rightArm.position = new BABYLON.Vector3(0.5, 0.3, 0);
        rightArm.rotation.z = -Math.PI / 6;
        rightArm.material = armMat;
        rightArm.parent = body;
        
        this.visualMesh = body;
        this.visualMesh.position = this.mesh.position.clone();
    }
    
    update(deltaTime) {
        const input = this.game.inputManager;
        
        // Get current velocity from physics
        const currentVelocity = this.physicsAggregate.body.getLinearVelocity();
        
        // Ground check
        this.checkGrounded();
        
        // LOCK JAKE IN BED POSITION WHILE RESTRAINED
        // This includes the ENTIRE intro sequence - Jake stays on bed
        // Even if intro actions try to move him
        if (this.isRestrained && !this.game.debugEditorActive) {  // Skip lock when F9 editor is active
            // Force physics collider to stay on bed at all times
            const bedCenterX = -2;
            const bedCenterZ = -2.5;
            const mattressTopY = 0.72;
            const lyingY = mattressTopY + 0.15;
            
            // LOCK: Prevent ANY movement away from bed
            this.mesh.position.set(bedCenterX, lyingY, bedCenterZ);
            this.mesh.rotation.set(0, 0, 0);  // Collider stays upright
            
            // Zero out all velocity
            this.physicsAggregate.body.setLinearVelocity(BABYLON.Vector3.Zero());
            this.physicsAggregate.body.setAngularVelocity(BABYLON.Vector3.Zero());
            
            // Force visual mesh to stay locked on bed LYING DOWN
            if (this.visualMesh) {
                // LOCK position - use corrected Y from positionOnBed()
                const correctedY = 1.37;
                this.visualMesh.position.set(bedCenterX, correctedY, bedCenterZ);
                
                // LOCK rotation - use exact rotation from positionOnBed()
                const degToRad = (d) => d * Math.PI / 180;
                this.visualMesh.rotationQuaternion = null;  // Use Euler angles, not quaternions
                this.visualMesh.rotation.set(
                    degToRad(341.1),    // X: 341.1° - correct lying pose
                    degToRad(46.4),     // Y: 46.4°
                    degToRad(175.2)     // Z: 175.2°
                );
                
                // CRITICAL: Immediately stop any animations that are playing
                // Get all animations in the scene and stop those targeting this mesh
                this.scene.animationPropertiesOverride = null;  // Clear any global overrides
                
                // Stop all animatable objects that target this mesh
                const activeObservables = this.scene.onBeforeAnimationsObservable;
                
                // Clear animations array
                if (this.visualMesh.animations) {
                    this.visualMesh.animations = [];
                }
                
                // Also lock root mesh rotation
                const rootMesh = this.visualMesh.getChildren()[0];
                if (rootMesh) {
                    if (rootMesh.rotationQuaternion) rootMesh.rotationQuaternion = null;
                    rootMesh.rotation.set(0, -Math.PI / 2, 0);  // Bind-pose correction
                    rootMesh.position.y = 0;
                    if (rootMesh.animations) {
                        rootMesh.animations = [];
                    }
                }
                
                // Locked on bed - debug status shown in F9 editor only (no console spam)
            }
        } else if (this.game.debugEditorActive) {
            // Editor mode: disable physics to allow free manipulation
            this.physicsAggregate.body.setLinearVelocity(BABYLON.Vector3.Zero());
            this.physicsAggregate.body.setAngularVelocity(BABYLON.Vector3.Zero());
        } else {
            // Only process controls if enabled (disabled during cutscenes)
            if (this.controlsEnabled) {
                // Movement
                this.handleMovement(input, currentVelocity, deltaTime);
                
                // Jumping
                this.handleJump(input, currentVelocity);
                
                // Interaction (bar bending, etc.)
                this.handleInteraction(input, deltaTime);
                
                // Attack - use weapon if equipped, otherwise melee
                if (input.isAttacking()) {
                    if (this.inventory.currentWeapon && this.inventory.weapons.length > 0) {
                        this.shoot();
                    } else {
                        this.attack();
                    }
                }
            } else {
                // During cutscene, just maintain position (no sliding)
                this.physicsAggregate.body.setLinearVelocity(new BABYLON.Vector3(0, currentVelocity.y, 0));
            }
            
            // Update visual mesh to follow physics collider
            this.updateVisualMesh();
        }
        
        // Update animations based on movement
        this.updateAnimations(currentVelocity);
        
        // Update camera
        this.updateCamera(input);
    }
    
    checkGrounded() {
        // Raycast down to check if on ground
        const origin = this.mesh.position.clone();
        origin.y -= GAME.PLAYER.HEIGHT / 2 - 0.1;
        
        const ray = new BABYLON.Ray(origin, BABYLON.Vector3.Down(), 0.3);
        const hit = this.scene.pickWithRay(ray, (mesh) => {
            return mesh !== this.mesh && mesh !== this.visualMesh;
        });
        
        this.isGrounded = hit.hit;
    }
    
    handleMovement(input, currentVelocity, deltaTime) {
        const moveDir = input.getMovementVector();
        
        // ═══════════════════════════════════════════════════════
        // NOCLIP MODE - Free flying through walls (IDCLIP style)
        // ═══════════════════════════════════════════════════════
        if (this.noclip) {
            const flySpeed = input.isSprinting() ? 25 : 12;
            
            // Calculate movement in camera direction
            const forward = new BABYLON.Vector3(
                Math.sin(this.game.inputManager.yaw),
                0,
                Math.cos(this.game.inputManager.yaw)
            );
            const right = new BABYLON.Vector3(
                Math.cos(this.game.inputManager.yaw),
                0,
                -Math.sin(this.game.inputManager.yaw)
            );
            
            // Horizontal movement
            let moveVec = forward.scale(moveDir.z).add(right.scale(moveDir.x));
            moveVec = moveVec.scale(flySpeed * deltaTime);
            
            // Vertical movement (Space = up, Ctrl = down)
            let verticalMove = 0;
            if (input.isJumping()) verticalMove = flySpeed * deltaTime;
            if (input.isCrouching()) verticalMove = -flySpeed * deltaTime;
            
            // Apply movement directly to position (bypasses physics)
            this.mesh.position.addInPlace(new BABYLON.Vector3(
                moveVec.x,
                verticalMove,
                moveVec.z
            ));
            
            // Keep physics body synced but still
            if (this.physicsAggregate?.body) {
                this.physicsAggregate.body.disablePreStep = true;
                this.physicsAggregate.body.setLinearVelocity(BABYLON.Vector3.Zero());
            }
            
            return; // Skip normal movement
        }
        
        // ═══════════════════════════════════════════════════════
        // NORMAL MOVEMENT
        // ═══════════════════════════════════════════════════════
        
        // Determine speed
        let speed = GAME.PLAYER.SPEED;
        if (input.isSprinting() && this.isGrounded) {
            speed *= GAME.PLAYER.SPRINT_MULTIPLIER;
            this.isSprinting = true;
        } else {
            this.isSprinting = false;
        }
        
        if (input.isCrouching()) {
            speed *= 0.5;
            this.isCrouching = true;
        } else {
            this.isCrouching = false;
        }
        
        // Apply movement
        const targetVelocity = new BABYLON.Vector3(
            moveDir.x * speed,
            currentVelocity.y, // Preserve vertical velocity
            moveDir.z * speed
        );
        
        // Smooth acceleration
        const acceleration = this.isGrounded ? 0.2 : 0.05;
        const newVelocity = new BABYLON.Vector3(
            BABYLON.Scalar.Lerp(currentVelocity.x, targetVelocity.x, acceleration),
            targetVelocity.y,
            BABYLON.Scalar.Lerp(currentVelocity.z, targetVelocity.z, acceleration)
        );
        
        this.physicsAggregate.body.setLinearVelocity(newVelocity);
    }
    
    handleJump(input, currentVelocity) {
        if (input.isJumping() && this.isGrounded) {
            const jumpVelocity = new BABYLON.Vector3(
                currentVelocity.x,
                GAME.PLAYER.JUMP_FORCE,
                currentVelocity.z
            );
            this.physicsAggregate.body.setLinearVelocity(jumpVelocity);
        }
    }
    
    handleInteraction(input, deltaTime) {
        // Check for interactable objects
        this.checkForInteractables();
        
        if (this.interactTarget && input.isInteracting()) {
            this.isInteracting = true;
            
            // Some interactions are instant (computer, NPC), bars require holding
            const interactType = this.interactTarget.metadata?.type;
            
            if (interactType === 'computer' || interactType === 'npc') {
                // Instant interaction on key press
                if (input.isInteractJustPressed()) {
                    this.completeInteraction();
                }
            } else {
                // Hold interaction (bars)
                this.interactProgress += deltaTime;
                
                // Check if interaction complete
                if (this.interactProgress >= GAME.BAR_BENDING.HOLD_DURATION) {
                    this.completeInteraction();
                }
            }
        } else {
            this.isInteracting = false;
            this.interactProgress = 0;
        }
    }
    
    checkForInteractables() {
        // Raycast forward to find interactable objects
        const forward = new BABYLON.Vector3(
            Math.sin(this.game.inputManager.yaw),
            0,
            Math.cos(this.game.inputManager.yaw)
        );
        
        const origin = this.mesh.position.clone();
        origin.y += 0.5; // Eye level
        
        const ray = new BABYLON.Ray(origin, forward, 3);
        const hit = this.scene.pickWithRay(ray, (mesh) => {
            return mesh.metadata && mesh.metadata.interactable;
        });
        
        const promptEl = document.getElementById('interactPrompt');
        
        if (hit.hit && hit.pickedMesh) {
            this.interactTarget = hit.pickedMesh;
            promptEl.style.display = 'block';
            
            if (this.interactTarget.metadata.type === 'bar') {
                promptEl.textContent = `Hold [E] to bend bar (${Math.floor(this.interactProgress / GAME.BAR_BENDING.HOLD_DURATION * 100)}%)`;
            } else if (this.interactTarget.metadata.type === 'npc') {
                promptEl.textContent = `Press [E] to rescue ${this.interactTarget.metadata.name}`;
            } else if (this.interactTarget.metadata.type === 'computer') {
                promptEl.textContent = `Press [E] to use ${this.interactTarget.metadata.name}`;
            } else if (this.interactTarget.metadata.type === 'elevator_call') {
                promptEl.textContent = `Press [E] to call elevator`;
            } else if (this.interactTarget.metadata.type === 'secret_panel') {
                promptEl.textContent = `Press [E] to examine wall`;
            } else if (this.interactTarget.metadata.type === 'weapon') {
                promptEl.textContent = `Press [E] to pick up ${this.interactTarget.metadata.name}`;
            } else if (this.interactTarget.metadata.type === 'powerup') {
                promptEl.textContent = `Press [E] to pick up ${this.interactTarget.metadata.name}`;
            } else if (this.interactTarget.metadata.type === 'creepy_secret_panel') {
                promptEl.textContent = `Press [E] to examine ${this.interactTarget.metadata.name}`;
            } else if (this.interactTarget.metadata.type === 'toilet') {
                promptEl.textContent = `Press [E] to use toilet`;
            } else if (this.interactTarget.metadata.type === 'cell4_secret_panel') {
                promptEl.textContent = `Press [E] - ${this.interactTarget.metadata.hint || 'Examine wall'}`;
            } else if (this.interactTarget.metadata.type === 'keycard') {
                promptEl.textContent = `Press [E] to pick up ${this.interactTarget.metadata.name}`;
            } else if (this.interactTarget.metadata.type === 'keycard_reader') {
                promptEl.textContent = `Press [E] to use ${this.interactTarget.metadata.name}`;
            } else if (this.interactTarget.metadata.type === 'health') {
                promptEl.textContent = `Press [E] to use ${this.interactTarget.metadata.name}`;
            } else if (this.interactTarget.metadata.type === 'armor') {
                promptEl.textContent = `Press [E] to equip ${this.interactTarget.metadata.name}`;
            } else if (this.interactTarget.metadata.type === 'enemy') {
                if (this.interactTarget.metadata.health <= 0) {
                    promptEl.textContent = `Press [E] to search ${this.interactTarget.metadata.name}`;
                } else {
                    promptEl.textContent = `${this.interactTarget.metadata.name} - Hostile!`;
                }
            }
        } else {
            this.interactTarget = null;
            promptEl.style.display = 'none';
        }
    }
    
    completeInteraction() {
        if (!this.interactTarget) return;
        
        const metadata = this.interactTarget.metadata;
        
        if (metadata.type === 'bar') {
            // Bend the bar!
            this.bendBar(this.interactTarget);
        } else if (metadata.type === 'npc') {
            // Rescue NPC
            this.rescueNPC(this.interactTarget);
        } else if (metadata.type === 'computer') {
            // Read the computer
            this.readComputer(this.interactTarget);
        } else if (metadata.type === 'elevator_call') {
            // Call the elevator
            if (this.game.activeLevel && this.game.activeLevel.callElevator) {
                this.game.activeLevel.callElevator();
            }
        } else if (metadata.type === 'secret_panel') {
            // Open secret panel
            if (this.game.activeLevel && this.game.activeLevel.openSecretPanel) {
                this.game.activeLevel.openSecretPanel();
            }
        } else if (metadata.type === 'creepy_secret_panel') {
            // Open the creepy secret panel
            if (this.game.activeLevel && this.game.activeLevel.openCreepySecretPanel) {
                this.game.activeLevel.openCreepySecretPanel();
            }
        } else if (metadata.type === 'toilet') {
            // Use the toilet
            this.useToilet();
        } else if (metadata.type === 'weapon') {
            // Pick up weapon
            this.pickupWeapon(this.interactTarget);
        } else if (metadata.type === 'powerup') {
            // Pick up powerup
            this.pickupPowerup(this.interactTarget);
        } else if (metadata.type === 'cell4_secret_panel') {
            // Open Cell 4's secret panel (underground passage)
            if (this.game.activeLevel && this.game.activeLevel.openCell4SecretPanel) {
                this.game.activeLevel.openCell4SecretPanel();
            }
        } else if (metadata.type === 'keycard') {
            // Pick up keycard
            if (this.game.activeLevel && this.game.activeLevel.pickupKeycard) {
                this.game.activeLevel.pickupKeycard();
            }
        } else if (metadata.type === 'keycard_reader') {
            // Use keycard reader
            if (this.game.activeLevel && this.game.activeLevel.useKeycardReader) {
                this.game.activeLevel.useKeycardReader();
            }
        } else if (metadata.type === 'health') {
            // Pick up health
            this.pickupHealth(this.interactTarget);
        } else if (metadata.type === 'armor') {
            // Pick up armor
            this.pickupArmor(this.interactTarget);
        } else if (metadata.type === 'enemy') {
            // Search defeated enemy
            if (metadata.health <= 0 && metadata.hasKeycard) {
                if (this.game.activeLevel && this.game.activeLevel.pickupKeycard) {
                    this.game.activeLevel.pickupKeycard();
                }
            }
        }
        
        this.interactProgress = 0;
        this.interactTarget = null;
    }
    
    useToilet() {
        // Jake uses the toilet
        if (this.game.activeLevel && this.game.activeLevel.useToilet) {
            // Play animation - Jake faces toilet
            if (this.visualMesh) {
                // Turn to face toilet direction
                this.visualMesh.rotation.y = Math.PI / 2;
            }
            
            // Disable controls briefly
            this.controlsEnabled = false;
            
            // Jake comments
            this.game.dialogue.show([
                { speaker: "Jake", text: "Ahh... much better." }
            ]);
            
            // Call toilet use function
            this.game.activeLevel.useToilet();
            
            // Re-enable controls after done
            setTimeout(() => {
                this.controlsEnabled = true;
                if (this.visualMesh) {
                    this.visualMesh.rotation.y = 0;
                }
            }, 5000);
        }
    }
    
    pickupWeapon(weaponMesh) {
        const weaponType = weaponMesh.metadata.weaponType;
        const weaponName = weaponMesh.metadata.name;
        
        // Add to PERSISTENT inventory
        this.inventory.addWeapon(weaponType);
        this.weapons = this.inventory.weapons;
        this.currentWeapon = this.inventory.currentWeapon;
        
        // Show pickup message
        this.game.dialogue.show([
            { speaker: "Jake", text: `Got it! ${weaponName} acquired.` }
        ]);
        
        // Update HUD
        this.updateInventoryHUD();
        
        // Remove pickup from scene
        weaponMesh.dispose();
        
        // Jake comments
        if (this.game.activeLevel && this.game.activeLevel.speak) {
            this.game.activeLevel.speak(`Nice. A ${weaponName}. This'll come in handy.`);
        }
    }
    
    pickupHealth(healthMesh) {
        const healAmount = healthMesh.metadata.healAmount || 50;
        const name = healthMesh.metadata.name || 'Health';
        
        // Add health
        this.inventory.addHealth(healAmount);
        this.health = this.inventory.health;
        
        // Show pickup message
        this.game.dialogue.show([
            { speaker: "System", text: `${name} - Restored ${healAmount} HP!` }
        ]);
        
        // Update HUD
        this.updateInventoryHUD();
        
        // Remove pickup from scene
        healthMesh.dispose();
        
        // Jake comments
        if (this.game.activeLevel && this.game.activeLevel.speak) {
            this.game.activeLevel.speak("That's better. Feeling healthier.");
        }
    }
    
    pickupArmor(armorMesh) {
        const armorAmount = armorMesh.metadata.armorAmount || 25;
        const name = armorMesh.metadata.name || 'Armor';
        
        // Add armor
        this.inventory.addArmor(armorAmount);
        this.armor = this.inventory.armor;
        
        // Show pickup message
        this.game.dialogue.show([
            { speaker: "System", text: `${name} - +${armorAmount} Armor!` }
        ]);
        
        // Update HUD
        this.updateInventoryHUD();
        
        // Remove pickup from scene
        armorMesh.dispose();
        
        // Jake comments
        if (this.game.activeLevel && this.game.activeLevel.speak) {
            this.game.activeLevel.speak("A vest. Good, I'll need protection.");
        }
    }
    
    pickupPowerup(powerupMesh) {
        const powerupType = powerupMesh.metadata.powerupType;
        const powerupName = powerupMesh.metadata.name;
        
        // Apply powerup effect to PERSISTENT inventory
        switch (powerupType) {
            case 'health':
                this.inventory.addHealth(50);
                this.health = this.inventory.health;
                break;
            case 'armor':
                this.inventory.addArmor(50);
                this.armor = this.inventory.armor;
                break;
            case 'ammo':
                // Add ammo for current weapon or all weapons
                if (this.currentWeapon) {
                    this.inventory.addAmmo(this.currentWeapon, 30);
                } else {
                    // Add ammo for all weapon types
                    this.inventory.addAmmo('pistol', 15);
                    this.inventory.addAmmo('rifle', 30);
                }
                break;
        }
        
        // Show pickup message
        this.game.dialogue.show([
            { speaker: "System", text: `${powerupName} collected!` }
        ]);
        
        // Update HUD
        this.updateInventoryHUD();
        
        // Remove pickup from scene
        powerupMesh.dispose();
    }
    
    updateInventoryHUD() {
        // Update HUD display with inventory info
        let inventoryDisplay = document.getElementById('inventoryDisplay');
        if (!inventoryDisplay) {
            inventoryDisplay = document.createElement('div');
            inventoryDisplay.id = 'inventoryDisplay';
            inventoryDisplay.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 15px;
                border-radius: 8px;
                font-family: monospace;
                font-size: 14px;
                min-width: 180px;
                border: 1px solid rgba(100, 200, 255, 0.3);
            `;
            document.body.appendChild(inventoryDisplay);
        }
        
        const weaponsList = this.inventory.weapons.length > 0 
            ? this.inventory.weapons.map(w => {
                const ammo = this.inventory.getAmmo(w);
                const current = w === this.inventory.currentWeapon ? '►' : ' ';
                return `${current} ${w}: ${ammo}`;
            }).join('<br>')
            : 'None';
        
        inventoryDisplay.innerHTML = `
            <div style="color: #4af; margin-bottom: 8px; font-weight: bold;">═ INVENTORY ═</div>
            <div style="color: #0f0;">❤ Health: ${this.inventory.health}/${this.inventory.maxHealth}</div>
            <div style="color: #48f;">🛡 Armor: ${this.inventory.armor}</div>
            <div style="color: #fa0; margin-top: 8px;">═ WEAPONS ═</div>
            <div style="color: #fff;">${weaponsList}</div>
            ${this.inventory.items.length > 0 ? `
                <div style="color: #f4a; margin-top: 8px;">═ ITEMS ═</div>
                <div style="color: #fff;">${this.inventory.items.join(', ')}</div>
            ` : ''}
        `;
    }
    
    readComputer(computerMesh) {
        // Show terminal interface for code entry
        this.showTerminalInterface();
    }
    
    showTerminalInterface() {
        // Create terminal UI overlay
        let terminal = document.getElementById('terminalUI');
        if (!terminal) {
            terminal = document.createElement('div');
            terminal.id = 'terminalUI';
            terminal.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 500px;
                background: #0a1a0a;
                border: 3px solid #00ff00;
                border-radius: 10px;
                padding: 20px;
                font-family: monospace;
                color: #00ff00;
                z-index: 200;
                box-shadow: 0 0 30px rgba(0, 255, 0, 0.3);
            `;
            document.body.appendChild(terminal);
        }
        
        terminal.innerHTML = `
            <div style="text-align: center; margin-bottom: 15px; font-size: 18px; border-bottom: 1px solid #00ff00; padding-bottom: 10px;">
                ═══ NEXAGEN SECURITY TERMINAL ═══
            </div>
            <div style="margin-bottom: 15px; font-size: 14px;">
                <div style="color: #00dd00;">SUBJECT: Jake Morrison - TIER 5</div>
                <div style="color: #00dd00;">STATUS: ENHANCED (+400% STRENGTH)</div>
                <div style="color: #ff6600; margin-top: 10px;">⚠ WARNING: Subject unstable</div>
            </div>
            <div style="border-top: 1px solid #006600; padding-top: 15px;">
                <div style="color: #ffff00; margin-bottom: 10px;">RELATED SUBJECTS:</div>
                <div>► Sarah Mitchell - FLOOR 7 - LAB B12</div>
                <div>► Dr. Chen       - FLOOR 7 - LAB B15</div>
            </div>
            <div style="border-top: 1px solid #006600; margin-top: 15px; padding-top: 15px;">
                <div style="margin-bottom: 10px;">ENTER DOOR ACCESS CODE:</div>
                <input type="text" id="doorCodeInput" maxlength="8" style="
                    width: 200px;
                    background: #001a00;
                    border: 2px solid #00ff00;
                    color: #00ff00;
                    font-family: monospace;
                    font-size: 24px;
                    padding: 10px;
                    text-align: center;
                    letter-spacing: 5px;
                " placeholder="____" autocomplete="off">
                <button id="submitCodeBtn" style="
                    margin-left: 10px;
                    background: #003300;
                    border: 2px solid #00ff00;
                    color: #00ff00;
                    padding: 10px 20px;
                    font-family: monospace;
                    cursor: pointer;
                ">SUBMIT</button>
            </div>
            <div id="codeResult" style="margin-top: 15px; height: 20px;"></div>
            <div style="margin-top: 15px; text-align: center;">
                <button id="closeTerminalBtn" style="
                    background: #330000;
                    border: 2px solid #ff0000;
                    color: #ff0000;
                    padding: 8px 20px;
                    font-family: monospace;
                    cursor: pointer;
                ">CLOSE [ESC]</button>
            </div>
        `;
        
        terminal.style.display = 'block';
        this.terminalOpen = true;
        
        // Focus the input
        const input = document.getElementById('doorCodeInput');
        setTimeout(() => input.focus(), 100);
        
        // Handle submit
        const submitBtn = document.getElementById('submitCodeBtn');
        const resultDiv = document.getElementById('codeResult');
        
        const tryCode = () => {
            const code = input.value.toUpperCase();
            // The code can be anything for now - we'll accept a few options
            // User said they haven't decided yet
            const validCodes = ['SARAH', 'ESCAPE', 'FREEDOM', '1234', '0000', 'JAKE', 'NEXAGEN', '7412'];
            
            if (validCodes.includes(code)) {
                resultDiv.innerHTML = '<span style="color: #00ff00;">✓ ACCESS GRANTED - DOOR UNLOCKED</span>';
                
                // Unlock the door
                if (this.game.activeLevel && this.game.activeLevel.unlockDoor) {
                    this.game.activeLevel.unlockDoor();
                }
                
                // Jake speaks
                if (this.game.activeLevel && this.game.activeLevel.speak) {
                    setTimeout(() => {
                        this.game.activeLevel.speak("Got it! The door's open. Sarah's on Floor 7. I need to find her and get us out of here.");
                    }, 1000);
                }
                
                // Close terminal after delay
                setTimeout(() => this.closeTerminal(), 2000);
            } else if (code.length > 0) {
                resultDiv.innerHTML = '<span style="color: #ff0000;">✗ ACCESS DENIED - INVALID CODE</span>';
                input.value = '';
            }
        };
        
        submitBtn.onclick = tryCode;
        input.onkeydown = (e) => {
            if (e.key === 'Enter') tryCode();
            if (e.key === 'Escape') this.closeTerminal();
        };
        
        // Close button
        document.getElementById('closeTerminalBtn').onclick = () => this.closeTerminal();
        
        // ESC to close
        this.terminalEscHandler = (e) => {
            if (e.key === 'Escape' && this.terminalOpen) {
                this.closeTerminal();
            }
        };
        window.addEventListener('keydown', this.terminalEscHandler);
    }
    
    closeTerminal() {
        const terminal = document.getElementById('terminalUI');
        if (terminal) terminal.style.display = 'none';
        this.terminalOpen = false;
        
        if (this.terminalEscHandler) {
            window.removeEventListener('keydown', this.terminalEscHandler);
        }
        
        // Re-lock pointer
        this.game.canvas.requestPointerLock();
    }
    
    bendBar(barMesh) {
        // Use strength to bend bar
        if (this.strength >= GAME.BAR_BENDING.STRENGTH_COST) {
            this.strength -= GAME.BAR_BENDING.STRENGTH_COST;
            
            const barIndex = barMesh.metadata.index || 0;
            // Bars bend AWAY from each other - left bars go left, right bars go right
            const bendDirection = (barIndex <= 7) ? -1 : 1;
            
            // Check for new multi-segment bar structure
            if (barMesh.metadata.pivots && barMesh.metadata.numSegments) {
                const pivots = barMesh.metadata.pivots;
                const numSegments = barMesh.metadata.numSegments;
                const segmentHeight = GAME.PLAYER.HEIGHT / numSegments; // Approximate
                
                // ═══════════════════════════════════════════════════════════════════
                // REALISTIC SEMICIRCULAR BEND - Like actual steel being forced apart
                // - Segments rotate + translate to form smooth arc
                // - Middle segments bend outward most (away from neighbors)
                // - Endpoints stay relatively fixed, creating arc
                // ═══════════════════════════════════════════════════════════════════
                pivots.forEach((pivot, segIndex) => {
                    // Base curve - middle segments bend most
                    const normalizedPos = segIndex / (numSegments - 1); // 0 to 1
                    const baseCurve = Math.sin(normalizedPos * Math.PI); // 0 at ends, 1 at middle
                    
                    // Add organic randomness (-15% to +15% variation)
                    const randomVariation = 0.85 + Math.random() * 0.3;
                    
                    // Slight asymmetry - one side of middle bends slightly more
                    const asymmetry = normalizedPos < 0.5 ? 0.92 : 1.08;
                    
                    // Calculate rotation bend angle with organic variation
                    const maxBendAngle = GAME.BAR_BENDING.BEND_ANGLE;
                    const segmentBendAngle = maxBendAngle * baseCurve * randomVariation * asymmetry * bendDirection * 1.2;
                    
                    // Calculate outward translation (arc bulge) - creates semicircle shape
                    const maxOutward = 0.35 * bendDirection; // How far bar bulges outward
                    const outwardTranslation = maxOutward * baseCurve * randomVariation * asymmetry;
                    
                    // Random timing offset for each segment (0-150ms spread)
                    const timingOffset = Math.floor(Math.random() * 5); // 0-5 frames
                    
                    // ROTATION animation - segment rotates around Z axis
                    const bendAnim = new BABYLON.Animation(
                        `bendSeg_${segIndex}`,
                        "rotation.z",
                        30,
                        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
                    );
                    
                    // Multi-stage bend with "jerky" metal resistance
                    bendAnim.setKeys([
                        { frame: timingOffset, value: 0 },
                        { frame: timingOffset + 8, value: segmentBendAngle * 0.25 },  // Initial resistance
                        { frame: timingOffset + 16, value: segmentBendAngle * 0.5 },  // Starting to give
                        { frame: timingOffset + 24, value: segmentBendAngle * 0.8 },  // Major bend
                        { frame: timingOffset + 35, value: segmentBendAngle * 0.97 }, // Slight spring-back
                        { frame: timingOffset + 45, value: segmentBendAngle }         // Final hold
                    ]);
                    
                    // TRANSLATION animation - segment moves outward (away from neighbors)
                    const translateAnim = new BABYLON.Animation(
                        `translateSeg_${segIndex}`,
                        "position.x",
                        30,
                        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
                    );
                    
                    // Smooth outward translation
                    translateAnim.setKeys([
                        { frame: timingOffset, value: 0 },
                        { frame: timingOffset + 10, value: outwardTranslation * 0.3 },
                        { frame: timingOffset + 20, value: outwardTranslation * 0.65 },
                        { frame: timingOffset + 32, value: outwardTranslation * 0.95 },
                        { frame: timingOffset + 45, value: outwardTranslation }
                    ]);
                    
                    // Use elastic easing for metal "spring" effect
                    const easingFunction = new BABYLON.BackEase(0.35);
                    easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEOUT);
                    bendAnim.setEasingFunction(easingFunction);
                    translateAnim.setEasingFunction(easingFunction);
                    
                    pivot.animations = [bendAnim, translateAnim];
                    this.scene.beginAnimation(pivot, 0, 50, false);
                });
                
                // Play metal creaking sound
                if (this.game.soundSystem) {
                    this.game.soundSystem.play('metalCreak');
                }
                
                // Disable collider so player can walk through
                if (barMesh.metadata.collider) {
                    setTimeout(() => {
                        barMesh.metadata.collider.setEnabled(false);
                    }, 1200);
                }
            } else if (barMesh.metadata.upperPivot) {
                // Fallback for old two-segment bars - also with organic bend
                const upperPivot = barMesh.metadata.upperPivot;
                
                const bendAnim = new BABYLON.Animation(
                    "bendBar",
                    "rotation.z",
                    30,
                    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
                );
                
                // Add slight randomness to target
                const randomFactor = 0.85 + Math.random() * 0.3;
                const targetRot = GAME.BAR_BENDING.BEND_ANGLE * bendDirection * randomFactor;
                
                bendAnim.setKeys([
                    { frame: 0, value: 0 },
                    { frame: 10, value: targetRot * 0.4 },
                    { frame: 20, value: targetRot * 0.75 },
                    { frame: 30, value: targetRot * 0.95 },
                    { frame: 35, value: targetRot }
                ]);
                
                const easingFunction = new BABYLON.BackEase(0.2);
                easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEOUT);
                bendAnim.setEasingFunction(easingFunction);
                
                upperPivot.animations = [bendAnim];
                this.scene.beginAnimation(upperPivot, 0, 35, false);
                
                if (barMesh.metadata.collider) {
                    setTimeout(() => {
                        barMesh.metadata.collider.setEnabled(false);
                    }, 700);
                }
            }
            
            // Mark as bent
            barMesh.metadata.bent = true;
            barMesh.metadata.interactable = false;
            
            // Change color to show it's bent
            const bentMat = new BABYLON.StandardMaterial("bentBarMat", this.scene);
            bentMat.diffuseColor = new BABYLON.Color3(0.4, 0.35, 0.3);
            bentMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
            
            // Apply to all child meshes
            barMesh.getChildMeshes().forEach(child => {
                if (child.material) {
                    child.material = bentMat;
                }
            });
            
            // Check if all bars bent (can escape)
            if (this.game.activeLevel.checkBarsComplete) {
                this.game.activeLevel.checkBarsComplete();
            }
            
            // Visual feedback
            console.log("Bar bent! Strength remaining:", this.strength);
        }
    }
    
    rescueNPC(npcMesh) {
        const npcData = npcMesh.metadata;
        
        // Show dialogue
        this.game.dialogue.show([
            { speaker: npcData.name, text: npcData.dialogue }
        ]);
        
        // Mark as rescued
        npcMesh.metadata.rescued = true;
        
        // Make NPC follow player (simplified - just hide for now)
        npcMesh.setEnabled(false);
        
        // Update objective
        if (this.game.activeLevel.checkRescueComplete) {
            this.game.activeLevel.checkRescueComplete();
        }
        
        console.log(`${npcData.name} rescued!`);
    }
    
    attack() {
        // Melee attack with enhanced strength
        const forward = new BABYLON.Vector3(
            Math.sin(this.game.inputManager.yaw),
            0,
            Math.cos(this.game.inputManager.yaw)
        );
        
        const origin = this.mesh.position.clone();
        const ray = new BABYLON.Ray(origin, forward, GAME.COMBAT.PUNCH_RANGE);
        
        // Check for enemies in range
        const damage = GAME.COMBAT.PUNCH_DAMAGE * (this.strength / 100);
        let hitEnemy = false;
        
        // Get enemies from active level
        if (this.game.activeLevel && this.game.activeLevel.enemies) {
            for (const enemy of this.game.activeLevel.enemies) {
                if (enemy.state === 'dead') continue;
                
                const dist = BABYLON.Vector3.Distance(origin, enemy.position);
                if (dist < GAME.COMBAT.PUNCH_RANGE) {
                    enemy.takeDamage(damage);
                    hitEnemy = true;
                    console.log(`Punched ${enemy.type} for ${damage} damage!`);
                }
            }
        }
        
        // Also check for damageable meshes
        const hit = this.scene.pickWithRay(ray, (mesh) => {
            return mesh.metadata && mesh.metadata.damageable;
        });
        
        if (hit.hit) {
            console.log(`Attack hit mesh for ${damage} damage!`);
        }
        
        // Play attack animation if available
        if (this.animController && this.animController.hasAnimation('attack')) {
            this.animController.play('attack', false, 1.5);
        } else if (this.visualMesh) {
            // Fallback punch animation on arms
            const rightArm = this.visualMesh.getChildMeshes().find(m => m.name === "rightArm");
            if (rightArm) {
                const punchAnim = new BABYLON.Animation(
                    "punch",
                    "rotation.x",
                    60,
                    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
                );
                punchAnim.setKeys([
                    { frame: 0, value: 0 },
                    { frame: 10, value: -Math.PI / 2 },
                    { frame: 20, value: 0 }
                ]);
                rightArm.animations = [punchAnim];
                this.scene.beginAnimation(rightArm, 0, 20, false);
            }
        }
        
        // Screen shake on hit
        if (hitEnemy) {
            this.game.camera.position.x += (Math.random() - 0.5) * 0.1;
            this.game.camera.position.y += (Math.random() - 0.5) * 0.1;
        }
        
        // Play punch sound
        if (this.game.soundSystem) {
            this.game.soundSystem.play('punch');
        }
    }
    
    // ═══════════════════════════════════════════════════════
    // WEAPON SYSTEM
    // ═══════════════════════════════════════════════════════
    
    shoot() {
        // Check if we have a weapon and ammo
        const weapon = this.inventory.currentWeapon;
        if (!weapon) {
            // No weapon - melee attack instead
            this.attack();
            return;
        }
        
        // Check cooldown
        if (this.shootCooldown && Date.now() < this.shootCooldown) {
            return;
        }
        
        // Check ammo
        if (!this.inventory.useAmmo(weapon, 1)) {
            // Out of ammo - click sound
            if (this.game.soundSystem) {
                this.game.soundSystem.play('click');
            }
            console.log(`Out of ${weapon} ammo!`);
            return;
        }
        
        // Weapon stats
        const weaponStats = {
            pistol: { damage: 25, range: 50, cooldown: 250, spread: 0.02 },
            rifle: { damage: 35, range: 100, cooldown: 100, spread: 0.01 },
            shotgun: { damage: 15, range: 20, cooldown: 800, spread: 0.15, pellets: 8 }
        };
        
        const stats = weaponStats[weapon] || weaponStats.pistol;
        this.shootCooldown = Date.now() + stats.cooldown;
        
        // Get forward direction from camera
        const forward = new BABYLON.Vector3(
            Math.sin(this.game.inputManager.yaw) * Math.cos(this.game.inputManager.pitch),
            Math.sin(this.game.inputManager.pitch),
            Math.cos(this.game.inputManager.yaw) * Math.cos(this.game.inputManager.pitch)
        );
        
        const origin = this.game.camera.position.clone();
        
        // Fire pellets (shotgun fires multiple)
        const pellets = stats.pellets || 1;
        let enemiesHit = new Set();
        
        for (let p = 0; p < pellets; p++) {
            // Add spread
            const spread = new BABYLON.Vector3(
                (Math.random() - 0.5) * stats.spread,
                (Math.random() - 0.5) * stats.spread,
                (Math.random() - 0.5) * stats.spread
            );
            const direction = forward.add(spread).normalize();
            
            // Create ray
            const ray = new BABYLON.Ray(origin, direction, stats.range);
            
            // Check for hits
            const hit = this.scene.pickWithRay(ray, (mesh) => {
                return mesh !== this.mesh && 
                       mesh !== this.visualMesh &&
                       mesh.isVisible !== false;
            });
            
            if (hit.hit) {
                // Create bullet impact
                this.createBulletImpact(hit.pickedPoint, hit.getNormal());
                
                // Check if enemy
                if (this.game.activeLevel && this.game.activeLevel.enemies) {
                    for (const enemy of this.game.activeLevel.enemies) {
                        if (enemy.state === 'dead') continue;
                        
                        const dist = BABYLON.Vector3.Distance(hit.pickedPoint, enemy.position);
                        if (dist < 2) { // Hit if within 2 units of enemy center
                            enemiesHit.add(enemy);
                        }
                    }
                }
            } else {
                // No hit - create tracer endpoint
                const endPoint = origin.add(direction.scale(stats.range));
                this.createBulletTracer(origin, endPoint);
            }
        }
        
        // Apply damage to all hit enemies
        enemiesHit.forEach(enemy => {
            enemy.takeDamage(stats.damage * (pellets > 1 ? 1 : 1));
            console.log(`Shot ${enemy.type} with ${weapon} for ${stats.damage} damage!`);
        });
        
        // Play weapon sound
        if (this.game.soundSystem) {
            this.game.soundSystem.play(weapon);
        }
        
        // Muzzle flash
        this.createMuzzleFlash();
        
        // Screen shake
        const shakeAmount = weapon === 'shotgun' ? 0.15 : weapon === 'rifle' ? 0.03 : 0.05;
        this.game.camera.position.y += shakeAmount;
        setTimeout(() => {
            this.game.camera.position.y -= shakeAmount;
        }, 50);
        
        // Update HUD
        this.updateInventoryHUD();
    }
    
    createBulletImpact(position, normal) {
        // Spark particles at impact
        const spark = BABYLON.MeshBuilder.CreateSphere("spark", { diameter: 0.1 }, this.scene);
        spark.position = position;
        
        const sparkMat = new BABYLON.StandardMaterial("sparkMat", this.scene);
        sparkMat.emissiveColor = new BABYLON.Color3(1, 0.8, 0.3);
        sparkMat.disableLighting = true;
        spark.material = sparkMat;
        
        // Fade out and remove
        let alpha = 1;
        const fadeInterval = setInterval(() => {
            alpha -= 0.1;
            sparkMat.alpha = alpha;
            if (alpha <= 0) {
                clearInterval(fadeInterval);
                spark.dispose();
            }
        }, 30);
        
        // Decal/crater (optional)
        if (normal) {
            const decal = BABYLON.MeshBuilder.CreateDisc("decal", { radius: 0.05 }, this.scene);
            decal.position = position.add(normal.scale(0.01));
            decal.lookAt(position.add(normal));
            
            const decalMat = new BABYLON.StandardMaterial("decalMat", this.scene);
            decalMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            decal.material = decalMat;
            
            // Remove after 10 seconds
            setTimeout(() => decal.dispose(), 10000);
        }
    }
    
    createBulletTracer(start, end) {
        // Quick line tracer
        const points = [start, end];
        const tracer = BABYLON.MeshBuilder.CreateLines("tracer", { points }, this.scene);
        tracer.color = new BABYLON.Color3(1, 0.9, 0.5);
        
        setTimeout(() => tracer.dispose(), 50);
    }
    
    createMuzzleFlash() {
        // Flash at gun position (first person = camera, third person = hand)
        const flashPos = this.firstPersonMode 
            ? this.game.camera.position.add(new BABYLON.Vector3(0.3, -0.2, 0.5))
            : this.mesh.position.add(new BABYLON.Vector3(0.4, 1.2, 0.3));
        
        const flash = BABYLON.MeshBuilder.CreateSphere("muzzleFlash", { diameter: 0.2 }, this.scene);
        flash.position = flashPos;
        
        const flashMat = new BABYLON.StandardMaterial("flashMat", this.scene);
        flashMat.emissiveColor = new BABYLON.Color3(1, 0.8, 0.3);
        flashMat.disableLighting = true;
        flash.material = flashMat;
        
        // Quick point light
        const flashLight = new BABYLON.PointLight("flashLight", flashPos, this.scene);
        flashLight.diffuse = new BABYLON.Color3(1, 0.7, 0.3);
        flashLight.intensity = 2;
        flashLight.range = 5;
        
        setTimeout(() => {
            flash.dispose();
            flashLight.dispose();
        }, 50);
    }
    
    switchWeapon(index) {
        const weapons = this.inventory.weapons;
        if (index >= 0 && index < weapons.length) {
            this.inventory.currentWeapon = weapons[index];
            this.currentWeapon = weapons[index];
            console.log(`Switched to ${this.currentWeapon}`);
            
            // Play switch sound
            if (this.game.soundSystem) {
                this.game.soundSystem.play('reload');
            }
            
            // Update HUD
            this.updateInventoryHUD();
        }
    }
    
    nextWeapon() {
        const weapons = this.inventory.weapons;
        if (weapons.length === 0) return;
        
        const currentIndex = weapons.indexOf(this.inventory.currentWeapon);
        const nextIndex = (currentIndex + 1) % weapons.length;
        this.switchWeapon(nextIndex);
    }
    
    prevWeapon() {
        const weapons = this.inventory.weapons;
        if (weapons.length === 0) return;
        
        const currentIndex = weapons.indexOf(this.inventory.currentWeapon);
        const prevIndex = (currentIndex - 1 + weapons.length) % weapons.length;
        this.switchWeapon(prevIndex);
    }
    
    reload() {
        // For future: reload from reserve ammo
        if (this.game.soundSystem) {
            this.game.soundSystem.play('reload');
        }
        console.log('Reloading...');
    }
    
    updateVisualMesh() {
        if (!this.visualMesh) return;
        
        // Don't update position/rotation when restrained (lying on bed)
        if (this.isRestrained) return;
        
        // Follow physics collider
        this.visualMesh.position.copyFrom(this.mesh.position);
        this.visualMesh.position.y -= 0.2; // Offset for visual
        
        // Stand upright and face movement direction; clear any rogue quaternion
        if (this.visualMesh.rotationQuaternion) this.visualMesh.rotationQuaternion = null;
        this.visualMesh.rotation.x = 0;
        this.visualMesh.rotation.z = 0;
        // Remove the +Math.PI offset - the corrective rotation in model loading already handles facing
        this.visualMesh.rotation.y = this.game.inputManager.yaw;
    }
    
    /**
     * Position Jake lying flat on the bed for the intro sequence
     * Bed: pillow at X=-2.8, foot end at X=-1.1, center Z=-2.5
     * Jake lies with head toward NORTH (pillow at X-), feet toward SOUTH (X+)
     */
    positionOnBed() {
        // Set restrained FIRST to prevent updateVisualMesh from overriding
        this.isRestrained = true;
        this.controlsEnabled = false;
        
        // Bed center position
        const bedCenterX = -2;
        const bedCenterZ = -2.5;
        const mattressTopY = 0.72;
        const lyingY = mattressTopY + 0.15;
        
        // Position physics collider at bed center
        this.mesh.position.set(bedCenterX, lyingY, bedCenterZ);
        
        // Disable physics velocity
        if (this.physicsAggregate && this.physicsAggregate.body) {
            this.physicsAggregate.body.setLinearVelocity(BABYLON.Vector3.Zero());
            this.physicsAggregate.body.setAngularVelocity(BABYLON.Vector3.Zero());
        }
        
        // Position and rotate visual mesh for lying down
        if (this.visualMesh) {
            // Position visual mesh at bed center. Use corrected visual offset
            // so the model sits properly on the pillow based on editor adjustments.
            // Apply the user-provided "correct" rotation so Jake lines up on the bed.
            const correctedY = 1.37; // Editor-captured correct Y for Jake's visual mesh
            this.visualMesh.position.set(bedCenterX, correctedY, bedCenterZ);
            
            // Use Euler rotations converted from degrees observed in editor
            const degToRad = (d) => d * Math.PI / 180;
            this.visualMesh.rotationQuaternion = null;  // Use Euler angles
            this.visualMesh.rotation.set(
                degToRad(341.1),   // X: 341.1°
                degToRad(46.4),    // Y: 46.4°
                degToRad(175.2)    // Z: 175.2°
            );
            
            // Also reset the root mesh's rotation so the model lies down
            const rootMesh = this.visualMesh.getChildren()[0];
            if (rootMesh) {
                // Clear quaternion and reset rotation to baked corrective rotation
                if (rootMesh.rotationQuaternion) {
                    rootMesh.rotationQuaternion = null;
                }
                // Keep the bind-pose correction: -90° on Y
                rootMesh.rotation.set(0, -Math.PI / 2, 0);
                // Ensure consistent visual offset so sit-up/stand transitions align
                rootMesh.position = new BABYLON.Vector3(0, -0.9, 0);
            }
            
            // Ensure visibility
            this.visualMesh.setEnabled(true);
            this.visualMesh.getChildMeshes().forEach(m => {
                m.isVisible = true;
                m.setEnabled(true);
            });
        } else {
            // Model not loaded yet - will be positioned when model loads
            console.log('⚠️ Visual mesh not ready yet - will position on bed after model loads');
        }
        
        // Force idle/lying animation to prevent arms-out/legs-bent pose
        if (this.animController) {
            const restingAnims = ['lying', 'idle', 'stand'];
            for (const animName of restingAnims) {
                if (this.animController.hasAnimation(animName)) {
                    this.animController.play(animName, true, 0.0); // Speed 0 = hold first frame
                    console.log(`🛏️ Set resting animation: ${animName}`);
                    break;
                }
            }
        }
        
        console.log('🛏️ Jake positioned on bed at:', this.mesh.position, 'rotation:', this.visualMesh?.rotation);
    }
    
    updateAnimations(velocity) {
        if (!this.animController) return;
        
        // Don't update animations while restrained (intro sequence handles it)
        if (this.isRestrained) return;
        
        // Calculate horizontal speed
        const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        this.lastMoveSpeed = horizontalSpeed;
        
        // Track animation state for smooth transitions
        const prevMoving = this.isMoving;
        
        // Determine animation state
        if (!this.isGrounded) {
            // In air
            if (velocity.y > 1) {
                // Jumping up
                if (this.animController.hasAnimation('jump')) {
                    this.animController.play('jump', false, 1.0);
                }
            } else if (velocity.y < -2) {
                // Falling
                if (this.animController.hasAnimation('fall')) {
                    this.animController.play('fall', true, 1.0);
                } else if (this.animController.hasAnimation('jump')) {
                    this.animController.play('jump', true, 0.5);
                }
            }
        } else if (horizontalSpeed > 0.5) {
            // Moving on ground
            this.isMoving = true;
            
            if (this.isSprinting && horizontalSpeed > 4) {
                // Running - use run animation or faster walk
                if (this.animController.hasAnimation('run')) {
                    this.animController.play('run', true, 1.0);
                } else if (this.animController.hasAnimation('walk')) {
                    // Speed up walk animation for running
                    this.animController.play('walk', true, 1.8);
                }
            } else if (this.isCrouching) {
                // Crouch walking
                if (this.animController.hasAnimation('crouch')) {
                    this.animController.play('crouch', true, 0.8);
                } else if (this.animController.hasAnimation('walk')) {
                    this.animController.play('walk', true, 0.5);
                }
            } else {
                // Normal walking - scale animation speed with movement speed
                const walkSpeed = Math.max(0.6, Math.min(horizontalSpeed / 3, 1.2));
                if (this.animController.hasAnimation('walk')) {
                    this.animController.play('walk', true, walkSpeed);
                }
            }
        } else {
            // Idle/stationary
            this.isMoving = false;
            
            if (this.isCrouching) {
                // Crouched idle
                if (this.animController.hasAnimation('crouch')) {
                    this.animController.play('crouch', true, 0.3);
                } else {
                    this.animController.play('idle', true, 1.0);
                }
            } else {
                // Standing idle
                if (this.animController.hasAnimation('idle')) {
                    this.animController.play('idle', true, 1.0);
                }
            }
        }
    }
    
    updateCamera(input) {
        const camera = this.game.camera;
        
        // Skip camera updates during intro cutscene (level controls camera)
        if (this.game.activeLevel && this.game.activeLevel.introCameraMode) {
            return;
        }
        
        // Skip camera updates during F9 editor when camera is selected
        if (this.game.debugEditorActive && this.game.debugTargets && this.game.debugTargets[this.game.debugTargetIndex]) {
            const selectedTarget = this.game.debugTargets[this.game.debugTargetIndex];
            if (selectedTarget.isCamera) {
                return; // Let F9 editor control camera position
            }
        }
        
        // ═══════════════════════════════════════════════════════════════════
        // CAMERA MODE SYSTEM - F1 cycles through views
        // ═══════════════════════════════════════════════════════════════════
        const cameraMode = this.cameraMode || 'third-person';
        
        // Security camera modes - don't update camera position (it's fixed)
        if (cameraMode === 'security-cam-1' || cameraMode === 'security-cam-2') {
            // Security cameras are static - just track the player
            const playerPos = this.mesh.position.clone();
            playerPos.y += 1;
            camera.setTarget(playerPos);
            return;
        }
        
        // Check if near computer for auto first-person mode
        this.checkNearComputer();
        
        const height = 1.5;
        const shoulderOffset = GAME.CAMERA.SHOULDER_OFFSET;
        
        // Player head position (camera target)
        const playerHead = this.mesh.position.clone();
        playerHead.y += height;
        
        // Determine if we're in first-person (either from mode or being near computer)
        const isFirstPerson = cameraMode === 'first-person' || this.nearComputer;
        
        // Apply keyboard turning (arrow left/right) to yaw
        // Allow arrow keys (or other mapped inputs) to rotate yaw
        const turnInput = input.getTurnInput ? input.getTurnInput() : 0;
        if (turnInput !== 0 && !this.isFrozen) {
            this.game.inputManager.yaw += turnInput;
        }
        
        if (isFirstPerson) {
            // Hide Jake's body in first person view
            if (this.visualMesh) {
                this.visualMesh.setEnabled(false);
            }
            // FIRST PERSON - camera at player's eyes
            const targetPos = playerHead.clone();
            
            // === WEAPON BOBBING (Q3 Style) ===
            // Track bob time
            if (!this.weaponBobTime) this.weaponBobTime = 0;
            
            // Calculate movement speed for bob intensity
            const velocity = this.physicsAggregate.body.getLinearVelocity();
            const moveSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
            
            // Only bob when moving on ground
            if (moveSpeed > 0.5 && this.isGrounded) {
                const bobSpeed = this.isSprinting ? 12 : 8; // Faster bob when sprinting
                const bobAmountY = this.isSprinting ? 0.04 : 0.025; // Vertical bob
                const bobAmountX = this.isSprinting ? 0.02 : 0.012; // Horizontal bob
                
                this.weaponBobTime += bobSpeed * 0.016; // ~60fps
                
                // Apply sinusoidal bob
                const bobY = Math.sin(this.weaponBobTime) * bobAmountY;
                const bobX = Math.sin(this.weaponBobTime * 0.5) * bobAmountX;
                
                targetPos.y += bobY;
                targetPos.x += bobX * Math.cos(input.yaw);
                targetPos.z += bobX * Math.sin(input.yaw);
            } else {
                // Slowly reset bob when stopped
                this.weaponBobTime *= 0.9;
            }
            
            camera.position = BABYLON.Vector3.Lerp(camera.position, targetPos, 0.15);
            
            const lookDistance = 5;
            const lookTarget = new BABYLON.Vector3(
                this.mesh.position.x + Math.sin(input.yaw) * lookDistance,
                playerHead.y + Math.sin(input.pitch) * lookDistance,
                this.mesh.position.z + Math.cos(input.yaw) * lookDistance
            );
            camera.setTarget(lookTarget);
            
        } else {
            // Show Jake's body in third person view
            if (this.visualMesh) {
                this.visualMesh.setEnabled(true);
            }
            
            // THIRD PERSON - Tomb Raider style camera with proper corner handling
            const maxDistance = GAME.CAMERA.DISTANCE;
            const minDistance = 1.0; // Never get closer than this
            const cameraRadius = 0.3; // Treat camera as sphere for collision
            
            // Calculate ideal camera position using spherical coordinates
            const verticalAngle = -input.pitch;
            
            // Calculate the ideal offset from player
            const idealOffset = new BABYLON.Vector3(
                -Math.sin(input.yaw) * Math.cos(verticalAngle) * maxDistance + Math.cos(input.yaw) * shoulderOffset,
                Math.sin(verticalAngle) * maxDistance + height,
                -Math.cos(input.yaw) * Math.cos(verticalAngle) * maxDistance - Math.sin(input.yaw) * shoulderOffset
            );
            
            const idealPos = this.mesh.position.add(idealOffset);
            
            // === IMPROVED TOMB RAIDER COLLISION ===
            // 1. Ray from player to camera
            // 2. Multiple rays in a sphere pattern around camera position
            // 3. Check if camera would be inside geometry
            
            const rayDirection = idealPos.subtract(playerHead).normalize();
            const rayLength = BABYLON.Vector3.Distance(playerHead, idealPos);
            
            let closestHitDist = rayLength;
            
            // Filter function for collision
            const collisionFilter = (mesh) => {
                return mesh !== this.mesh && 
                       mesh !== this.visualMesh && 
                       mesh.isVisible !== false &&
                       mesh.isPickable !== false &&
                       !mesh.name.includes('bar_') &&
                       !mesh.name.includes('collider') &&
                       !mesh.name.includes('trigger') &&
                       !mesh.name.includes('sensor');
            };
            
            // Primary ray from player head to ideal camera position
            const mainRay = new BABYLON.Ray(playerHead, rayDirection, rayLength + cameraRadius);
            const mainHit = this.scene.pickWithRay(mainRay, collisionFilter);
            
            if (mainHit.hit && mainHit.distance < closestHitDist) {
                closestHitDist = mainHit.distance - cameraRadius;
            }
            
            // Sphere of rays around camera path - checks for corners
            const numRays = 8;
            for (let i = 0; i < numRays; i++) {
                const angle = (i / numRays) * Math.PI * 2;
                const perpOffset = new BABYLON.Vector3(
                    Math.cos(angle) * cameraRadius,
                    Math.sin(angle) * cameraRadius * 0.5, // Flatten vertically
                    Math.sin(angle) * cameraRadius
                );
                
                const offsetOrigin = playerHead.add(perpOffset);
                const offsetRay = new BABYLON.Ray(offsetOrigin, rayDirection, rayLength + cameraRadius);
                const offsetHit = this.scene.pickWithRay(offsetRay, collisionFilter);
                
                if (offsetHit.hit && offsetHit.distance < closestHitDist) {
                    closestHitDist = offsetHit.distance - cameraRadius;
                }
            }
            
            // Also cast rays BACKWARD from ideal camera position to check if inside geometry
            const backwardDirections = [
                new BABYLON.Vector3(1, 0, 0), new BABYLON.Vector3(-1, 0, 0),
                new BABYLON.Vector3(0, 1, 0), new BABYLON.Vector3(0, -1, 0),
                new BABYLON.Vector3(0, 0, 1), new BABYLON.Vector3(0, 0, -1)
            ];
            
            for (const dir of backwardDirections) {
                const backRay = new BABYLON.Ray(idealPos, dir, cameraRadius * 2);
                const backHit = this.scene.pickWithRay(backRay, collisionFilter);
                
                if (backHit.hit && backHit.distance < cameraRadius) {
                    // Camera would be inside geometry - push back
                    const pushBackDist = maxDistance - (rayLength - (cameraRadius - backHit.distance));
                    closestHitDist = Math.min(closestHitDist, pushBackDist);
                }
            }
            
            // Calculate safe distance (never less than minimum)
            const safeDistance = Math.max(minDistance, Math.min(closestHitDist, maxDistance));
            
            // Store previous distance for smooth transitions
            if (!this.lastCameraDistance) this.lastCameraDistance = maxDistance;
            
            // Smoothly interpolate distance - faster when close to walls
            const distanceRatio = safeDistance / maxDistance;
            const distanceLerpSpeed = distanceRatio < 0.5 ? 0.25 : 0.1;
            const smoothDistance = BABYLON.Scalar.Lerp(this.lastCameraDistance, safeDistance, distanceLerpSpeed);
            this.lastCameraDistance = smoothDistance;
            
            // Calculate camera position with smoothed distance
            const smoothOffset = new BABYLON.Vector3(
                -Math.sin(input.yaw) * Math.cos(verticalAngle) * smoothDistance + Math.cos(input.yaw) * shoulderOffset,
                Math.sin(verticalAngle) * smoothDistance + height,
                -Math.cos(input.yaw) * Math.cos(verticalAngle) * smoothDistance - Math.sin(input.yaw) * shoulderOffset
            );
            
            const targetPos = this.mesh.position.add(smoothOffset);
            
            // Smooth camera position
            const posLerpSpeed = distanceRatio < 0.5 ? 0.35 : 0.15;
            camera.position = BABYLON.Vector3.Lerp(camera.position, targetPos, posLerpSpeed);
            
            // Camera looks at player head
            camera.setTarget(playerHead);
        }
    }
    
    checkNearComputer() {
        // Check distance to computer screen if it exists
        if (this.game.activeLevel && this.game.activeLevel.computerScreen) {
            const computerPos = this.game.activeLevel.computerScreen.position;
            const playerPos = this.mesh.position;
            const distance = BABYLON.Vector3.Distance(playerPos, computerPos);
            
            // Switch to first person when within 1.5 units of computer
            this.nearComputer = distance < 1.5;
            this.firstPersonMode = this.nearComputer;
        } else {
            this.nearComputer = false;
            this.firstPersonMode = false;
        }
    }
    
    setPosition(pos) {
        this.mesh.position = pos.clone();
        this.physicsAggregate.body.setLinearVelocity(BABYLON.Vector3.Zero());
    }
    
    takeDamage(amount) {
        // IDDQD - God Mode protection
        if (this.godMode) {
            // Flash gold instead of red to show god mode blocked damage
            if (this.visualMesh) {
                this.visualMesh.getChildMeshes().forEach(child => {
                    if (child.material) {
                        const origEmissive = child.material.emissiveColor?.clone();
                        child.material.emissiveColor = new BABYLON.Color3(1, 0.8, 0);
                        setTimeout(() => {
                            if (child.material) {
                                child.material.emissiveColor = origEmissive || new BABYLON.Color3(0, 0, 0);
                            }
                        }, 100);
                    }
                });
            }
            console.log(`God mode blocked ${amount} damage!`);
            return;
        }
        
        // Apply armor reduction first
        if (this.armor > 0) {
            const armorAbsorb = Math.min(this.armor, amount * 0.5);
            this.armor -= armorAbsorb;
            this.inventory.armor = this.armor;
            amount -= armorAbsorb;
        }
        
        this.health = Math.max(0, this.health - amount);
        this.inventory.health = this.health;
        
        // Flash red on damage
        if (this.visualMesh && amount > 0) {
            this.visualMesh.getChildMeshes().forEach(child => {
                if (child.material) {
                    const origEmissive = child.material.emissiveColor?.clone();
                    child.material.emissiveColor = new BABYLON.Color3(1, 0, 0);
                    setTimeout(() => {
                        if (child.material) {
                            child.material.emissiveColor = origEmissive || new BABYLON.Color3(0, 0, 0);
                        }
                    }, 150);
                }
            });
        }
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    die() {
        console.log("Player died!");
        // Respawn logic would go here
    }
}
