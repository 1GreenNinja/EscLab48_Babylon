/* ============================================================================
   ESCAPE LAB 48 - BABYLON.JS EDITION
   Physics Manager - Havok physics wrapper
   ============================================================================ */

class PhysicsManager {
    constructor(scene) {
        this.scene = scene;
    }
    
    // Create a physics-enabled ground plane
    createGround(width, depth, position) {
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {
            width: width,
            height: depth
        }, this.scene);
        
        ground.position = position || BABYLON.Vector3.Zero();
        ground.receiveShadows = true;
        
        // Physics aggregate for ground (static body)
        new BABYLON.PhysicsAggregate(
            ground,
            BABYLON.PhysicsShapeType.BOX,
            { mass: 0, friction: GAME.PHYSICS.FRICTION },
            this.scene
        );
        
        return ground;
    }
    
    // Create a physics box (walls, floors, etc.)
    createBox(name, options, position, isStatic = true) {
        const box = BABYLON.MeshBuilder.CreateBox(name, options, this.scene);
        box.position = position;
        
        new BABYLON.PhysicsAggregate(
            box,
            BABYLON.PhysicsShapeType.BOX,
            { mass: isStatic ? 0 : 1, friction: GAME.PHYSICS.FRICTION },
            this.scene
        );
        
        return box;
    }
    
    // Create a capsule collider for characters
    createCapsule(name, height, radius, position) {
        const capsule = BABYLON.MeshBuilder.CreateCapsule(name, {
            height: height,
            radius: radius
        }, this.scene);
        
        capsule.position = position;
        
        new BABYLON.PhysicsAggregate(
            capsule,
            BABYLON.PhysicsShapeType.CAPSULE,
            { 
                mass: 80,  // ~80kg human
                friction: GAME.PHYSICS.FRICTION,
                restitution: 0
            },
            this.scene
        );
        
        return capsule;
    }
    
    // Create a cylinder (bars, poles, etc.)
    createCylinder(name, height, diameter, position, isStatic = true) {
        const cylinder = BABYLON.MeshBuilder.CreateCylinder(name, {
            height: height,
            diameter: diameter
        }, this.scene);
        
        cylinder.position = position;
        
        if (isStatic) {
            new BABYLON.PhysicsAggregate(
                cylinder,
                BABYLON.PhysicsShapeType.CYLINDER,
                { mass: 0, friction: GAME.PHYSICS.FRICTION },
                this.scene
            );
        }
        
        return cylinder;
    }
    
    // Raycast for ground detection
    raycastDown(origin, distance = 2) {
        const ray = new BABYLON.Ray(origin, BABYLON.Vector3.Down(), distance);
        const hit = this.scene.pickWithRay(ray, (mesh) => {
            return mesh.physicsBody && mesh.name !== "playerCollider";
        });
        return hit;
    }
    
    // Raycast for interaction
    raycastForward(origin, direction, distance = 3) {
        const ray = new BABYLON.Ray(origin, direction, distance);
        const hit = this.scene.pickWithRay(ray);
        return hit;
    }
}
