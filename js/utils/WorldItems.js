/**
 * WorldItems.js - Modular system for placing and managing game world items
 * 
 * USAGE:
 *   const items = new WorldItems(scene);
 *   items.place('keycard', { x: 2, y: 1, z: -1 }, { glow: true, interactable: true });
 *   items.moveTo(myMesh, { x: 3, y: 0, z: 0 }, { duration: 1000, easing: 'easeOut' });
 *   items.placeRelativeTo(parent, child, { offset: { x: 0, y: 1, z: 0 } });
 */

class WorldItems {
    constructor(scene) {
        this.scene = scene;
        this.items = new Map();
        this.animations = [];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // POSITIONING HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Convert various position formats to Vector3
     * @param {Object|Array|Vector3} pos - Position as {x,y,z}, [x,y,z], or Vector3
     */
    toVector3(pos) {
        if (pos instanceof BABYLON.Vector3) return pos;
        if (Array.isArray(pos)) return new BABYLON.Vector3(pos[0], pos[1], pos[2]);
        if (typeof pos === 'object') return new BABYLON.Vector3(pos.x || 0, pos.y || 0, pos.z || 0);
        throw new Error('Invalid position format');
    }

    /**
     * Convert rotation formats to Vector3 (in radians)
     * @param {Object|Array|Vector3|number} rot - Rotation input
     */
    toRotation(rot) {
        if (rot instanceof BABYLON.Vector3) return rot;
        if (typeof rot === 'number') return new BABYLON.Vector3(0, rot, 0); // Y-axis rotation only
        if (Array.isArray(rot)) return new BABYLON.Vector3(rot[0], rot[1], rot[2] || 0);
        if (typeof rot === 'object') {
            // Accept degrees or radians
            const toRad = (v, key) => {
                if (typeof v === 'number') {
                    // Assume degrees if value > 2π (about 6.28)
                    return Math.abs(v) > 6.28 ? v * Math.PI / 180 : v;
                }
                return 0;
            };
            return new BABYLON.Vector3(
                toRad(rot.x || rot.pitch || 0),
                toRad(rot.y || rot.yaw || 0),
                toRad(rot.z || rot.roll || 0)
            );
        }
        return BABYLON.Vector3.Zero();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ROOM COORDINATE SYSTEM
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Get room-relative position using named walls
     * Room coordinates: SOUTH=X+, NORTH=X-, EAST=Z+, WEST=Z-
     * 
     * @param {Object} roomBounds - {minX, maxX, minZ, maxZ, floorY, ceilingY}
     * @param {Object} relativePos - {wall: 'south'/'north'/'east'/'west', distance: number, height: number}
     */
    getRoomPosition(roomBounds, relativePos) {
        const { wall, distance = 0, height = 0, alongWall = 0 } = relativePos;
        
        const centerX = (roomBounds.minX + roomBounds.maxX) / 2;
        const centerZ = (roomBounds.minZ + roomBounds.maxZ) / 2;
        const y = (roomBounds.floorY || 0) + height;

        switch (wall?.toLowerCase()) {
            case 'south': // X+ wall
                return new BABYLON.Vector3(roomBounds.maxX - distance, y, centerZ + alongWall);
            case 'north': // X- wall
                return new BABYLON.Vector3(roomBounds.minX + distance, y, centerZ + alongWall);
            case 'east': // Z+ wall
                return new BABYLON.Vector3(centerX + alongWall, y, roomBounds.maxZ - distance);
            case 'west': // Z- wall
                return new BABYLON.Vector3(centerX + alongWall, y, roomBounds.minZ + distance);
            case 'floor':
                return new BABYLON.Vector3(centerX + alongWall, roomBounds.floorY || 0, centerZ + distance);
            case 'ceiling':
                return new BABYLON.Vector3(centerX + alongWall, roomBounds.ceilingY || 4, centerZ + distance);
            case 'center':
            default:
                return new BABYLON.Vector3(centerX + (relativePos.x || 0), y, centerZ + (relativePos.z || 0));
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ENTITY PLACEMENT
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Place a mesh at a position with optional configuration
     * @param {Mesh} mesh - Babylon.js mesh to place
     * @param {Object} position - Position (flexible format)
     * @param {Object} options - Configuration options
     */
    placeMesh(mesh, position, options = {}) {
        const pos = this.toVector3(position);
        mesh.position = pos;

        if (options.rotation !== undefined) {
            mesh.rotation = this.toRotation(options.rotation);
        }

        if (options.scale !== undefined) {
            const scale = typeof options.scale === 'number' 
                ? new BABYLON.Vector3(options.scale, options.scale, options.scale)
                : this.toVector3(options.scale);
            mesh.scaling = scale;
        }

        if (options.parent) {
            mesh.parent = options.parent;
        }

        if (options.glow && this.scene.glowLayer) {
            // Ensure mesh name triggers glow filter
            if (!mesh.name.includes('glow')) {
                mesh.name = mesh.name + '_glow';
            }
        }

        if (options.interactable) {
            mesh.metadata = {
                ...mesh.metadata,
                interactable: true,
                type: options.type || 'item',
                name: options.name || mesh.name,
                ...options.metadata
            };
        }

        // Track this item
        this.items.set(mesh.name, { mesh, position: pos, options });

        return mesh;
    }

    /**
     * Place a mesh relative to another mesh
     * @param {Mesh} parent - Reference mesh
     * @param {Mesh} child - Mesh to place
     * @param {Object} offset - Offset from parent
     * @param {Object} options - Additional options
     */
    placeRelativeTo(parent, child, offset, options = {}) {
        const parentPos = parent.position || parent.getAbsolutePosition();
        const offsetVec = this.toVector3(offset);
        
        // If parent has rotation, rotate the offset accordingly
        if (parent.rotation && options.respectRotation !== false) {
            const rotMatrix = BABYLON.Matrix.RotationYawPitchRoll(
                parent.rotation.y, parent.rotation.x, parent.rotation.z
            );
            const rotatedOffset = BABYLON.Vector3.TransformCoordinates(offsetVec, rotMatrix);
            child.position = parentPos.add(rotatedOffset);
        } else {
            child.position = parentPos.add(offsetVec);
        }

        if (options.inheritRotation) {
            child.rotation = parent.rotation.clone();
        }

        if (options.asChild) {
            child.parent = parent;
            child.position = offsetVec; // Local position when parented
        }

        return child;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ANIMATED MOVEMENT
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Smoothly move a mesh to a new position
     * @param {Mesh} mesh - Mesh to move
     * @param {Object} targetPos - Target position
     * @param {Object} options - Animation options
     * @returns {Promise} Resolves when animation completes
     */
    moveTo(mesh, targetPos, options = {}) {
        const {
            duration = 1000, // ms
            easing = 'linear',
            onProgress = null,
            onComplete = null
        } = options;

        const target = this.toVector3(targetPos);
        const start = mesh.position.clone();
        const startTime = performance.now();

        // Easing functions
        const easingFuncs = {
            linear: t => t,
            easeIn: t => t * t,
            easeOut: t => t * (2 - t),
            easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
            bounce: t => {
                if (t < 0.5) return 2 * t * t;
                t = t - 0.5;
                return 0.5 + t * (1 - t) * 4;
            }
        };

        const easingFunc = easingFuncs[easing] || easingFuncs.linear;

        return new Promise((resolve) => {
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easedProgress = easingFunc(progress);

                mesh.position = BABYLON.Vector3.Lerp(start, target, easedProgress);

                if (onProgress) onProgress(progress);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    mesh.position = target;
                    if (onComplete) onComplete();
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    /**
     * Smoothly rotate a mesh to a new orientation
     * @param {Mesh} mesh - Mesh to rotate
     * @param {Object} targetRot - Target rotation
     * @param {Object} options - Animation options
     */
    rotateTo(mesh, targetRot, options = {}) {
        const { duration = 500, easing = 'easeOut' } = options;
        const target = this.toRotation(targetRot);
        const start = mesh.rotation.clone();
        const startTime = performance.now();

        const easingFuncs = {
            linear: t => t,
            easeIn: t => t * t,
            easeOut: t => t * (2 - t),
            easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        };

        const easingFunc = easingFuncs[easing] || easingFuncs.linear;

        return new Promise((resolve) => {
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easedProgress = easingFunc(progress);

                mesh.rotation = BABYLON.Vector3.Lerp(start, target, easedProgress);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    mesh.rotation = target;
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CHARACTER PLACEMENT (for Jake, NPCs, enemies)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Position a character on a surface (bed, floor, chair)
     * @param {Object} character - Character entity (has mesh, visualMesh)
     * @param {Mesh} surface - Surface to place on
     * @param {Object} options - Placement options
     */
    placeCharacterOnSurface(character, surface, options = {}) {
        const {
            pose = 'standing',  // standing, sitting, lying, prone
            faceDirection = 'north', // north, south, east, west
            offset = { x: 0, y: 0, z: 0 }
        } = options;

        // Get surface bounds
        const bounds = surface.getBoundingInfo().boundingBox;
        const surfaceTop = surface.position.y + bounds.extendSize.y;
        const surfaceCenter = surface.position.clone();

        // Base position on surface
        let pos = new BABYLON.Vector3(
            surfaceCenter.x + (offset.x || 0),
            surfaceTop + (offset.y || 0),
            surfaceCenter.z + (offset.z || 0)
        );

        // Calculate facing rotation (Y-axis)
        const faceAngles = {
            'north': Math.PI,      // Face -X
            'south': 0,            // Face +X  
            'east': -Math.PI / 2,  // Face +Z
            'west': Math.PI / 2    // Face -Z
        };
        const faceY = faceAngles[faceDirection?.toLowerCase()] || 0;

        // Pose adjustments
        let rotation = new BABYLON.Vector3(0, faceY, 0);
        
        switch (pose) {
            case 'lying':
            case 'supine':
                // Lying on back - rotate 90° around X or Z based on facing
                rotation.x = -Math.PI / 2;
                pos.y += 0.3; // Lift slightly off surface
                break;
            case 'prone':
                // Lying face down
                rotation.x = Math.PI / 2;
                pos.y += 0.3;
                break;
            case 'sitting':
                // Sitting - adjust Y to account for leg bend
                pos.y -= 0.4;
                break;
            case 'standing':
            default:
                // Normal standing
                pos.y += 0.5; // Half-height offset for capsule
                break;
        }

        // Apply to character
        if (character.mesh) {
            character.mesh.position = pos;
        }
        
        if (character.visualMesh) {
            character.visualMesh.position = new BABYLON.Vector3(0, 0, 0);
            character.visualMesh.rotation = rotation;
        }

        return pos;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Get world bounds of all placed items
     */
    getBounds() {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        this.items.forEach(({ position }) => {
            minX = Math.min(minX, position.x);
            maxX = Math.max(maxX, position.x);
            minY = Math.min(minY, position.y);
            maxY = Math.max(maxY, position.y);
            minZ = Math.min(minZ, position.z);
            maxZ = Math.max(maxZ, position.z);
        });

        return { minX, maxX, minY, maxY, minZ, maxZ };
    }

    /**
     * Find item by name
     * @param {string} name - Item name to find
     */
    getItem(name) {
        return this.items.get(name);
    }

    /**
     * Debug: Draw axes at a position
     * @param {Object} position - Position to draw axes
     * @param {number} size - Size of axes
     */
    debugAxes(position, size = 1) {
        const pos = this.toVector3(position);
        
        // X axis - Red (points toward South/+X)
        const xLine = BABYLON.MeshBuilder.CreateLines("debugX", {
            points: [pos, pos.add(new BABYLON.Vector3(size, 0, 0))]
        }, this.scene);
        xLine.color = new BABYLON.Color3(1, 0, 0);

        // Y axis - Green (points up)
        const yLine = BABYLON.MeshBuilder.CreateLines("debugY", {
            points: [pos, pos.add(new BABYLON.Vector3(0, size, 0))]
        }, this.scene);
        yLine.color = new BABYLON.Color3(0, 1, 0);

        // Z axis - Blue (points toward East/+Z)
        const zLine = BABYLON.MeshBuilder.CreateLines("debugZ", {
            points: [pos, pos.add(new BABYLON.Vector3(0, 0, size))]
        }, this.scene);
        zLine.color = new BABYLON.Color3(0, 0, 1);

        return { xLine, yLine, zLine };
    }

    /**
     * Debug: Label a position in 3D space
     * @param {string} text - Label text
     * @param {Object} position - Position for label
     */
    debugLabel(text, position) {
        const pos = this.toVector3(position);
        
        // Create a simple plane with text
        const plane = BABYLON.MeshBuilder.CreatePlane("debugLabel_" + text, { size: 0.5 }, this.scene);
        plane.position = pos;
        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

        // Create texture for text
        const texture = new BABYLON.DynamicTexture("debugLabelTex_" + text, { width: 256, height: 128 }, this.scene);
        texture.drawText(text, null, null, "bold 24px Arial", "white", "transparent", true);

        const mat = new BABYLON.StandardMaterial("debugLabelMat_" + text, this.scene);
        mat.diffuseTexture = texture;
        mat.emissiveColor = BABYLON.Color3.White();
        mat.backFaceCulling = false;
        plane.material = mat;

        return plane;
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.WorldItems = WorldItems;
}
