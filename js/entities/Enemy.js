/* ============================================================================
   ESCAPE LAB 48 - BABYLON.JS EDITION
   Enemy - Base enemy class with AI
   ============================================================================ */

class Enemy {
    constructor(scene, type, position) {
        this.scene = scene;
        this.type = type;
        this.position = position.clone();
        this.mesh = null;
        this.health = 100;
        this.maxHealth = 100;
        this.damage = 20;
        this.speed = 2;
        this.detectionRange = 15;
        this.attackRange = 3;
        this.attackCooldown = 0;
        
        this.state = 'patrol'; // patrol, chase, attack, dead
        this.patrolPoints = [];
        this.currentPatrolIndex = 0;
        this.targetPosition = null;
        
        this.physicsAggregate = null;
    }
    
    async init(modelLoader) {
        // Override in subclasses
    }
    
    update(deltaTime, player) {
        if (this.state === 'dead') return;
        
        this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);
        
        const distToPlayer = this.getDistanceToPlayer(player);
        
        // State machine
        switch (this.state) {
            case 'patrol':
                this.updatePatrol(deltaTime);
                if (distToPlayer < this.detectionRange) {
                    this.state = 'chase';
                }
                break;
                
            case 'chase':
                this.updateChase(deltaTime, player);
                if (distToPlayer < this.attackRange) {
                    this.state = 'attack';
                } else if (distToPlayer > this.detectionRange * 1.5) {
                    this.state = 'patrol';
                }
                break;
                
            case 'attack':
                this.updateAttack(deltaTime, player);
                if (distToPlayer > this.attackRange * 1.5) {
                    this.state = 'chase';
                }
                break;
        }
        
        // Update mesh position
        if (this.mesh) {
            this.mesh.position.copyFrom(this.position);
        }
    }
    
    getDistanceToPlayer(player) {
        if (!player || !player.mesh) return Infinity;
        return BABYLON.Vector3.Distance(this.position, player.mesh.position);
    }
    
    updatePatrol(deltaTime) {
        if (this.patrolPoints.length === 0) return;
        
        const target = this.patrolPoints[this.currentPatrolIndex];
        const direction = target.subtract(this.position);
        direction.y = 0; // Stay on ground
        
        if (direction.length() < 0.5) {
            this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
        } else {
            direction.normalize();
            this.position.addInPlace(direction.scale(this.speed * 0.5 * deltaTime));
            
            // Face movement direction
            if (this.mesh) {
                this.mesh.rotation.y = Math.atan2(direction.x, direction.z);
            }
        }
        
        // Play walk animation
        if (this.animController) {
            this.animController.play('walk', true, 0.8);
        }
    }
    
    updateChase(deltaTime, player) {
        if (!player || !player.mesh) return;
        
        const direction = player.mesh.position.subtract(this.position);
        direction.y = 0;
        
        if (direction.length() > 0.1) {
            direction.normalize();
            this.position.addInPlace(direction.scale(this.speed * deltaTime));
            
            if (this.mesh) {
                this.mesh.rotation.y = Math.atan2(direction.x, direction.z);
            }
        }
        
        // Play run animation when chasing
        if (this.animController) {
            if (this.animController.hasAnimation('run')) {
                this.animController.play('run', true, 1.2);
            } else {
                this.animController.play('walk', true, 1.5);
            }
        }
    }
    
    updateAttack(deltaTime, player) {
        if (!player) return;
        
        // Face player
        if (this.mesh && player.mesh) {
            const direction = player.mesh.position.subtract(this.position);
            this.mesh.rotation.y = Math.atan2(direction.x, direction.z);
        }
        
        // Attack if cooldown ready
        if (this.attackCooldown <= 0) {
            this.attack(player);
            this.attackCooldown = 1.5; // 1.5 second cooldown
        } else {
            // Play idle while waiting for cooldown
            if (this.animController && this.animController.hasAnimation('idle')) {
                this.animController.play('idle', true);
            }
        }
    }
    
    attack(player) {
        console.log(`${this.type} attacks for ${this.damage} damage!`);
        
        // Play attack animation
        if (this.animController && this.animController.hasAnimation('attack')) {
            this.animController.play('attack', false, 1.5);
        }
        
        if (player) {
            player.takeDamage(this.damage);
        }
    }
    
    takeDamage(amount) {
        this.health -= amount;
        console.log(`${this.type} takes ${amount} damage! HP: ${this.health}/${this.maxHealth}`);
        
        // Flash red
        if (this.mesh) {
            this.mesh.getChildMeshes().forEach(child => {
                if (child.material) {
                    const origColor = child.material.diffuseColor?.clone();
                    child.material.emissiveColor = new BABYLON.Color3(1, 0, 0);
                    
                    setTimeout(() => {
                        if (child.material) {
                            child.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
                        }
                    }, 100);
                }
            });
        }
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    die() {
        this.state = 'dead';
        console.log(`${this.type} defeated!`);
        
        // Death animation
        if (this.mesh) {
            // Fade out and fall
            const deathAnim = new BABYLON.Animation(
                "death",
                "position.y",
                30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            
            deathAnim.setKeys([
                { frame: 0, value: this.mesh.position.y },
                { frame: 30, value: this.mesh.position.y - 1 }
            ]);
            
            this.mesh.animations.push(deathAnim);
            this.scene.beginAnimation(this.mesh, 0, 30, false, 1, () => {
                this.mesh.dispose();
            });
        }
    }
    
    setPatrolPoints(points) {
        this.patrolPoints = points;
    }
    
    dispose() {
        if (this.mesh) {
            this.mesh.dispose();
        }
        if (this.physicsAggregate) {
            this.physicsAggregate.dispose();
        }
    }
}


/* ============================================================================
   GUARD - Human Enemy NPC
   ============================================================================ */

class Guard extends Enemy {
    constructor(scene, position) {
        super(scene, 'guard', position);
        this.health = 150;
        this.maxHealth = 150;
        this.damage = 25;
        this.speed = 3;
        this.detectionRange = 12;
        this.attackRange = 2.5;
        this.modelLoaded = false;
        this.animController = null;
        this.modelNode = null;
    }
    
    async init(modelLoader) {
        // Create guard container
        this.mesh = new BABYLON.TransformNode("guard", this.scene);
        this.mesh.position = this.position.clone();
        
        // Try to load GLB model
        if (modelLoader) {
            try {
                const result = await BABYLON.SceneLoader.ImportMeshAsync(
                    "", "assets/models/guard/", "Guard.glb", this.scene
                );
                
                if (result.meshes.length > 0) {
                    const rootMesh = result.meshes[0];
                    rootMesh.parent = this.mesh;
                    rootMesh.scaling = new BABYLON.Vector3(1.0, 1.0, 1.0); // Adjust as needed
                    rootMesh.position = BABYLON.Vector3.Zero();
                    this.modelNode = rootMesh;
                    
                    // Make all meshes visible and add shadows
                    result.meshes.forEach(child => {
                        child.isVisible = true;
                        if (this.game && this.game.shadowGenerator) {
                            this.game.shadowGenerator.addShadowCaster(child);
                        }
                    });
                    
                    // Setup animations from GLB
                    this.animationGroups = new Map();
                    result.animationGroups.forEach(ag => {
                        const normalizedName = this.normalizeAnimationName(ag.name);
                        this.animationGroups.set(normalizedName, ag);
                        ag.stop();
                        console.log(`  🎬 Guard anim: ${normalizedName}: ${ag.name}`);
                    });
                    
                    // Create animation controller
                    this.animController = {
                        currentAnimation: null,
                        play: (name, loop = true, speed = 1.0) => {
                            const norm = this.normalizeAnimationName(name);
                            const ag = this.animationGroups.get(norm) || this.animationGroups.get(name);
                            if (!ag) return false;
                            if (this.animController.currentAnimation) {
                                this.animationGroups.forEach(a => a.stop());
                            }
                            ag.speedRatio = speed;
                            ag.start(loop, speed);
                            this.animController.currentAnimation = norm;
                            return true;
                        },
                        stop: () => {
                            this.animationGroups.forEach(a => a.stop());
                            this.animController.currentAnimation = null;
                        },
                        hasAnimation: (name) => {
                            const norm = this.normalizeAnimationName(name);
                            return this.animationGroups.has(norm) || this.animationGroups.has(name);
                        },
                        getAnimationNames: () => Array.from(this.animationGroups.keys())
                    };
                    
                    console.log('🎬 Guard animations:', this.animController.getAnimationNames());
                    
                    // Start with idle
                    if (this.animController.hasAnimation('idle')) {
                        this.animController.play('idle', true);
                    }
                    
                    this.modelLoaded = true;
                    console.log(`✅ Guard GLB loaded: ${result.meshes.length} meshes, ${result.animationGroups.length} animations`);
                    return;
                }
            } catch (e) {
                console.warn('Could not load Guard GLB, using fallback:', e.message);
            }
        }
        
        // Fallback to procedural mesh
        this.createFallbackMesh();
        this.addIdleAnimation();
    }
    
    // Normalize animation names from Mixamo format
    normalizeAnimationName(name) {
        if (!name) return 'unknown';
        const lower = name.toLowerCase();
        if (lower.includes('idle') || lower.includes('breathing')) return 'idle';
        if (lower.includes('walk')) return 'walk';
        if (lower.includes('run')) return 'run';
        if (lower.includes('attack') || lower.includes('punch') || lower.includes('hit')) return 'attack';
        if (lower.includes('die') || lower.includes('death')) return 'die';
        if (lower.includes('patrol')) return 'patrol';
        if (lower.includes('alert')) return 'alert';
        return lower.replace(/[^a-z0-9]/g, '_');
    }
    
    createFallbackMesh() {
        // Body
        const body = BABYLON.MeshBuilder.CreateCapsule("guardBody", {
            height: 1.6,
            radius: 0.35
        }, this.scene);
        body.position.y = 0.9;
        
        const bodyMat = new BABYLON.StandardMaterial("guardBodyMat", this.scene);
        bodyMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.25); // Dark uniform
        body.material = bodyMat;
        body.parent = this.mesh;
        
        // Head
        const head = BABYLON.MeshBuilder.CreateSphere("guardHead", {
            diameter: 0.35
        }, this.scene);
        head.position.y = 1.85;
        
        const headMat = new BABYLON.StandardMaterial("guardHeadMat", this.scene);
        headMat.diffuseColor = new BABYLON.Color3(0.9, 0.75, 0.6);
        head.material = headMat;
        head.parent = this.mesh;
        
        // Helmet
        const helmet = BABYLON.MeshBuilder.CreateSphere("guardHelmet", {
            diameter: 0.4,
            slice: 0.6
        }, this.scene);
        helmet.position.y = 1.9;
        
        const helmetMat = new BABYLON.StandardMaterial("guardHelmetMat", this.scene);
        helmetMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.15);
        helmetMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        helmet.material = helmetMat;
        helmet.parent = this.mesh;
        
        // Visor (red glow)
        const visor = BABYLON.MeshBuilder.CreateBox("guardVisor", {
            width: 0.3,
            height: 0.08,
            depth: 0.1
        }, this.scene);
        visor.position.set(0, 1.85, 0.18);
        
        const visorMat = new BABYLON.StandardMaterial("visorMat", this.scene);
        visorMat.diffuseColor = new BABYLON.Color3(1, 0, 0);
        visorMat.emissiveColor = new BABYLON.Color3(0.8, 0, 0);
        visor.material = visorMat;
        visor.parent = this.mesh;
        
        // Weapon (baton)
        const weapon = BABYLON.MeshBuilder.CreateCylinder("guardWeapon", {
            height: 0.6,
            diameter: 0.05
        }, this.scene);
        weapon.position.set(0.4, 0.7, 0);
        weapon.rotation.z = Math.PI / 4;
        
        const weaponMat = new BABYLON.StandardMaterial("weaponMat", this.scene);
        weaponMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        weapon.material = weaponMat;
        weapon.parent = this.mesh;
    }
    
    addIdleAnimation() {
        const idle = new BABYLON.Animation(
            "guardIdle",
            "position.y",
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const baseY = this.position.y;
        idle.setKeys([
            { frame: 0, value: baseY },
            { frame: 30, value: baseY + 0.03 },
            { frame: 60, value: baseY }
        ]);
        
        this.mesh.animations.push(idle);
        this.scene.beginAnimation(this.mesh, 0, 60, true);
    }
}


/* ============================================================================
   DRONE - Flying Enemy Robot
   ============================================================================ */

class Drone extends Enemy {
    constructor(scene, position) {
        super(scene, 'drone', position);
        this.health = 80;
        this.maxHealth = 80;
        this.damage = 15;
        this.speed = 5;
        this.detectionRange = 20;
        this.attackRange = 10; // Ranged attack
        
        this.hoverHeight = 3;
        this.hoverOffset = 0;
        this.rotorSpeed = 0;
        
        this.rotorBlades = [];
        this.eyeLight = null;
        this.spotlight = null;
        this.modelLoaded = false;
        this.animController = null;
        this.modelNode = null;
    }
    
    async init(modelLoader) {
        // Create drone container
        this.mesh = new BABYLON.TransformNode("drone", this.scene);
        this.mesh.position = this.position.clone();
        this.mesh.position.y += this.hoverHeight;
        
        // Try to load the FBX model
        if (modelLoader) {
            try {
                const model = await modelLoader.loadModel('drone', 'assets/models/enemies/drone/lod_basic_pbr.fbx');
                if (model) {
                    model.parent = this.mesh;
                    model.scaling = new BABYLON.Vector3(0.02, 0.02, 0.02); // Scale down FBX
                    model.position = BABYLON.Vector3.Zero();
                    this.modelNode = model;
                    
                    // Apply PBR textures to all meshes
                    const texturePath = 'assets/textures/enemies/drone/';
                    model.getChildMeshes().forEach(child => {
                        child.isVisible = true;
                        
                        // Create PBR material with textures
                        const pbrMat = new BABYLON.PBRMaterial("dronePBR_" + child.name, this.scene);
                        pbrMat.albedoTexture = new BABYLON.Texture(texturePath + "texture_diffuse.png", this.scene);
                        pbrMat.metallicTexture = new BABYLON.Texture(texturePath + "texture_metallic.png", this.scene);
                        pbrMat.bumpTexture = new BABYLON.Texture(texturePath + "texture_normal.png", this.scene);
                        pbrMat.useRoughnessFromMetallicTextureAlpha = false;
                        pbrMat.useRoughnessFromMetallicTextureGreen = true;
                        pbrMat.microSurfaceTexture = new BABYLON.Texture(texturePath + "texture_roughness.png", this.scene);
                        
                        child.material = pbrMat;
                    });
                    
                    // Setup animation controller
                    this.animController = new AnimationController(model);
                    console.log('🎬 Drone animations:', this.animController.getAnimationNames());
                    
                    // Start with fly/hover animation
                    if (this.animController.hasAnimation('fly')) {
                        this.animController.play('fly', true);
                    } else if (this.animController.hasAnimation('idle')) {
                        this.animController.play('idle', true);
                    }
                    
                    this.modelLoaded = true;
                    console.log('✅ Drone FBX model loaded with PBR textures and animations');
                    
                    // Add glow light
                    this.eyeLight = new BABYLON.PointLight("droneLight", BABYLON.Vector3.Zero(), this.scene);
                    this.eyeLight.diffuse = new BABYLON.Color3(1, 0, 0);
                    this.eyeLight.intensity = 0.5;
                    this.eyeLight.range = 5;
                    this.eyeLight.parent = this.mesh;
                    
                    return;
                }
            } catch (e) {
                console.warn('Could not load drone FBX, using fallback:', e);
            }
        }
        
        // Fallback to procedural mesh
        this.createFallbackMesh();
    }
    
    createFallbackMesh() {
        // === MAIN BODY ===
        const body = BABYLON.MeshBuilder.CreateCapsule("droneBody", {
            height: 0.8,
            radius: 0.3
        }, this.scene);
        body.rotation.z = Math.PI / 2;
        
        const bodyMat = new BABYLON.StandardMaterial("droneBodyMat", this.scene);
        bodyMat.diffuseColor = new BABYLON.Color3(0.15, 0.2, 0.25);
        bodyMat.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        bodyMat.specularPower = 64;
        body.material = bodyMat;
        body.parent = this.mesh;
        
        // === ARMORED SHELL ===
        const shell = BABYLON.MeshBuilder.CreateSphere("droneShell", {
            diameter: 0.7,
            slice: 0.5
        }, this.scene);
        shell.position.y = 0.1;
        shell.scaling = new BABYLON.Vector3(1, 0.5, 0.8);
        
        const shellMat = new BABYLON.StandardMaterial("droneShellMat", this.scene);
        shellMat.diffuseColor = new BABYLON.Color3(0.25, 0.3, 0.35);
        shellMat.specularColor = new BABYLON.Color3(1, 1, 1);
        shell.material = shellMat;
        shell.parent = this.mesh;
        
        // === SENSOR EYE ===
        const eye = BABYLON.MeshBuilder.CreateSphere("droneEye", {
            diameter: 0.2
        }, this.scene);
        eye.position.set(0.5, 0, 0);
        
        const eyeMat = new BABYLON.StandardMaterial("droneEyeMat", this.scene);
        eyeMat.diffuseColor = new BABYLON.Color3(1, 0, 0);
        eyeMat.emissiveColor = new BABYLON.Color3(1, 0, 0);
        eye.material = eyeMat;
        eye.parent = this.mesh;
        
        // Eye glow light
        this.eyeLight = new BABYLON.PointLight("droneEyeLight", new BABYLON.Vector3(0.5, 0, 0), this.scene);
        this.eyeLight.diffuse = new BABYLON.Color3(1, 0, 0);
        this.eyeLight.intensity = 0.5;
        this.eyeLight.range = 5;
        this.eyeLight.parent = this.mesh;
        
        // === ROTOR ARMS ===
        const armPositions = [
            { x: 0.2, z: 0.5 },
            { x: 0.2, z: -0.5 },
            { x: -0.3, z: 0.5 },
            { x: -0.3, z: -0.5 }
        ];
        
        const armMat = new BABYLON.StandardMaterial("armMat", this.scene);
        armMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        
        armPositions.forEach((pos, i) => {
            // Arm
            const arm = BABYLON.MeshBuilder.CreateCylinder(`arm_${i}`, {
                height: 0.5,
                diameter: 0.04
            }, this.scene);
            arm.rotation.x = Math.PI / 2;
            arm.position.set(pos.x, 0.15, pos.z * 0.5);
            arm.material = armMat;
            arm.parent = this.mesh;
            
            // Rotor hub
            const hub = BABYLON.MeshBuilder.CreateCylinder(`hub_${i}`, {
                height: 0.08,
                diameter: 0.12
            }, this.scene);
            hub.position.set(pos.x, 0.15, pos.z);
            hub.material = armMat;
            hub.parent = this.mesh;
            
            // Rotor blades
            const blade = BABYLON.MeshBuilder.CreateBox(`blade_${i}`, {
                width: 0.6,
                height: 0.02,
                depth: 0.08
            }, this.scene);
            blade.position.set(pos.x, 0.2, pos.z);
            
            const bladeMat = new BABYLON.StandardMaterial(`bladeMat_${i}`, this.scene);
            bladeMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
            bladeMat.alpha = 0.7;
            blade.material = bladeMat;
            blade.parent = this.mesh;
            
            this.rotorBlades.push(blade);
            
            // Rotor glow
            const glow = BABYLON.MeshBuilder.CreateTorus(`glow_${i}`, {
                diameter: 0.5,
                thickness: 0.02
            }, this.scene);
            glow.position.set(pos.x, 0.2, pos.z);
            glow.rotation.x = Math.PI / 2;
            
            const glowMat = new BABYLON.StandardMaterial(`glowMat_${i}`, this.scene);
            glowMat.diffuseColor = new BABYLON.Color3(0, 0.5, 1);
            glowMat.emissiveColor = new BABYLON.Color3(0, 0.3, 0.6);
            glowMat.alpha = 0.5;
            glow.material = glowMat;
            glow.parent = this.mesh;
        });
        
        // === SPOTLIGHT ===
        this.spotlight = new BABYLON.SpotLight(
            "droneSpotlight",
            new BABYLON.Vector3(0, -0.2, 0),
            new BABYLON.Vector3(0, -1, 0),
            Math.PI / 4,
            2,
            this.scene
        );
        this.spotlight.intensity = 1;
        this.spotlight.diffuse = new BABYLON.Color3(1, 1, 0.8);
        this.spotlight.range = 15;
        this.spotlight.parent = this.mesh;
        
        // Spotlight cone (visible)
        const spotCone = BABYLON.MeshBuilder.CreateCylinder("spotCone", {
            height: 4,
            diameterTop: 0,
            diameterBottom: 2
        }, this.scene);
        spotCone.position.y = -2.2;
        
        const spotConeMat = new BABYLON.StandardMaterial("spotConeMat", this.scene);
        spotConeMat.diffuseColor = new BABYLON.Color3(1, 1, 0.7);
        spotConeMat.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.1);
        spotConeMat.alpha = 0.1;
        spotCone.material = spotConeMat;
        spotCone.parent = this.mesh;
        
        // === WEAPON PODS ===
        const weaponMat = new BABYLON.StandardMaterial("weaponMat", this.scene);
        weaponMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.15);
        
        [-0.35, 0.35].forEach((z, i) => {
            const weapon = BABYLON.MeshBuilder.CreateBox(`weapon_${i}`, {
                width: 0.15,
                height: 0.08,
                depth: 0.25
            }, this.scene);
            weapon.position.set(0, -0.1, z);
            weapon.material = weaponMat;
            weapon.parent = this.mesh;
            
            // Barrel
            const barrel = BABYLON.MeshBuilder.CreateCylinder(`barrel_${i}`, {
                height: 0.15,
                diameter: 0.04
            }, this.scene);
            barrel.rotation.z = Math.PI / 2;
            barrel.position.set(0.12, -0.1, z);
            barrel.material = weaponMat;
            barrel.parent = this.mesh;
        });
    }
    
    update(deltaTime, player) {
        if (this.state === 'dead') return;
        
        // Spin rotors
        this.rotorSpeed += deltaTime * 20;
        this.rotorBlades.forEach((blade, i) => {
            blade.rotation.y = this.rotorSpeed * (i % 2 === 0 ? 1 : -1);
        });
        
        // Hover bob
        this.hoverOffset = Math.sin(Date.now() * 0.003) * 0.3;
        
        // Call parent update
        super.update(deltaTime, player);
        
        // Update Y position for hover
        if (this.mesh) {
            this.mesh.position.y = this.position.y + this.hoverHeight + this.hoverOffset;
        }
        
        // Spotlight sweep when patrolling
        if (this.state === 'patrol' && this.spotlight) {
            const sweepAngle = Math.sin(Date.now() * 0.001) * 0.5;
            this.spotlight.direction.x = Math.sin(sweepAngle);
            this.spotlight.direction.z = Math.cos(sweepAngle) * 0.3;
        }
        
        // Eye pulse when alert
        if (this.eyeLight) {
            if (this.state === 'chase' || this.state === 'attack') {
                this.eyeLight.intensity = 1 + Math.sin(Date.now() * 0.01) * 0.5;
            } else {
                this.eyeLight.intensity = 0.5;
            }
        }
    }
    
    attack(player) {
        console.log("Drone fires laser!");
        
        // Visual: laser beam
        if (player && player.mesh && this.mesh) {
            const start = this.mesh.position.clone();
            const end = player.mesh.position.clone();
            end.y += 1; // Aim at center mass
            
            const distance = BABYLON.Vector3.Distance(start, end);
            const direction = end.subtract(start).normalize();
            
            // Create laser beam
            const laser = BABYLON.MeshBuilder.CreateCylinder("laser", {
                height: distance,
                diameter: 0.05
            }, this.scene);
            
            const laserMat = new BABYLON.StandardMaterial("laserMat", this.scene);
            laserMat.diffuseColor = new BABYLON.Color3(1, 0, 0);
            laserMat.emissiveColor = new BABYLON.Color3(1, 0, 0);
            laser.material = laserMat;
            
            // Position and rotate laser
            const midPoint = start.add(end).scale(0.5);
            laser.position = midPoint;
            laser.lookAt(end);
            laser.rotation.x += Math.PI / 2;
            
            // Fade out laser
            setTimeout(() => {
                laser.dispose();
            }, 100);
            
            // Deal damage
            player.takeDamage(this.damage);
        }
    }
}


/* ============================================================================
   TURRET - Stationary Defense System
   ============================================================================ */

class Turret extends Enemy {
    constructor(scene, position) {
        super(scene, 'turret', position);
        this.health = 200;
        this.maxHealth = 200;
        this.damage = 20;
        this.speed = 0; // Stationary!
        this.detectionRange = 25;
        this.attackRange = 25;
        this.fireRate = 0.15; // Fast firing
        this.barrelRotation = 0;
        this.targetingSpeed = 2;
    }
    
    async init(modelLoader) {
        this.mesh = new BABYLON.TransformNode("turret", this.scene);
        this.mesh.position = this.position.clone();
        
        // Base platform
        const base = BABYLON.MeshBuilder.CreateCylinder("turretBase", {
            height: 0.3,
            diameter: 1.5
        }, this.scene);
        base.position.y = 0.15;
        
        const baseMat = new BABYLON.StandardMaterial("turretBaseMat", this.scene);
        baseMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.25);
        baseMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        base.material = baseMat;
        base.parent = this.mesh;
        
        // Rotating body
        this.turretBody = new BABYLON.TransformNode("turretBody", this.scene);
        this.turretBody.position.y = 0.5;
        this.turretBody.parent = this.mesh;
        
        const body = BABYLON.MeshBuilder.CreateBox("turretBodyMesh", {
            width: 0.8,
            height: 0.6,
            depth: 0.8
        }, this.scene);
        
        const bodyMat = new BABYLON.StandardMaterial("turretBodyMat", this.scene);
        bodyMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.35);
        body.material = bodyMat;
        body.parent = this.turretBody;
        
        // Gun barrels (twin)
        const barrelMat = new BABYLON.StandardMaterial("barrelMat", this.scene);
        barrelMat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.15);
        
        this.barrels = [];
        [-0.2, 0.2].forEach((offset, i) => {
            const barrel = BABYLON.MeshBuilder.CreateCylinder(`barrel_${i}`, {
                height: 1.2,
                diameter: 0.12
            }, this.scene);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(offset, 0, 0.8);
            barrel.material = barrelMat;
            barrel.parent = this.turretBody;
            this.barrels.push(barrel);
        });
        
        // Sensor eye
        const eye = BABYLON.MeshBuilder.CreateSphere("turretEye", { diameter: 0.25 }, this.scene);
        eye.position.set(0, 0.4, 0.3);
        
        const eyeMat = new BABYLON.StandardMaterial("turretEyeMat", this.scene);
        eyeMat.diffuseColor = new BABYLON.Color3(1, 0, 0);
        eyeMat.emissiveColor = new BABYLON.Color3(0.8, 0, 0);
        eye.material = eyeMat;
        eye.parent = this.turretBody;
        
        // Eye light
        this.eyeLight = new BABYLON.PointLight("turretLight", new BABYLON.Vector3(0, 0.4, 0.3), this.scene);
        this.eyeLight.diffuse = new BABYLON.Color3(1, 0, 0);
        this.eyeLight.intensity = 0.5;
        this.eyeLight.range = 8;
        this.eyeLight.parent = this.turretBody;
        
        // Targeting laser
        this.laserSight = BABYLON.MeshBuilder.CreateCylinder("laserSight", {
            height: 20,
            diameter: 0.02
        }, this.scene);
        this.laserSight.rotation.x = Math.PI / 2;
        this.laserSight.position.z = 10;
        
        const laserMat = new BABYLON.StandardMaterial("laserSightMat", this.scene);
        laserMat.diffuseColor = new BABYLON.Color3(1, 0, 0);
        laserMat.emissiveColor = new BABYLON.Color3(1, 0, 0);
        laserMat.alpha = 0.3;
        this.laserSight.material = laserMat;
        this.laserSight.parent = this.turretBody;
    }
    
    updatePatrol(deltaTime) {
        // Turrets don't patrol - they scan
        this.turretBody.rotation.y += deltaTime * 0.5;
        
        // Pulse the eye
        if (this.eyeLight) {
            this.eyeLight.intensity = 0.3 + Math.sin(Date.now() * 0.005) * 0.2;
        }
    }
    
    updateChase(deltaTime, player) {
        // Track player
        if (player && player.mesh && this.turretBody) {
            const direction = player.mesh.position.subtract(this.mesh.position);
            const targetAngle = Math.atan2(direction.x, direction.z);
            
            // Smooth rotation toward target
            let angleDiff = targetAngle - this.turretBody.rotation.y;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            this.turretBody.rotation.y += angleDiff * this.targetingSpeed * deltaTime;
        }
        
        // Intensify eye when locked on
        if (this.eyeLight) {
            this.eyeLight.intensity = 0.8 + Math.sin(Date.now() * 0.02) * 0.2;
        }
    }
    
    updateAttack(deltaTime, player) {
        this.updateChase(deltaTime, player);
        
        if (this.attackCooldown <= 0) {
            this.attack(player);
            this.attackCooldown = this.fireRate;
        }
    }
    
    attack(player) {
        if (!player || !player.mesh) return;
        
        // Muzzle flash on both barrels
        this.barrels.forEach((barrel, i) => {
            const flash = BABYLON.MeshBuilder.CreateSphere("muzzleFlash", { diameter: 0.2 }, this.scene);
            flash.position = barrel.absolutePosition.add(new BABYLON.Vector3(0, 0, 0.7));
            
            const flashMat = new BABYLON.StandardMaterial("flashMat", this.scene);
            flashMat.emissiveColor = new BABYLON.Color3(1, 0.8, 0.3);
            flashMat.disableLighting = true;
            flash.material = flashMat;
            
            setTimeout(() => flash.dispose(), 50);
        });
        
        // Bullet tracer
        const start = this.turretBody.absolutePosition.clone();
        start.y += 0.3;
        const end = player.mesh.position.clone();
        end.y += 1;
        
        const tracer = BABYLON.MeshBuilder.CreateLines("tracer", {
            points: [start, end]
        }, this.scene);
        tracer.color = new BABYLON.Color3(1, 0.8, 0.3);
        setTimeout(() => tracer.dispose(), 50);
        
        // Check if player has notarget
        if (!player.notarget) {
            player.takeDamage(this.damage);
        }
        
        console.log("Turret fires!");
    }
}


/* ============================================================================
   MECH - Heavy Armored Walker
   ============================================================================ */

class Mech extends Enemy {
    constructor(scene, position) {
        super(scene, 'mech', position);
        this.health = 500;
        this.maxHealth = 500;
        this.damage = 50;
        this.speed = 1.5; // Slow but powerful
        this.detectionRange = 18;
        this.attackRange = 15;
        this.walkCycle = 0;
        this.armSwing = 0;
    }
    
    async init(modelLoader) {
        this.mesh = new BABYLON.TransformNode("mech", this.scene);
        this.mesh.position = this.position.clone();
        
        const metalMat = new BABYLON.StandardMaterial("mechMetal", this.scene);
        metalMat.diffuseColor = new BABYLON.Color3(0.25, 0.28, 0.3);
        metalMat.specularColor = new BABYLON.Color3(0.7, 0.7, 0.7);
        metalMat.specularPower = 32;
        
        const darkMat = new BABYLON.StandardMaterial("mechDark", this.scene);
        darkMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.12);
        
        // === LEGS ===
        this.leftLeg = new BABYLON.TransformNode("leftLeg", this.scene);
        this.leftLeg.position.set(-0.5, 0, 0);
        this.leftLeg.parent = this.mesh;
        
        this.rightLeg = new BABYLON.TransformNode("rightLeg", this.scene);
        this.rightLeg.position.set(0.5, 0, 0);
        this.rightLeg.parent = this.mesh;
        
        // Leg parts
        [this.leftLeg, this.rightLeg].forEach(leg => {
            // Upper leg
            const upper = BABYLON.MeshBuilder.CreateBox("upperLeg", {
                width: 0.3,
                height: 1,
                depth: 0.4
            }, this.scene);
            upper.position.y = 1.5;
            upper.material = metalMat;
            upper.parent = leg;
            
            // Lower leg
            const lower = BABYLON.MeshBuilder.CreateBox("lowerLeg", {
                width: 0.25,
                height: 1.2,
                depth: 0.35
            }, this.scene);
            lower.position.y = 0.6;
            lower.material = darkMat;
            lower.parent = leg;
            
            // Foot
            const foot = BABYLON.MeshBuilder.CreateBox("foot", {
                width: 0.5,
                height: 0.15,
                depth: 0.8
            }, this.scene);
            foot.position.set(0, 0.08, 0.1);
            foot.material = metalMat;
            foot.parent = leg;
        });
        
        // === TORSO ===
        const torso = BABYLON.MeshBuilder.CreateBox("torso", {
            width: 1.4,
            height: 1,
            depth: 0.9
        }, this.scene);
        torso.position.y = 2.5;
        torso.material = metalMat;
        torso.parent = this.mesh;
        
        // Chest plate
        const chest = BABYLON.MeshBuilder.CreateBox("chest", {
            width: 1.2,
            height: 0.6,
            depth: 0.3
        }, this.scene);
        chest.position.set(0, 2.6, 0.45);
        chest.material = darkMat;
        chest.parent = this.mesh;
        
        // === HEAD ===
        const head = BABYLON.MeshBuilder.CreateBox("head", {
            width: 0.6,
            height: 0.5,
            depth: 0.5
        }, this.scene);
        head.position.y = 3.3;
        head.material = metalMat;
        head.parent = this.mesh;
        
        // Visor
        const visor = BABYLON.MeshBuilder.CreateBox("visor", {
            width: 0.5,
            height: 0.15,
            depth: 0.1
        }, this.scene);
        visor.position.set(0, 3.3, 0.28);
        
        const visorMat = new BABYLON.StandardMaterial("visorMat", this.scene);
        visorMat.diffuseColor = new BABYLON.Color3(1, 0.3, 0);
        visorMat.emissiveColor = new BABYLON.Color3(0.8, 0.2, 0);
        visor.material = visorMat;
        visor.parent = this.mesh;
        
        // === ARMS ===
        this.leftArm = new BABYLON.TransformNode("leftArm", this.scene);
        this.leftArm.position.set(-0.9, 2.5, 0);
        this.leftArm.parent = this.mesh;
        
        this.rightArm = new BABYLON.TransformNode("rightArm", this.scene);
        this.rightArm.position.set(0.9, 2.5, 0);
        this.rightArm.parent = this.mesh;
        
        [this.leftArm, this.rightArm].forEach((arm, i) => {
            // Shoulder
            const shoulder = BABYLON.MeshBuilder.CreateSphere("shoulder", { diameter: 0.4 }, this.scene);
            shoulder.material = metalMat;
            shoulder.parent = arm;
            
            // Upper arm
            const upper = BABYLON.MeshBuilder.CreateBox("upperArm", {
                width: 0.25,
                height: 0.8,
                depth: 0.25
            }, this.scene);
            upper.position.y = -0.5;
            upper.material = darkMat;
            upper.parent = arm;
            
            // Weapon pod
            const weapon = BABYLON.MeshBuilder.CreateBox("weapon", {
                width: 0.4,
                height: 0.3,
                depth: 0.6
            }, this.scene);
            weapon.position.set(0, -1, 0.2);
            weapon.material = metalMat;
            weapon.parent = arm;
            
            // Gun barrel
            const barrel = BABYLON.MeshBuilder.CreateCylinder("barrel", {
                height: 0.8,
                diameter: 0.1
            }, this.scene);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0, -1, 0.7);
            barrel.material = darkMat;
            barrel.parent = arm;
        });
        
        // Eye light
        this.eyeLight = new BABYLON.PointLight("mechLight", new BABYLON.Vector3(0, 3.3, 0.4), this.scene);
        this.eyeLight.diffuse = new BABYLON.Color3(1, 0.3, 0);
        this.eyeLight.intensity = 0.8;
        this.eyeLight.range = 10;
        this.eyeLight.parent = this.mesh;
    }
    
    update(deltaTime, player) {
        if (this.state === 'dead') return;
        
        // Walking animation
        if (this.state === 'chase' || this.state === 'patrol') {
            this.walkCycle += deltaTime * this.speed * 3;
            
            // Leg movement
            if (this.leftLeg && this.rightLeg) {
                this.leftLeg.rotation.x = Math.sin(this.walkCycle) * 0.3;
                this.rightLeg.rotation.x = Math.sin(this.walkCycle + Math.PI) * 0.3;
            }
            
            // Arm swing (opposite to legs)
            if (this.leftArm && this.rightArm) {
                this.leftArm.rotation.x = Math.sin(this.walkCycle + Math.PI) * 0.2;
                this.rightArm.rotation.x = Math.sin(this.walkCycle) * 0.2;
            }
        }
        
        // Stomp effect
        const stompPhase = Math.sin(this.walkCycle);
        if (this.mesh) {
            this.mesh.position.y = this.position.y + Math.abs(stompPhase) * 0.05;
        }
        
        super.update(deltaTime, player);
    }
    
    attack(player) {
        if (!player || !player.mesh) return;
        
        console.log("Mech fires rockets!");
        
        // Fire from both arms
        [this.leftArm, this.rightArm].forEach((arm, i) => {
            if (!arm) return;
            
            // Create rocket projectile
            const rocket = BABYLON.MeshBuilder.CreateCylinder("rocket", {
                height: 0.4,
                diameter: 0.1
            }, this.scene);
            
            const rocketMat = new BABYLON.StandardMaterial("rocketMat", this.scene);
            rocketMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
            rocketMat.emissiveColor = new BABYLON.Color3(0.5, 0.2, 0);
            rocket.material = rocketMat;
            
            // Start position at arm
            const startPos = this.mesh.position.clone();
            startPos.y += 1.5;
            startPos.x += (i === 0 ? -1 : 1);
            rocket.position = startPos;
            
            // Direction to player
            const targetPos = player.mesh.position.clone();
            targetPos.y += 1;
            const direction = targetPos.subtract(startPos).normalize();
            rocket.lookAt(targetPos);
            rocket.rotation.x += Math.PI / 2;
            
            // Rocket trail
            const trail = BABYLON.MeshBuilder.CreateCylinder("trail", {
                height: 0.3,
                diameter: 0.15
            }, this.scene);
            
            const trailMat = new BABYLON.StandardMaterial("trailMat", this.scene);
            trailMat.diffuseColor = new BABYLON.Color3(1, 0.5, 0);
            trailMat.emissiveColor = new BABYLON.Color3(1, 0.3, 0);
            trail.material = trailMat;
            trail.parent = rocket;
            trail.position.z = -0.3;
            
            // Animate rocket
            const speed = 20;
            let distance = 0;
            const maxDistance = BABYLON.Vector3.Distance(startPos, targetPos) + 5;
            
            const rocketInterval = setInterval(() => {
                distance += speed * 0.016;
                rocket.position.addInPlace(direction.scale(speed * 0.016));
                
                // Check hit
                const distToPlayer = BABYLON.Vector3.Distance(rocket.position, player.mesh.position);
                if (distToPlayer < 1.5) {
                    // Explosion!
                    this.createExplosion(rocket.position.clone());
                    if (!player.notarget) {
                        player.takeDamage(this.damage);
                    }
                    clearInterval(rocketInterval);
                    rocket.dispose();
                } else if (distance > maxDistance) {
                    clearInterval(rocketInterval);
                    rocket.dispose();
                }
            }, 16);
        });
    }
    
    createExplosion(position) {
        // Explosion sphere
        const explosion = BABYLON.MeshBuilder.CreateSphere("explosion", { diameter: 2 }, this.scene);
        explosion.position = position;
        
        const explosionMat = new BABYLON.StandardMaterial("explosionMat", this.scene);
        explosionMat.diffuseColor = new BABYLON.Color3(1, 0.5, 0);
        explosionMat.emissiveColor = new BABYLON.Color3(1, 0.3, 0);
        explosionMat.alpha = 0.8;
        explosion.material = explosionMat;
        
        // Explosion light
        const light = new BABYLON.PointLight("explosionLight", position, this.scene);
        light.diffuse = new BABYLON.Color3(1, 0.5, 0);
        light.intensity = 3;
        light.range = 15;
        
        // Animate
        let scale = 1;
        const expandInterval = setInterval(() => {
            scale += 0.15;
            explosionMat.alpha -= 0.08;
            light.intensity -= 0.3;
            
            explosion.scaling = new BABYLON.Vector3(scale, scale, scale);
            
            if (explosionMat.alpha <= 0) {
                clearInterval(expandInterval);
                explosion.dispose();
                light.dispose();
            }
        }, 30);
    }
    
    die() {
        // Big explosion on death
        this.createExplosion(this.position.clone());
        super.die();
    }
}


/* ============================================================================
   SCIENTIST ZOMBIE - Fast infected scientist
   ============================================================================ */

class ScientistZombie extends Enemy {
    constructor(scene, position) {
        super(scene, 'zombie', position);
        this.health = 60;
        this.maxHealth = 60;
        this.damage = 15;
        this.speed = 5; // Fast!
        this.detectionRange = 10;
        this.attackRange = 2;
        this.lungeSpeed = 12;
        this.isLunging = false;
    }
    
    async init(modelLoader) {
        this.mesh = new BABYLON.TransformNode("zombie", this.scene);
        this.mesh.position = this.position.clone();
        
        // Zombie skin color (pale/green)
        const skinMat = new BABYLON.StandardMaterial("zombieSkin", this.scene);
        skinMat.diffuseColor = new BABYLON.Color3(0.5, 0.6, 0.45);
        skinMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        
        // Torn lab coat
        const coatMat = new BABYLON.StandardMaterial("zombieCoat", this.scene);
        coatMat.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.65);
        
        // Blood stains
        const bloodMat = new BABYLON.StandardMaterial("zombieBlood", this.scene);
        bloodMat.diffuseColor = new BABYLON.Color3(0.4, 0.1, 0.1);
        
        // Body (hunched posture)
        const body = BABYLON.MeshBuilder.CreateCapsule("zombieBody", {
            height: 1.4,
            radius: 0.3
        }, this.scene);
        body.position.y = 0.9;
        body.rotation.x = 0.3; // Hunched forward
        body.material = coatMat;
        body.parent = this.mesh;
        
        // Head (tilted)
        const head = BABYLON.MeshBuilder.CreateSphere("zombieHead", { diameter: 0.35 }, this.scene);
        head.position.set(0, 1.6, 0.2);
        head.scaling = new BABYLON.Vector3(1, 1.1, 1);
        head.material = skinMat;
        head.parent = this.mesh;
        
        // Glowing eyes
        const eyeMat = new BABYLON.StandardMaterial("zombieEyes", this.scene);
        eyeMat.diffuseColor = new BABYLON.Color3(0.8, 1, 0.3);
        eyeMat.emissiveColor = new BABYLON.Color3(0.4, 0.6, 0.1);
        
        [-0.08, 0.08].forEach(x => {
            const eye = BABYLON.MeshBuilder.CreateSphere("eye", { diameter: 0.06 }, this.scene);
            eye.position.set(x, 1.65, 0.35);
            eye.material = eyeMat;
            eye.parent = this.mesh;
        });
        
        // Arms (reaching forward)
        this.leftArm = new BABYLON.TransformNode("leftArm", this.scene);
        this.leftArm.position.set(-0.4, 1.2, 0);
        this.leftArm.rotation.x = -0.8; // Reaching forward
        this.leftArm.parent = this.mesh;
        
        this.rightArm = new BABYLON.TransformNode("rightArm", this.scene);
        this.rightArm.position.set(0.4, 1.2, 0);
        this.rightArm.rotation.x = -0.6;
        this.rightArm.parent = this.mesh;
        
        [this.leftArm, this.rightArm].forEach(arm => {
            const armMesh = BABYLON.MeshBuilder.CreateCapsule("arm", {
                height: 0.7,
                radius: 0.08
            }, this.scene);
            armMesh.position.y = -0.35;
            armMesh.material = skinMat;
            armMesh.parent = arm;
            
            // Clawed hand
            const hand = BABYLON.MeshBuilder.CreateSphere("hand", { diameter: 0.12 }, this.scene);
            hand.position.y = -0.75;
            hand.material = skinMat;
            hand.parent = arm;
        });
        
        // Blood splatters on coat
        for (let i = 0; i < 3; i++) {
            const blood = BABYLON.MeshBuilder.CreateDisc("blood", { radius: 0.1 + Math.random() * 0.1 }, this.scene);
            blood.position.set(
                (Math.random() - 0.5) * 0.4,
                0.7 + Math.random() * 0.5,
                0.31
            );
            blood.material = bloodMat;
            blood.parent = this.mesh;
        }
    }
    
    update(deltaTime, player) {
        if (this.state === 'dead') return;
        
        // Twitchy movement
        if (this.mesh && !this.isLunging) {
            this.mesh.rotation.z = Math.sin(Date.now() * 0.01) * 0.05;
        }
        
        // Arm reaching animation
        if (this.leftArm && this.rightArm) {
            const reach = Math.sin(Date.now() * 0.008);
            this.leftArm.rotation.x = -0.8 + reach * 0.2;
            this.rightArm.rotation.x = -0.6 + Math.sin(Date.now() * 0.009) * 0.2;
        }
        
        // Lunge attack
        if (this.isLunging && player && player.mesh) {
            const direction = player.mesh.position.subtract(this.position);
            direction.y = 0;
            direction.normalize();
            
            this.position.addInPlace(direction.scale(this.lungeSpeed * deltaTime));
            
            const dist = this.getDistanceToPlayer(player);
            if (dist < 1.5) {
                this.attack(player);
                this.isLunging = false;
            }
        }
        
        super.update(deltaTime, player);
    }
    
    updateChase(deltaTime, player) {
        // Fast erratic movement
        const erratic = new BABYLON.Vector3(
            Math.sin(Date.now() * 0.01) * 0.5,
            0,
            Math.cos(Date.now() * 0.012) * 0.5
        );
        
        if (player && player.mesh) {
            const direction = player.mesh.position.subtract(this.position);
            direction.y = 0;
            direction.normalize();
            direction.addInPlace(erratic.scale(0.3));
            direction.normalize();
            
            this.position.addInPlace(direction.scale(this.speed * deltaTime));
            
            if (this.mesh) {
                this.mesh.rotation.y = Math.atan2(direction.x, direction.z);
            }
        }
    }
    
    updateAttack(deltaTime, player) {
        // Initiate lunge
        if (!this.isLunging && this.attackCooldown <= 0) {
            this.isLunging = true;
            this.attackCooldown = 2;
            console.log("Zombie lunges!");
        }
    }
    
    attack(player) {
        console.log("Zombie claws!");
        if (player && !player.notarget) {
            player.takeDamage(this.damage);
        }
    }
}


/* ============================================================================
   BOSS - Dr. Nexus, Facility Director
   ============================================================================ */

class Boss extends Enemy {
    constructor(scene, position) {
        super(scene, 'boss', position);
        this.name = "Dr. Nexus";
        this.health = 2000;
        this.maxHealth = 2000;
        this.damage = 40;
        this.speed = 2;
        this.detectionRange = 30;
        this.attackRange = 20;
        
        this.phase = 1; // Boss phases
        this.attackPattern = 0;
        this.summonCooldown = 0;
        this.shieldActive = false;
    }
    
    async init(modelLoader) {
        this.mesh = new BABYLON.TransformNode("boss", this.scene);
        this.mesh.position = this.position.clone();
        
        // Exosuit/power armor
        const armorMat = new BABYLON.PBRMaterial("bossArmor", this.scene);
        armorMat.albedoColor = new BABYLON.Color3(0.15, 0.15, 0.2);
        armorMat.metallic = 0.9;
        armorMat.roughness = 0.3;
        
        const goldMat = new BABYLON.PBRMaterial("bossGold", this.scene);
        goldMat.albedoColor = new BABYLON.Color3(0.8, 0.6, 0.2);
        goldMat.metallic = 1;
        goldMat.roughness = 0.2;
        
        const energyMat = new BABYLON.StandardMaterial("bossEnergy", this.scene);
        energyMat.diffuseColor = new BABYLON.Color3(0.3, 0.8, 1);
        energyMat.emissiveColor = new BABYLON.Color3(0.2, 0.5, 0.8);
        
        // Legs (power armor)
        [[-0.5, 'left'], [0.5, 'right']].forEach(([x, side]) => {
            const leg = BABYLON.MeshBuilder.CreateBox(`${side}Leg`, {
                width: 0.5,
                height: 2,
                depth: 0.5
            }, this.scene);
            leg.position.set(x, 1, 0);
            leg.material = armorMat;
            leg.parent = this.mesh;
            
            // Energy conduits
            const conduit = BABYLON.MeshBuilder.CreateCylinder(`${side}Conduit`, {
                height: 1.8,
                diameter: 0.1
            }, this.scene);
            conduit.position.set(x * 0.8, 1, 0.2);
            conduit.material = energyMat;
            conduit.parent = this.mesh;
        });
        
        // Torso
        const torso = BABYLON.MeshBuilder.CreateBox("bossTorso", {
            width: 1.8,
            height: 1.5,
            depth: 1
        }, this.scene);
        torso.position.y = 2.75;
        torso.material = armorMat;
        torso.parent = this.mesh;
        
        // Chest reactor
        this.reactor = BABYLON.MeshBuilder.CreateSphere("reactor", { diameter: 0.5 }, this.scene);
        this.reactor.position.set(0, 2.75, 0.55);
        this.reactor.material = energyMat;
        this.reactor.parent = this.mesh;
        
        // Reactor light
        this.reactorLight = new BABYLON.PointLight("reactorLight", new BABYLON.Vector3(0, 2.75, 0.6), this.scene);
        this.reactorLight.diffuse = new BABYLON.Color3(0.3, 0.8, 1);
        this.reactorLight.intensity = 2;
        this.reactorLight.range = 8;
        this.reactorLight.parent = this.mesh;
        
        // Head (helmet)
        const head = BABYLON.MeshBuilder.CreateSphere("bossHead", { diameter: 0.6 }, this.scene);
        head.position.y = 3.8;
        head.scaling = new BABYLON.Vector3(1, 1.2, 1);
        head.material = armorMat;
        head.parent = this.mesh;
        
        // Gold trim
        const crown = BABYLON.MeshBuilder.CreateTorus("crown", {
            diameter: 0.7,
            thickness: 0.05
        }, this.scene);
        crown.position.y = 4.1;
        crown.rotation.x = Math.PI / 2;
        crown.material = goldMat;
        crown.parent = this.mesh;
        
        // Visor (menacing)
        const visor = BABYLON.MeshBuilder.CreateBox("visor", {
            width: 0.5,
            height: 0.12,
            depth: 0.15
        }, this.scene);
        visor.position.set(0, 3.8, 0.32);
        
        const visorMat = new BABYLON.StandardMaterial("visorMat", this.scene);
        visorMat.diffuseColor = new BABYLON.Color3(1, 0, 0);
        visorMat.emissiveColor = new BABYLON.Color3(1, 0, 0);
        visor.material = visorMat;
        visor.parent = this.mesh;
        
        // Arms with weapons
        this.leftArm = new BABYLON.TransformNode("bossLeftArm", this.scene);
        this.leftArm.position.set(-1.1, 2.75, 0);
        this.leftArm.parent = this.mesh;
        
        this.rightArm = new BABYLON.TransformNode("bossRightArm", this.scene);
        this.rightArm.position.set(1.1, 2.75, 0);
        this.rightArm.parent = this.mesh;
        
        [this.leftArm, this.rightArm].forEach((arm, i) => {
            const armMesh = BABYLON.MeshBuilder.CreateBox("arm", {
                width: 0.4,
                height: 1.5,
                depth: 0.4
            }, this.scene);
            armMesh.position.y = -0.75;
            armMesh.material = armorMat;
            armMesh.parent = arm;
            
            // Weapon (left = cannon, right = blade)
            if (i === 0) {
                // Energy cannon
                const cannon = BABYLON.MeshBuilder.CreateCylinder("cannon", {
                    height: 1,
                    diameter: 0.3
                }, this.scene);
                cannon.rotation.x = Math.PI / 2;
                cannon.position.set(0, -1.5, 0.5);
                cannon.material = armorMat;
                cannon.parent = arm;
                
                // Cannon glow
                const cannonGlow = BABYLON.MeshBuilder.CreateSphere("cannonGlow", { diameter: 0.2 }, this.scene);
                cannonGlow.position.set(0, -1.5, 1);
                cannonGlow.material = energyMat;
                cannonGlow.parent = arm;
            } else {
                // Energy blade
                const blade = BABYLON.MeshBuilder.CreateBox("blade", {
                    width: 0.1,
                    height: 1.5,
                    depth: 0.02
                }, this.scene);
                blade.position.set(0, -2, 0);
                blade.material = energyMat;
                blade.parent = arm;
            }
        });
        
        // Shield node (for shield effect)
        this.shieldMesh = BABYLON.MeshBuilder.CreateSphere("shield", { diameter: 5 }, this.scene);
        this.shieldMesh.position.y = 2;
        
        const shieldMat = new BABYLON.StandardMaterial("shieldMat", this.scene);
        shieldMat.diffuseColor = new BABYLON.Color3(0.3, 0.8, 1);
        shieldMat.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.5);
        shieldMat.alpha = 0;
        shieldMat.backFaceCulling = false;
        this.shieldMesh.material = shieldMat;
        this.shieldMesh.parent = this.mesh;
        
        // Boss health bar (big!)
        this.createBossHealthBar();
    }
    
    createBossHealthBar() {
        // Create a DOM element for boss health
        let bossBar = document.getElementById('bossHealthBar');
        if (!bossBar) {
            bossBar = document.createElement('div');
            bossBar.id = 'bossHealthBar';
            bossBar.style.cssText = `
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                width: 600px;
                height: 30px;
                background: rgba(0, 0, 0, 0.8);
                border: 3px solid #ff4400;
                border-radius: 5px;
                display: none;
                z-index: 100;
            `;
            
            const fill = document.createElement('div');
            fill.id = 'bossHealthFill';
            fill.style.cssText = `
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, #ff0000, #ff4400);
                transition: width 0.3s;
            `;
            bossBar.appendChild(fill);
            
            const name = document.createElement('div');
            name.id = 'bossName';
            name.style.cssText = `
                position: absolute;
                top: -25px;
                left: 50%;
                transform: translateX(-50%);
                color: #ff4400;
                font-size: 20px;
                font-weight: bold;
                text-shadow: 2px 2px 4px black;
            `;
            name.textContent = this.name;
            bossBar.appendChild(name);
            
            document.body.appendChild(bossBar);
        }
    }
    
    update(deltaTime, player) {
        if (this.state === 'dead') return;
        
        // Show boss health bar when active
        const bossBar = document.getElementById('bossHealthBar');
        if (bossBar && this.state !== 'patrol') {
            bossBar.style.display = 'block';
            document.getElementById('bossHealthFill').style.width = 
                (this.health / this.maxHealth * 100) + '%';
        }
        
        // Phase transitions
        if (this.health < this.maxHealth * 0.6 && this.phase === 1) {
            this.phase = 2;
            console.log("Boss enters PHASE 2!");
            this.speed = 3;
            this.damage = 60;
        }
        if (this.health < this.maxHealth * 0.3 && this.phase === 2) {
            this.phase = 3;
            console.log("Boss enters PHASE 3 - ENRAGED!");
            this.speed = 4;
            this.damage = 80;
            this.activateShield();
        }
        
        // Reactor pulse
        if (this.reactorLight) {
            this.reactorLight.intensity = 1.5 + Math.sin(Date.now() * 0.005) * 0.5;
        }
        
        // Shield pulse
        if (this.shieldActive && this.shieldMesh) {
            this.shieldMesh.material.alpha = 0.2 + Math.sin(Date.now() * 0.01) * 0.1;
            this.shieldMesh.rotation.y += deltaTime;
        }
        
        this.summonCooldown = Math.max(0, this.summonCooldown - deltaTime);
        
        super.update(deltaTime, player);
    }
    
    activateShield() {
        this.shieldActive = true;
        this.shieldMesh.material.alpha = 0.3;
    }
    
    takeDamage(amount) {
        // Shield reduces damage
        if (this.shieldActive) {
            amount *= 0.3;
            
            // Shield flash
            this.shieldMesh.material.emissiveColor = new BABYLON.Color3(0.5, 1, 1);
            setTimeout(() => {
                if (this.shieldMesh && this.shieldMesh.material) {
                    this.shieldMesh.material.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.5);
                }
            }, 100);
        }
        
        super.takeDamage(amount);
    }
    
    attack(player) {
        if (!player || !player.mesh) return;
        
        this.attackPattern = (this.attackPattern + 1) % 3;
        
        switch (this.attackPattern) {
            case 0:
                this.energyBlast(player);
                break;
            case 1:
                this.groundSlam(player);
                break;
            case 2:
                if (this.phase >= 2) {
                    this.summonMinions(player);
                } else {
                    this.energyBlast(player);
                }
                break;
        }
    }
    
    energyBlast(player) {
        console.log("Boss fires energy blast!");
        
        // Charge effect
        const charge = BABYLON.MeshBuilder.CreateSphere("charge", { diameter: 0.5 }, this.scene);
        charge.position = this.leftArm.absolutePosition.clone();
        charge.position.z += 1;
        
        const chargeMat = new BABYLON.StandardMaterial("chargeMat", this.scene);
        chargeMat.diffuseColor = new BABYLON.Color3(0.3, 0.8, 1);
        chargeMat.emissiveColor = new BABYLON.Color3(0.3, 0.8, 1);
        charge.material = chargeMat;
        
        // Fire after charge
        setTimeout(() => {
            if (!charge || charge.isDisposed()) return;
            
            const start = charge.position.clone();
            const end = player.mesh.position.clone();
            end.y += 1;
            const direction = end.subtract(start).normalize();
            
            // Beam
            const distance = BABYLON.Vector3.Distance(start, end);
            const beam = BABYLON.MeshBuilder.CreateCylinder("beam", {
                height: distance,
                diameter: 0.3
            }, this.scene);
            
            beam.position = start.add(end).scale(0.5);
            beam.lookAt(end);
            beam.rotation.x += Math.PI / 2;
            beam.material = chargeMat;
            
            // Hit
            if (!player.notarget) {
                player.takeDamage(this.damage);
            }
            
            // Cleanup
            setTimeout(() => {
                charge.dispose();
                beam.dispose();
            }, 200);
        }, 500);
    }
    
    groundSlam(player) {
        console.log("Boss ground slam!");
        
        // Jump up
        const startY = this.mesh.position.y;
        
        // Animate jump
        const jumpAnim = new BABYLON.Animation(
            "bossJump",
            "position.y",
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        jumpAnim.setKeys([
            { frame: 0, value: startY },
            { frame: 15, value: startY + 5 },
            { frame: 30, value: startY }
        ]);
        
        this.mesh.animations.push(jumpAnim);
        this.scene.beginAnimation(this.mesh, 0, 30, false, 1, () => {
            // Shockwave on landing
            const wave = BABYLON.MeshBuilder.CreateTorus("shockwave", {
                diameter: 1,
                thickness: 0.3
            }, this.scene);
            wave.position = this.mesh.position.clone();
            wave.position.y = 0.2;
            wave.rotation.x = Math.PI / 2;
            
            const waveMat = new BABYLON.StandardMaterial("waveMat", this.scene);
            waveMat.diffuseColor = new BABYLON.Color3(1, 0.5, 0);
            waveMat.emissiveColor = new BABYLON.Color3(0.8, 0.3, 0);
            waveMat.alpha = 0.8;
            wave.material = waveMat;
            
            // Expand shockwave
            let radius = 1;
            const expandInterval = setInterval(() => {
                radius += 1;
                wave.scaling = new BABYLON.Vector3(radius, radius, 1);
                waveMat.alpha -= 0.05;
                
                // Check if player in range
                const dist = BABYLON.Vector3.Distance(this.mesh.position, player.mesh.position);
                if (dist < radius && dist > radius - 2 && !player.notarget) {
                    player.takeDamage(this.damage * 0.5);
                }
                
                if (waveMat.alpha <= 0 || radius > 15) {
                    clearInterval(expandInterval);
                    wave.dispose();
                }
            }, 50);
        });
    }
    
    summonMinions(player) {
        if (this.summonCooldown > 0) return;
        
        console.log("Boss summons minions!");
        this.summonCooldown = 10;
        
        // Spawn zombies around boss
        const spawnPoints = [
            new BABYLON.Vector3(-5, 0, 0),
            new BABYLON.Vector3(5, 0, 0),
            new BABYLON.Vector3(0, 0, 5),
            new BABYLON.Vector3(0, 0, -5)
        ];
        
        // This would need to interface with the level's enemy system
        // For now just visual effect
        spawnPoints.forEach(offset => {
            const spawnPos = this.position.add(offset);
            
            const portal = BABYLON.MeshBuilder.CreateTorus("portal", {
                diameter: 2,
                thickness: 0.2
            }, this.scene);
            portal.position = spawnPos;
            portal.position.y = 0.1;
            portal.rotation.x = Math.PI / 2;
            
            const portalMat = new BABYLON.StandardMaterial("portalMat", this.scene);
            portalMat.diffuseColor = new BABYLON.Color3(0.5, 0, 0.8);
            portalMat.emissiveColor = new BABYLON.Color3(0.3, 0, 0.5);
            portal.material = portalMat;
            
            // Portal effect
            let time = 0;
            const portalInterval = setInterval(() => {
                time += 0.1;
                portal.rotation.z = time;
                
                if (time > 3) {
                    clearInterval(portalInterval);
                    portal.dispose();
                }
            }, 30);
        });
    }
    
    die() {
        console.log("BOSS DEFEATED!");
        
        // Hide health bar
        const bossBar = document.getElementById('bossHealthBar');
        if (bossBar) bossBar.style.display = 'none';
        
        // Epic death sequence
        this.shieldActive = false;
        if (this.shieldMesh) this.shieldMesh.material.alpha = 0;
        
        // Explosion sequence
        let explosionCount = 0;
        const explosionInterval = setInterval(() => {
            const offset = new BABYLON.Vector3(
                (Math.random() - 0.5) * 3,
                Math.random() * 4,
                (Math.random() - 0.5) * 3
            );
            
            const explosion = BABYLON.MeshBuilder.CreateSphere("exp", { diameter: 1.5 }, this.scene);
            explosion.position = this.mesh.position.add(offset);
            
            const expMat = new BABYLON.StandardMaterial("expMat", this.scene);
            expMat.emissiveColor = new BABYLON.Color3(1, 0.5, 0);
            explosion.material = expMat;
            
            setTimeout(() => explosion.dispose(), 300);
            
            explosionCount++;
            if (explosionCount > 10) {
                clearInterval(explosionInterval);
                
                // Final big explosion
                const finalExp = BABYLON.MeshBuilder.CreateSphere("finalExp", { diameter: 8 }, this.scene);
                finalExp.position = this.mesh.position.clone();
                finalExp.position.y += 2;
                
                const finalMat = new BABYLON.StandardMaterial("finalMat", this.scene);
                finalMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
                finalMat.alpha = 1;
                finalExp.material = finalMat;
                
                // Fade out
                let alpha = 1;
                const fadeInterval = setInterval(() => {
                    alpha -= 0.05;
                    finalMat.alpha = alpha;
                    finalExp.scaling.scaleInPlace(1.1);
                    
                    if (alpha <= 0) {
                        clearInterval(fadeInterval);
                        finalExp.dispose();
                    }
                }, 30);
                
                // Actually dispose boss
                super.die();
            }
        }, 200);
    }
}
