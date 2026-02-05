/* ============================================================================
   ESCAPE LAB 48 - BABYLON.JS EDITION
   JetpackGirl - Flying ally character
   ============================================================================ */

class JetpackGirl {
    constructor(scene, position) {
        this.scene = scene;
        this.position = position.clone();
        this.mesh = null;
        this.modelLoaded = false;
        this.animController = null;
        this.modelNode = null;
        
        // Flight parameters
        this.flyHeight = 4;
        this.flySpeed = 3;
        this.hoverAmplitude = 0.5;
        this.hoverSpeed = 2;
        
        // Patrol
        this.patrolPoints = [];
        this.currentPatrolIndex = 0;
        this.patrolDirection = 1;
        
        // Animation
        this.time = 0;
        this.jetFlames = [];
        this.trailParticles = null;
    }
    
    async init(modelLoader) {
        // Create container
        this.mesh = new BABYLON.TransformNode("jetpackGirl", this.scene);
        this.mesh.position = this.position.clone();
        this.mesh.position.y += this.flyHeight;
        
        // Try to load FBX model
        if (modelLoader) {
            try {
                const model = await modelLoader.loadModel('jetpack-girl', 'assets/models/jetpack-girl/lod_basic_pbr.fbx');
                if (model) {
                    model.parent = this.mesh;
                    model.scaling = new BABYLON.Vector3(0.015, 0.015, 0.015);
                    model.position = BABYLON.Vector3.Zero();
                    model.rotation.y = Math.PI; // Face forward
                    
                    // Apply PBR textures
                    const texturePath = 'assets/textures/jetpack-girl/';
                    model.getChildMeshes().forEach(child => {
                        child.isVisible = true;
                        
                        // Create PBR material with textures
                        const pbrMat = new BABYLON.PBRMaterial("jetpackGirlPBR_" + child.name, this.scene);
                        pbrMat.albedoTexture = new BABYLON.Texture(texturePath + "texture_diffuse.png", this.scene);
                        pbrMat.metallicTexture = new BABYLON.Texture(texturePath + "texture_metallic.png", this.scene);
                        pbrMat.bumpTexture = new BABYLON.Texture(texturePath + "texture_normal.png", this.scene);
                        pbrMat.useRoughnessFromMetallicTextureAlpha = false;
                        pbrMat.useRoughnessFromMetallicTextureGreen = true;
                        pbrMat.microSurfaceTexture = new BABYLON.Texture(texturePath + "texture_roughness.png", this.scene);
                        
                        child.material = pbrMat;
                    });
                    
                    this.modelNode = model;
                    
                    // Setup animation controller
                    this.animController = new AnimationController(model);
                    console.log('🎬 Jetpack Girl animations:', this.animController.getAnimationNames());
                    
                    // Start with fly animation
                    if (this.animController.hasAnimation('fly')) {
                        this.animController.play('fly', true);
                    } else if (this.animController.hasAnimation('idle')) {
                        this.animController.play('idle', true);
                    }
                    
                    this.modelLoaded = true;
                    console.log('✅ Jetpack Girl FBX model loaded with PBR textures and animations');
                    
                    // Add jet effects
                    this.createJetEffects();
                    return;
                }
            } catch (e) {
                console.warn('Could not load Jetpack Girl FBX, using fallback:', e);
            }
        }
        
        // Fallback mesh
        this.createFallbackMesh();
        this.createJetEffects();
    }
    
    createFallbackMesh() {
        // Body
        const body = BABYLON.MeshBuilder.CreateCapsule("jgBody", {
            height: 1.4,
            radius: 0.25
        }, this.scene);
        
        const bodyMat = new BABYLON.StandardMaterial("jgBodyMat", this.scene);
        bodyMat.diffuseColor = new BABYLON.Color3(0.9, 0.3, 0.5); // Pink suit
        bodyMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        body.material = bodyMat;
        body.parent = this.mesh;
        
        // Head
        const head = BABYLON.MeshBuilder.CreateSphere("jgHead", {
            diameter: 0.35
        }, this.scene);
        head.position.y = 0.9;
        
        const headMat = new BABYLON.StandardMaterial("jgHeadMat", this.scene);
        headMat.diffuseColor = new BABYLON.Color3(0.9, 0.75, 0.6);
        head.material = headMat;
        head.parent = body;
        
        // Helmet visor
        const visor = BABYLON.MeshBuilder.CreateSphere("jgVisor", {
            diameter: 0.38,
            slice: 0.5
        }, this.scene);
        visor.position.y = 0.92;
        visor.rotation.x = -Math.PI / 6;
        visor.scaling = new BABYLON.Vector3(1, 0.8, 0.6);
        
        const visorMat = new BABYLON.StandardMaterial("jgVisorMat", this.scene);
        visorMat.diffuseColor = new BABYLON.Color3(0.2, 0.6, 0.9);
        visorMat.specularColor = new BABYLON.Color3(1, 1, 1);
        visorMat.alpha = 0.7;
        visor.material = visorMat;
        visor.parent = body;
        
        // Hair (ponytail)
        const hair = BABYLON.MeshBuilder.CreateCylinder("jgHair", {
            height: 0.5,
            diameterTop: 0.08,
            diameterBottom: 0.15
        }, this.scene);
        hair.position = new BABYLON.Vector3(0, 0.8, -0.2);
        hair.rotation.x = Math.PI / 4;
        
        const hairMat = new BABYLON.StandardMaterial("jgHairMat", this.scene);
        hairMat.diffuseColor = new BABYLON.Color3(0.6, 0.3, 0.1); // Auburn
        hair.material = hairMat;
        hair.parent = body;
        
        // Jetpack
        const jetpack = BABYLON.MeshBuilder.CreateBox("jetpack", {
            width: 0.4,
            height: 0.5,
            depth: 0.25
        }, this.scene);
        jetpack.position = new BABYLON.Vector3(0, 0.1, -0.25);
        
        const jetpackMat = new BABYLON.StandardMaterial("jetpackMat", this.scene);
        jetpackMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.35);
        jetpackMat.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        jetpack.material = jetpackMat;
        jetpack.parent = body;
        
        // Jet nozzles
        [-0.12, 0.12].forEach((x, i) => {
            const nozzle = BABYLON.MeshBuilder.CreateCylinder(`nozzle_${i}`, {
                height: 0.15,
                diameterTop: 0.08,
                diameterBottom: 0.12
            }, this.scene);
            nozzle.position = new BABYLON.Vector3(x, -0.15, -0.25);
            nozzle.material = jetpackMat;
            nozzle.parent = body;
        });
        
        // Arms out to sides (flying pose)
        const armMat = new BABYLON.StandardMaterial("jgArmMat", this.scene);
        armMat.diffuseColor = new BABYLON.Color3(0.9, 0.3, 0.5);
        
        const leftArm = BABYLON.MeshBuilder.CreateCapsule("jgLeftArm", {
            height: 0.6,
            radius: 0.08
        }, this.scene);
        leftArm.position = new BABYLON.Vector3(-0.4, 0.2, 0);
        leftArm.rotation.z = Math.PI / 3;
        leftArm.material = armMat;
        leftArm.parent = body;
        
        const rightArm = BABYLON.MeshBuilder.CreateCapsule("jgRightArm", {
            height: 0.6,
            radius: 0.08
        }, this.scene);
        rightArm.position = new BABYLON.Vector3(0.4, 0.2, 0);
        rightArm.rotation.z = -Math.PI / 3;
        rightArm.material = armMat;
        rightArm.parent = body;
        
        // Legs (bent back - flying)
        const legMat = new BABYLON.StandardMaterial("jgLegMat", this.scene);
        legMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.25);
        
        const leftLeg = BABYLON.MeshBuilder.CreateCapsule("jgLeftLeg", {
            height: 0.6,
            radius: 0.1
        }, this.scene);
        leftLeg.position = new BABYLON.Vector3(-0.15, -0.5, -0.15);
        leftLeg.rotation.x = Math.PI / 6;
        leftLeg.material = legMat;
        leftLeg.parent = body;
        
        const rightLeg = BABYLON.MeshBuilder.CreateCapsule("jgRightLeg", {
            height: 0.6,
            radius: 0.1
        }, this.scene);
        rightLeg.position = new BABYLON.Vector3(0.15, -0.5, -0.15);
        rightLeg.rotation.x = Math.PI / 6;
        rightLeg.material = legMat;
        rightLeg.parent = body;
    }
    
    createJetEffects() {
        // Create flame cones for jet exhaust
        [-0.12, 0.12].forEach((x, i) => {
            const flame = BABYLON.MeshBuilder.CreateCylinder(`flame_${i}`, {
                height: 0.8,
                diameterTop: 0,
                diameterBottom: 0.15
            }, this.scene);
            flame.position = new BABYLON.Vector3(x, -0.6, -0.25);
            flame.rotation.x = Math.PI; // Point down
            
            const flameMat = new BABYLON.StandardMaterial(`flameMat_${i}`, this.scene);
            flameMat.diffuseColor = new BABYLON.Color3(1, 0.5, 0);
            flameMat.emissiveColor = new BABYLON.Color3(1, 0.3, 0);
            flameMat.alpha = 0.8;
            flame.material = flameMat;
            flame.parent = this.mesh;
            
            this.jetFlames.push(flame);
        });
        
        // Point light for jet glow
        const jetLight = new BABYLON.PointLight("jetLight", new BABYLON.Vector3(0, -0.5, -0.25), this.scene);
        jetLight.diffuse = new BABYLON.Color3(1, 0.5, 0);
        jetLight.intensity = 0.8;
        jetLight.range = 5;
        jetLight.parent = this.mesh;
        
        // Particle system for exhaust trail
        this.createExhaustParticles();
    }
    
    createExhaustParticles() {
        // Create particle system for smoke trail
        const particleSystem = new BABYLON.ParticleSystem("jetExhaust", 100, this.scene);
        
        particleSystem.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAGpSURBVFiF7ZY9TsNAEIW/2YQCUdBQUNDRUXIKOAItR6DlCHAErsBR6CgoKBKJgoKGIgrk7DKzxHbWP2vjSJF4kqXN7s6bN7teWxjjn2Nc9MAp8AS8A69APTZvwC3wYmaPkvjYtK8eJ+MO+Az0gHPgGDgCDoFTYCapcNMJJQWDJKrumSSTZGYLwCVwIGlO0hHwCKxIOgd+APV4UtJ7pGYkZdoLy5J6sT0r6SBWfyRpLbJ3Ja3E9ljSfmzvSVqO7D1Ji5Kmkg5j+0bSZdJnN+qzK+lS0k5k70q6jLa7ki4j7a6kS0l3kd3fBvckfUa5eyRdSdqTtCfpKrL3JF1F9p6kq8jek3QV2XuSriJ7T9JVbL8m6Sqy9yRdRfa+pKvI3pd0HdmHkm4i+1DSbWQfSrqN7ENJN5F9KOk2sg8l3Ub2kaTbyD6SdBvZR5JuI/tI0m1kH0u6i+wTSfeRfSLpPrJPJN1H9rGk+8g+lnQf2ceS7iP7RNJ9ZB9Luo/sE0n3kX0s6T6yTyTdR/a/Fvwb8F/wb8C/Af8G/Bvwb8C/Af8GfAPfDw4hm3GqAAAAAElFTkSuQmCC", this.scene);
        
        particleSystem.emitter = this.mesh;
        particleSystem.minEmitBox = new BABYLON.Vector3(-0.1, -0.8, -0.25);
        particleSystem.maxEmitBox = new BABYLON.Vector3(0.1, -0.6, -0.25);
        
        particleSystem.color1 = new BABYLON.Color4(1, 0.5, 0, 1);
        particleSystem.color2 = new BABYLON.Color4(1, 0.2, 0, 0.8);
        particleSystem.colorDead = new BABYLON.Color4(0.2, 0.2, 0.2, 0);
        
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.3;
        
        particleSystem.minLifeTime = 0.2;
        particleSystem.maxLifeTime = 0.5;
        
        particleSystem.emitRate = 50;
        
        particleSystem.direction1 = new BABYLON.Vector3(-0.2, -1, -0.2);
        particleSystem.direction2 = new BABYLON.Vector3(0.2, -1, 0.2);
        
        particleSystem.minEmitPower = 2;
        particleSystem.maxEmitPower = 4;
        
        particleSystem.gravity = new BABYLON.Vector3(0, 2, 0);
        
        particleSystem.start();
        this.trailParticles = particleSystem;
    }
    
    setPatrolPoints(points) {
        this.patrolPoints = points.map(p => {
            const point = p.clone();
            point.y = this.flyHeight;
            return point;
        });
    }
    
    update(deltaTime) {
        this.time += deltaTime;
        
        // Hover animation
        const hoverOffset = Math.sin(this.time * this.hoverSpeed) * this.hoverAmplitude;
        
        // Move along patrol path
        if (this.patrolPoints.length > 1) {
            const targetPoint = this.patrolPoints[this.currentPatrolIndex];
            const direction = targetPoint.subtract(this.mesh.position);
            direction.y = 0; // Keep level
            const distance = direction.length();
            
            if (distance < 0.5) {
                // Reached waypoint, go to next
                this.currentPatrolIndex += this.patrolDirection;
                if (this.currentPatrolIndex >= this.patrolPoints.length) {
                    this.currentPatrolIndex = this.patrolPoints.length - 2;
                    this.patrolDirection = -1;
                } else if (this.currentPatrolIndex < 0) {
                    this.currentPatrolIndex = 1;
                    this.patrolDirection = 1;
                }
            } else {
                // Move towards target
                direction.normalize();
                const moveAmount = this.flySpeed * deltaTime;
                this.mesh.position.addInPlace(direction.scale(moveAmount));
                
                // Face movement direction
                const targetRotation = Math.atan2(direction.x, direction.z);
                this.mesh.rotation.y = BABYLON.Scalar.LerpAngle(
                    this.mesh.rotation.y,
                    targetRotation,
                    deltaTime * 3
                );
                
                // Slight tilt in movement direction
                this.mesh.rotation.z = BABYLON.Scalar.Lerp(
                    this.mesh.rotation.z,
                    -direction.x * 0.3,
                    deltaTime * 2
                );
            }
        }
        
        // Apply hover
        this.mesh.position.y = this.flyHeight + hoverOffset;
        
        // Animate jet flames
        this.jetFlames.forEach((flame, i) => {
            const flicker = 0.8 + Math.sin(this.time * 20 + i) * 0.2;
            flame.scaling.y = flicker;
            flame.material.emissiveColor = new BABYLON.Color3(
                1,
                0.3 + Math.sin(this.time * 15) * 0.2,
                0
            );
        });
    }
    
    dispose() {
        if (this.trailParticles) {
            this.trailParticles.dispose();
        }
        if (this.mesh) {
            this.mesh.dispose();
        }
    }
}
