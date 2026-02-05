/* ============================================================================
   ESCAPE LAB 48 - BABYLON.JS EDITION
   Model Loader - Loads GLB/GLTF and FBX models with animation support
   ============================================================================ */

class ModelLoader {
    constructor(scene) {
        this.scene = scene;
        this.loadedModels = new Map();
        this.loadingPromises = new Map();
    }
    
    // Load a model (GLB, GLTF, or FBX) and cache it
    async loadModel(name, path) {
        // Check cache
        if (this.loadedModels.has(name)) {
            return this.cloneModel(name, this.loadedModels.get(name));
        }
        
        // Check if already loading
        if (this.loadingPromises.has(name)) {
            await this.loadingPromises.get(name);
            return this.cloneModel(name, this.loadedModels.get(name));
        }
        
        // Determine file extension
        const extension = path.split('.').pop().toLowerCase();
        
        // Start loading
        const loadPromise = new Promise(async (resolve, reject) => {
            try {
                console.log(`📦 Loading model: ${name} from ${path} (${extension})`);
                
                // Get the directory and filename
                const lastSlash = path.lastIndexOf('/');
                const rootUrl = path.substring(0, lastSlash + 1);
                const fileName = path.substring(lastSlash + 1);
                
                const result = await BABYLON.SceneLoader.ImportMeshAsync(
                    "",
                    rootUrl,
                    fileName,
                    this.scene
                );
                
                // Create container mesh
                const container = new BABYLON.TransformNode(name + "_container", this.scene);
                
                result.meshes.forEach(mesh => {
                    if (mesh.name !== "__root__") {
                        mesh.parent = container;
                        mesh.isVisible = false; // Hide original, we'll clone it
                    }
                });
                
                // Stop all animations initially
                result.animationGroups.forEach(ag => {
                    ag.stop();
                });
                
                // Store animation groups, skeletons for cloning
                container.metadata = {
                    animationGroups: result.animationGroups,
                    skeletons: result.skeletons,
                    meshes: result.meshes,
                    originalPath: path
                };
                
                // Log available animations
                if (result.animationGroups.length > 0) {
                    console.log(`🎬 Animations for ${name}:`, result.animationGroups.map(ag => ag.name));
                }
                if (result.skeletons.length > 0) {
                    console.log(`🦴 Skeletons for ${name}:`, result.skeletons.length);
                }
                
                // Cache the model
                this.loadedModels.set(name, container);
                
                console.log(`✅ Model loaded: ${name} (${result.meshes.length} meshes, ${result.animationGroups.length} animations)`);
                resolve(container);
                
            } catch (error) {
                console.error(`❌ Failed to load model ${name}:`, error);
                reject(error);
            }
        });
        
        this.loadingPromises.set(name, loadPromise);
        return loadPromise;
    }
    
    // Clone a cached model for reuse (with animations)
    cloneModel(name, original) {
        const clone = new BABYLON.TransformNode(name + "_instance_" + Date.now(), this.scene);
        
        // Clone meshes
        const clonedMeshes = [];
        original.getChildMeshes().forEach(mesh => {
            const clonedMesh = mesh.clone(mesh.name + "_clone", clone);
            clonedMesh.isVisible = true;
            clonedMeshes.push(clonedMesh);
        });
        
        // Clone skeleton if exists
        let clonedSkeleton = null;
        if (original.metadata && original.metadata.skeletons && original.metadata.skeletons.length > 0) {
            clonedSkeleton = original.metadata.skeletons[0].clone(name + "_skeleton_" + Date.now());
            
            // Attach skeleton to cloned meshes
            clonedMeshes.forEach(mesh => {
                if (mesh.skeleton) {
                    mesh.skeleton = clonedSkeleton;
                }
            });
        }
        
        // Clone animation groups and retarget to cloned skeleton
        const clonedAnimationGroups = [];
        if (original.metadata && original.metadata.animationGroups) {
            original.metadata.animationGroups.forEach(ag => {
                const clonedAG = ag.clone(ag.name + "_clone_" + Date.now());
                
                // Retarget animations to cloned skeleton bones
                if (clonedSkeleton) {
                    clonedAG.targetedAnimations.forEach(ta => {
                        const boneName = ta.target.name;
                        const newTarget = clonedSkeleton.bones.find(b => b.name === boneName);
                        if (newTarget) {
                            ta.target = newTarget;
                        }
                    });
                }
                
                clonedAG.stop();
                clonedAnimationGroups.push(clonedAG);
            });
        }
        
        // Store references on clone
        clone.metadata = {
            animationGroups: clonedAnimationGroups,
            skeleton: clonedSkeleton,
            meshes: clonedMeshes
        };
        
        return clone;
    }
    
    // Get a loaded model (returns clone)
    getModel(name) {
        if (this.loadedModels.has(name)) {
            return this.cloneModel(name, this.loadedModels.get(name));
        }
        return null;
    }
    
    // Preload multiple models
    async preloadModels(modelList) {
        const promises = modelList.map(({ name, path }) => 
            this.loadModel(name, path).catch(e => {
                console.warn(`Could not preload ${name}:`, e);
                return null;
            })
        );
        
        await Promise.all(promises);
        console.log(`📦 Preloaded ${modelList.length} models`);
    }
}


/* ============================================================================
   ANIMATION CONTROLLER - Manages character animations
   ============================================================================ */

class AnimationController {
    constructor(mesh) {
        this.mesh = mesh;
        this.animationGroups = new Map();
        this.currentAnimation = null;
        this.blendTime = 0.1;
        
        // Extract animations from mesh metadata
        if (mesh.metadata && mesh.metadata.animationGroups) {
            mesh.metadata.animationGroups.forEach(ag => {
                // Normalize animation names
                const name = this.normalizeAnimationName(ag.name);
                this.animationGroups.set(name, ag);
                console.log(`  📎 Registered animation: "${ag.name}" as "${name}"`);
            });
        }
    }
    
    normalizeAnimationName(name) {
        // Convert animation names to standard format
        const lowerName = name.toLowerCase();
        
        if (lowerName.includes('idle') || lowerName.includes('stand')) return 'idle';
        if (lowerName.includes('walk')) return 'walk';
        if (lowerName.includes('run') || lowerName.includes('sprint')) return 'run';
        if (lowerName.includes('jump')) return 'jump';
        if (lowerName.includes('attack') || lowerName.includes('punch') || lowerName.includes('hit')) return 'attack';
        if (lowerName.includes('death') || lowerName.includes('die')) return 'death';
        if (lowerName.includes('fly') || lowerName.includes('hover')) return 'fly';
        if (lowerName.includes('fall')) return 'fall';
        if (lowerName.includes('land')) return 'land';
        if (lowerName.includes('crouch')) return 'crouch';
        
        return lowerName; // Return original if no match
    }
    
    play(animationName, loop = true, speed = 1.0, blendIn = true) {
        const ag = this.animationGroups.get(animationName);
        
        if (!ag) {
            // Try to find partial match
            for (const [name, group] of this.animationGroups) {
                if (name.includes(animationName) || animationName.includes(name)) {
                    return this.play(name, loop, speed, blendIn);
                }
            }
            return false;
        }
        
        // Don't restart same animation
        if (this.currentAnimation === animationName && ag.isPlaying) {
            return true;
        }
        
        // Stop current animation
        if (this.currentAnimation) {
            const currentAG = this.animationGroups.get(this.currentAnimation);
            if (currentAG) {
                if (blendIn) {
                    // Fade out
                    currentAG.setWeightForAllAnimatables(0);
                }
                currentAG.stop();
            }
        }
        
        // Play new animation
        ag.speedRatio = speed;
        ag.loopAnimation = loop;
        ag.play(loop);
        
        if (blendIn) {
            ag.setWeightForAllAnimatables(1);
        }
        
        this.currentAnimation = animationName;
        return true;
    }
    
    stop(animationName = null) {
        if (animationName) {
            const ag = this.animationGroups.get(animationName);
            if (ag) ag.stop();
            if (this.currentAnimation === animationName) {
                this.currentAnimation = null;
            }
        } else {
            // Stop all
            this.animationGroups.forEach(ag => ag.stop());
            this.currentAnimation = null;
        }
    }
    
    stopAll() {
        this.animationGroups.forEach(ag => ag.stop());
        this.currentAnimation = null;
    }
    
    hasAnimation(name) {
        return this.animationGroups.has(name);
    }
    
    getAnimationNames() {
        return Array.from(this.animationGroups.keys());
    }
    
    setSpeed(speed) {
        if (this.currentAnimation) {
            const ag = this.animationGroups.get(this.currentAnimation);
            if (ag) ag.speedRatio = speed;
        }
    }
}
