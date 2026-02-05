/* ============================================================================
   ESCAPE LAB 48 - BABYLON.JS EDITION
   NPC - Rescuable characters
   ============================================================================ */

class NPC {
    constructor(scene, data, position) {
        this.scene = scene;
        this.data = data;
        this.position = position;
        this.mesh = null;
        this.isRescued = false;
        this.modelLoaded = false;
        this.animController = null;
        this.modelNode = null;
    }
    
    async create(modelLoader) {
        // Create container mesh for NPC
        this.mesh = new BABYLON.TransformNode(this.data.name + "_container", this.scene);
        this.mesh.position = this.position.clone();
        
        // Try to load GLB model for Sarah (Salvari Princess)
        if (modelLoader && this.data.name === 'Sarah') {
            try {
                const result = await BABYLON.SceneLoader.ImportMeshAsync(
                    "", "assets/models/sarah/", "Salvari_Princess.glb", this.scene
                );
                
                if (result.meshes.length > 0) {
                    const rootMesh = result.meshes[0];
                    rootMesh.parent = this.mesh;
                    rootMesh.scaling = new BABYLON.Vector3(1.0, 1.0, 1.0); // Adjust as needed
                    rootMesh.position = new BABYLON.Vector3(0, 0, 0);
                    this.modelNode = rootMesh;
                    
                    // Make all meshes visible
                    result.meshes.forEach(child => {
                        child.isVisible = true;
                    });
                    
                    // Setup animations from GLB
                    this.animationGroups = new Map();
                    result.animationGroups.forEach(ag => {
                        const normalizedName = this.normalizeAnimationName(ag.name);
                        this.animationGroups.set(normalizedName, ag);
                        ag.stop();
                        console.log(`  🎬 Sarah anim: ${normalizedName}: ${ag.name}`);
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
                    
                    console.log('🎬 Sarah animations:', this.animController.getAnimationNames());
                    
                    // Start with idle animation
                    if (this.animController.hasAnimation('idle')) {
                        this.animController.play('idle', true);
                    }
                    
                    this.modelLoaded = true;
                    console.log(`✅ Sarah GLB loaded: ${result.meshes.length} meshes, ${result.animationGroups.length} animations`);
                    
                    // Set metadata for interaction on parent
                    this.mesh.metadata = {
                        interactable: true,
                        type: 'npc',
                        name: this.data.name,
                        dialogue: this.data.dialogue,
                        rescued: false
                    };
                    
                    return this.mesh;
                }
            } catch (e) {
                console.warn('Could not load Sarah GLB, using fallback:', e.message);
            }
        }
        
        // Fallback to procedural mesh
        this.createFallbackMesh();
        return this.mesh;
    }
    
    // Normalize animation names from Mixamo format
    normalizeAnimationName(name) {
        if (!name) return 'unknown';
        const lower = name.toLowerCase();
        if (lower.includes('idle') || lower.includes('breathing')) return 'idle';
        if (lower.includes('walk')) return 'walk';
        if (lower.includes('run')) return 'run';
        if (lower.includes('talk') || lower.includes('speak')) return 'talk';
        if (lower.includes('wave')) return 'wave';
        if (lower.includes('sit')) return 'sit';
        if (lower.includes('scared') || lower.includes('fear')) return 'scared';
        if (lower.includes('happy') || lower.includes('joy')) return 'happy';
        return lower.replace(/[^a-z0-9]/g, '_');
    }
    
    createFallbackMesh() {
        // Create NPC body
        const body = BABYLON.MeshBuilder.CreateCapsule(this.data.name + "_body", {
            height: 1.6,
            radius: 0.3
        }, this.scene);
        
        body.position = BABYLON.Vector3.Zero();
        body.parent = this.mesh;
        
        // Create material with NPC color
        const mat = new BABYLON.StandardMaterial(this.data.name + "_mat", this.scene);
        mat.diffuseColor = BABYLON.Color3.FromHexString(this.data.color);
        mat.emissiveColor = BABYLON.Color3.FromHexString(this.data.color).scale(0.2);
        body.material = mat;
        
        // Head
        const head = BABYLON.MeshBuilder.CreateSphere(this.data.name + "_head", {
            diameter: 0.35
        }, this.scene);
        head.position.y = 1;
        
        const headMat = new BABYLON.StandardMaterial(this.data.name + "_headMat", this.scene);
        headMat.diffuseColor = new BABYLON.Color3(0.9, 0.75, 0.6);
        head.material = headMat;
        head.parent = body;
        
        // Hair
        const hair = BABYLON.MeshBuilder.CreateSphere(this.data.name + "_hair", {
            diameter: 0.38
        }, this.scene);
        hair.position.y = 1.05;
        hair.scaling = new BABYLON.Vector3(1, 0.8, 1);
        
        const hairMat = new BABYLON.StandardMaterial(this.data.name + "_hairMat", this.scene);
        hairMat.diffuseColor = new BABYLON.Color3(0.15, 0.1, 0.05); // Dark hair
        hair.material = hairMat;
        hair.parent = body;
        
        // Set metadata for interaction
        body.metadata = {
            interactable: true,
            type: 'npc',
            name: this.data.name,
            dialogue: this.data.dialogue,
            rescued: false
        };
        
        this.addIdleAnimation();
    }
    
    addIdleAnimation() {
        // Simple breathing/idle animation
        const idleAnim = new BABYLON.Animation(
            "idle",
            "position.y",
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const baseY = this.position.y;
        idleAnim.setKeys([
            { frame: 0, value: baseY },
            { frame: 30, value: baseY + 0.05 },
            { frame: 60, value: baseY }
        ]);
        
        this.mesh.animations.push(idleAnim);
        this.scene.beginAnimation(this.mesh, 0, 60, true);
    }
    
    rescue() {
        this.isRescued = true;
        if (this.mesh.metadata) {
            this.mesh.metadata.rescued = true;
        }
        this.mesh.setEnabled(false);
    }
}
