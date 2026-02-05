/* ============================================================================
   ESCAPE LAB 48 - BABYLON.JS EDITION
   Level 2: Rescue Mission
   Find and rescue the three women: Sarah, Dr. Chen, and Emma
   ============================================================================ */

class Level2_Rescue {
    constructor(gameEngine) {
        this.game = gameEngine;
        this.scene = gameEngine.scene;
        
        this.npcs = [];
        this.enemies = [];
        this.drones = [];
        this.jetpackGirl = null;
        this.rescuedCount = 0;
        this.totalNpcs = 3;
        this.exitUnlocked = false;
        
        // Player spawn point
        this.playerSpawn = new BABYLON.Vector3(0, 1, 0);
    }
    
    async build() {
        // Update HUD
        document.getElementById('levelDisplay').textContent = "LEVEL 2: RESCUE MISSION";
        document.getElementById('objectiveDisplay').textContent = 
            `Objective: Find and rescue the women (0/${this.totalNpcs})`;
        
        // Create facility layout
        this.createFacility();
        
        // Create Jetpack Girl flying around!
        await this.createJetpackGirl();
        
        // Place NPCs (with model loading)
        await this.createNPCs();
        
        // Create enemies - Guards, Drones, Turrets, Mechs, and Zombies!
        await this.createEnemies();
        
        // Create obstacles
        this.createObstacles();
        
        // Create pickups (weapons, health, armor)
        this.createPickups();
        
        // Lighting
        this.createLighting();
        
        // Exit
        this.createExit();
        
        // Create boss arena (unlocked after rescue)
        this.createBossArena();
        
        // Show intro dialogue
        setTimeout(() => {
            this.game.dialogue.show([
                { speaker: "Jake", text: "I'm in the facility. Sarah and the others must be here somewhere." },
                { speaker: "Jake", text: "Guards and drones everywhere... I need to be careful." },
                { speaker: "Jake", text: "Or maybe I should just smash through them with my strength!" }
            ]);
        }, 1000);
    }
    
    async createEnemies() {
        const modelLoader = this.game.modelLoader;
        
        // === GUARDS ===
        const guardPositions = [
            new BABYLON.Vector3(-5, 0, 8),
            new BABYLON.Vector3(5, 0, 12),
            new BABYLON.Vector3(-10, 0, 3),
            new BABYLON.Vector3(10, 0, -2),
            new BABYLON.Vector3(0, 0, 20),
            new BABYLON.Vector3(-8, 0, 15),
        ];
        
        for (const pos of guardPositions) {
            const guard = new Guard(this.scene, pos);
            await guard.init(modelLoader);
            
            // Set patrol route
            guard.setPatrolPoints([
                pos.clone(),
                pos.add(new BABYLON.Vector3(3, 0, 0)),
                pos.add(new BABYLON.Vector3(3, 0, 3)),
                pos.add(new BABYLON.Vector3(0, 0, 3))
            ]);
            
            this.enemies.push(guard);
        }
        
        // === DRONES ===
        const dronePositions = [
            new BABYLON.Vector3(0, 0, 5),
            new BABYLON.Vector3(-6, 0, 15),
            new BABYLON.Vector3(8, 0, 10),
            new BABYLON.Vector3(0, 0, 25),
        ];
        
        for (const pos of dronePositions) {
            const drone = new Drone(this.scene, pos);
            await drone.init(modelLoader);
            
            // Set patrol route (wider for drones)
            drone.setPatrolPoints([
                pos.clone(),
                pos.add(new BABYLON.Vector3(8, 0, 0)),
                pos.add(new BABYLON.Vector3(8, 0, 8)),
                pos.add(new BABYLON.Vector3(0, 0, 8))
            ]);
            
            this.drones.push(drone);
            this.enemies.push(drone);
        }
        
        // === TURRETS ===
        const turretPositions = [
            new BABYLON.Vector3(-12, 0, 8),   // Near Sarah's cell
            new BABYLON.Vector3(12, 0, 3),    // Near Lab room
            new BABYLON.Vector3(0, 0, 28),    // Near control room
        ];
        
        for (const pos of turretPositions) {
            const turret = new Turret(this.scene, pos);
            await turret.init(modelLoader);
            this.enemies.push(turret);
        }
        
        // === SCIENTIST ZOMBIES ===
        const zombiePositions = [
            new BABYLON.Vector3(-11, 0, 7),   // In Sarah's cell hallway
            new BABYLON.Vector3(11, 0, 1),    // Near lab
            new BABYLON.Vector3(-3, 0, 18),   // Main corridor
            new BABYLON.Vector3(3, 0, 22),    // Near control room
        ];
        
        for (const pos of zombiePositions) {
            const zombie = new ScientistZombie(this.scene, pos);
            await zombie.init(modelLoader);
            
            zombie.setPatrolPoints([
                pos.clone(),
                pos.add(new BABYLON.Vector3(2, 0, 0)),
                pos.add(new BABYLON.Vector3(2, 0, 2)),
                pos.add(new BABYLON.Vector3(0, 0, 2))
            ]);
            
            this.enemies.push(zombie);
        }
        
        // === MECH (mini-boss) ===
        const mech = new Mech(this.scene, new BABYLON.Vector3(0, 0, 24));
        await mech.init(modelLoader);
        mech.setPatrolPoints([
            new BABYLON.Vector3(0, 0, 24),
            new BABYLON.Vector3(-3, 0, 24),
            new BABYLON.Vector3(-3, 0, 27),
            new BABYLON.Vector3(3, 0, 27),
            new BABYLON.Vector3(3, 0, 24),
            new BABYLON.Vector3(0, 0, 24)
        ]);
        this.enemies.push(mech);
        this.mech = mech;
        
        console.log(`Created ${guardPositions.length} guards, ${dronePositions.length} drones, ${turretPositions.length} turrets, ${zombiePositions.length} zombies, and 1 mech`);
    }
    
    createPickups() {
        // === WEAPON PICKUPS ===
        const weaponPickups = [
            { pos: new BABYLON.Vector3(-3, 0.5, 5), type: 'pistol', name: 'Pistol' },
            { pos: new BABYLON.Vector3(6, 0.5, 8), type: 'rifle', name: 'Assault Rifle' },
            { pos: new BABYLON.Vector3(-11, 0.5, 3), type: 'shotgun', name: 'Shotgun' },
        ];
        
        weaponPickups.forEach(pickup => {
            const weapon = BABYLON.MeshBuilder.CreateBox(`pickup_${pickup.type}`, {
                width: 0.6,
                height: 0.3,
                depth: 0.2
            }, this.scene);
            weapon.position = pickup.pos;
            
            const mat = new BABYLON.StandardMaterial(`pickup_${pickup.type}_mat`, this.scene);
            mat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.35);
            mat.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.15);
            weapon.material = mat;
            
            weapon.metadata = {
                interactable: true,
                type: 'weapon',
                weaponType: pickup.type,
                name: pickup.name
            };
            
            // Floating animation
            const floatAnim = new BABYLON.Animation("float", "position.y", 30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
            floatAnim.setKeys([
                { frame: 0, value: pickup.pos.y },
                { frame: 30, value: pickup.pos.y + 0.2 },
                { frame: 60, value: pickup.pos.y }
            ]);
            weapon.animations.push(floatAnim);
            this.scene.beginAnimation(weapon, 0, 60, true);
            
            // Rotation
            const rotAnim = new BABYLON.Animation("rotate", "rotation.y", 30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
            rotAnim.setKeys([
                { frame: 0, value: 0 },
                { frame: 60, value: Math.PI * 2 }
            ]);
            weapon.animations.push(rotAnim);
            this.scene.beginAnimation(weapon, 0, 60, true);
        });
        
        // === HEALTH PICKUPS ===
        const healthPickups = [
            { pos: new BABYLON.Vector3(2, 0.3, 10), amount: 25, name: 'Small Medkit' },
            { pos: new BABYLON.Vector3(-5, 0.3, 15), amount: 50, name: 'Large Medkit' },
            { pos: new BABYLON.Vector3(8, 0.3, 20), amount: 25, name: 'Small Medkit' },
        ];
        
        healthPickups.forEach((pickup, i) => {
            const health = BABYLON.MeshBuilder.CreateBox(`health_${i}`, {
                width: 0.4,
                height: 0.4,
                depth: 0.4
            }, this.scene);
            health.position = pickup.pos;
            
            const mat = new BABYLON.StandardMaterial(`health_${i}_mat`, this.scene);
            mat.diffuseColor = new BABYLON.Color3(1, 1, 1);
            mat.emissiveColor = new BABYLON.Color3(0.3, 0, 0);
            health.material = mat;
            
            // Red cross
            const cross1 = BABYLON.MeshBuilder.CreateBox(`cross1_${i}`, { width: 0.3, height: 0.1, depth: 0.05 }, this.scene);
            cross1.position.z = 0.21;
            cross1.parent = health;
            const cross2 = BABYLON.MeshBuilder.CreateBox(`cross2_${i}`, { width: 0.1, height: 0.3, depth: 0.05 }, this.scene);
            cross2.position.z = 0.21;
            cross2.parent = health;
            
            const redMat = new BABYLON.StandardMaterial(`red_${i}`, this.scene);
            redMat.diffuseColor = new BABYLON.Color3(1, 0, 0);
            redMat.emissiveColor = new BABYLON.Color3(0.5, 0, 0);
            cross1.material = redMat;
            cross2.material = redMat;
            
            health.metadata = {
                interactable: true,
                type: 'health',
                healAmount: pickup.amount,
                name: pickup.name
            };
            
            // Floating animation
            const floatAnim = new BABYLON.Animation("float", "position.y", 30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
            floatAnim.setKeys([
                { frame: 0, value: pickup.pos.y },
                { frame: 30, value: pickup.pos.y + 0.15 },
                { frame: 60, value: pickup.pos.y }
            ]);
            health.animations.push(floatAnim);
            this.scene.beginAnimation(health, 0, 60, true);
        });
        
        // === ARMOR PICKUPS ===
        const armorPickups = [
            { pos: new BABYLON.Vector3(-8, 0.3, 10), amount: 25, name: 'Light Vest' },
            { pos: new BABYLON.Vector3(10, 0.3, 15), amount: 50, name: 'Combat Vest' },
        ];
        
        armorPickups.forEach((pickup, i) => {
            const armor = BABYLON.MeshBuilder.CreateCylinder(`armor_${i}`, {
                height: 0.5,
                diameter: 0.5
            }, this.scene);
            armor.position = pickup.pos;
            
            const mat = new BABYLON.StandardMaterial(`armor_${i}_mat`, this.scene);
            mat.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.8);
            mat.emissiveColor = new BABYLON.Color3(0.1, 0.2, 0.4);
            armor.material = mat;
            
            armor.metadata = {
                interactable: true,
                type: 'armor',
                armorAmount: pickup.amount,
                name: pickup.name
            };
            
            // Floating animation
            const floatAnim = new BABYLON.Animation("float", "position.y", 30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
            floatAnim.setKeys([
                { frame: 0, value: pickup.pos.y },
                { frame: 30, value: pickup.pos.y + 0.15 },
                { frame: 60, value: pickup.pos.y }
            ]);
            armor.animations.push(floatAnim);
            this.scene.beginAnimation(armor, 0, 60, true);
        });
        
        // === AMMO PICKUPS ===
        const ammoPickups = [
            { pos: new BABYLON.Vector3(0, 0.2, 12), type: 'pistol', amount: 30 },
            { pos: new BABYLON.Vector3(-4, 0.2, 18), type: 'rifle', amount: 60 },
            { pos: new BABYLON.Vector3(5, 0.2, 25), type: 'shotgun', amount: 16 },
        ];
        
        ammoPickups.forEach((pickup, i) => {
            const ammo = BABYLON.MeshBuilder.CreateBox(`ammo_${i}`, {
                width: 0.3,
                height: 0.2,
                depth: 0.2
            }, this.scene);
            ammo.position = pickup.pos;
            
            const mat = new BABYLON.StandardMaterial(`ammo_${i}_mat`, this.scene);
            mat.diffuseColor = new BABYLON.Color3(0.7, 0.6, 0.2);
            mat.emissiveColor = new BABYLON.Color3(0.3, 0.25, 0.1);
            ammo.material = mat;
            
            ammo.metadata = {
                interactable: true,
                type: 'powerup',
                powerupType: 'ammo',
                ammoType: pickup.type,
                amount: pickup.amount,
                name: `${pickup.type} Ammo`
            };
        });
        
        console.log('Created weapon, health, armor, and ammo pickups');
    }
    
    createBossArena() {
        // Boss arena is behind the exit, unlocked after all NPCs rescued
        const arenaX = 0;
        const arenaZ = 45;
        const arenaSize = 20;
        
        // Arena floor
        const floor = BABYLON.MeshBuilder.CreateBox("bossArenaFloor", {
            width: arenaSize,
            height: 0.5,
            depth: arenaSize
        }, this.scene);
        floor.position = new BABYLON.Vector3(arenaX, -0.25, arenaZ);
        
        const floorMat = new BABYLON.StandardMaterial("bossFloorMat", this.scene);
        floorMat.diffuseColor = new BABYLON.Color3(0.3, 0.25, 0.2);
        floor.material = floorMat;
        floor.receiveShadows = true;
        new BABYLON.PhysicsAggregate(floor, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Arena walls
        const wallMat = new BABYLON.StandardMaterial("bossWallMat", this.scene);
        wallMat.diffuseColor = new BABYLON.Color3(0.4, 0.35, 0.3);
        
        // Back wall
        const backWall = BABYLON.MeshBuilder.CreateBox("bossBack", {
            width: arenaSize,
            height: 8,
            depth: 0.5
        }, this.scene);
        backWall.position = new BABYLON.Vector3(arenaX, 4, arenaZ + arenaSize/2);
        backWall.material = wallMat;
        new BABYLON.PhysicsAggregate(backWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Side walls
        [-1, 1].forEach(side => {
            const sideWall = BABYLON.MeshBuilder.CreateBox(`bossSide_${side}`, {
                width: 0.5,
                height: 8,
                depth: arenaSize
            }, this.scene);
            sideWall.position = new BABYLON.Vector3(arenaX + side * arenaSize/2, 4, arenaZ);
            sideWall.material = wallMat;
            new BABYLON.PhysicsAggregate(sideWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        });
        
        // Cover pillars for player
        const pillarMat = new BABYLON.StandardMaterial("pillarMat", this.scene);
        pillarMat.diffuseColor = new BABYLON.Color3(0.35, 0.35, 0.4);
        
        const pillarPositions = [
            new BABYLON.Vector3(-5, 1.5, 40),
            new BABYLON.Vector3(5, 1.5, 40),
            new BABYLON.Vector3(-7, 1.5, 48),
            new BABYLON.Vector3(7, 1.5, 48),
        ];
        
        pillarPositions.forEach((pos, i) => {
            const pillar = BABYLON.MeshBuilder.CreateCylinder(`pillar_${i}`, {
                height: 3,
                diameter: 1.5
            }, this.scene);
            pillar.position = pos;
            pillar.material = pillarMat;
            new BABYLON.PhysicsAggregate(pillar, BABYLON.PhysicsShapeType.CYLINDER, { mass: 0 }, this.scene);
        });
        
        // Dramatic red lighting
        const bossLight = new BABYLON.PointLight("bossLight", new BABYLON.Vector3(arenaX, 6, arenaZ), this.scene);
        bossLight.diffuse = new BABYLON.Color3(1, 0.3, 0.2);
        bossLight.intensity = 0.8;
        bossLight.range = 30;
        
        // Boss spawn point (will spawn when exit unlocked)
        this.bossSpawnPoint = new BABYLON.Vector3(arenaX, 0, arenaZ + 5);
        this.bossArenaCenter = new BABYLON.Vector3(arenaX, 0, arenaZ);
        
        console.log('Boss arena created');
    }
    
    createFacility() {
        // Main corridor
        this.createCorridor(0, 0, 30, 5, 4);
        
        // Branch corridors connecting to rooms
        this.createCorridor(-8, 0, 10, 5, 4, Math.PI / 2); // Left branch
        this.createCorridor(8, 0, 10, 5, 4, -Math.PI / 2); // Right branch
        
        // Rooms where NPCs are held
        this.createRoom(new BABYLON.Vector3(-12, 0, 5), "Sarah's Cell");
        this.createRoom(new BABYLON.Vector3(12, 0, 0), "Lab Room");
        this.createRoom(new BABYLON.Vector3(0, 0, 25), "Control Room");
        
        // Add outer boundaries to prevent falling off
        this.createBoundaries();
    }
    
    createBoundaries() {
        // Create invisible walls around the play area
        const boundaryMat = new BABYLON.StandardMaterial("boundaryMat", this.scene);
        boundaryMat.alpha = 0; // Invisible
        
        const boundaryHeight = 10;
        const playAreaSize = 40; // Size of play area
        
        // Death plane below the level
        const deathPlane = BABYLON.MeshBuilder.CreateBox("deathPlane", {
            width: playAreaSize * 2,
            height: 1,
            depth: playAreaSize * 2
        }, this.scene);
        deathPlane.position = new BABYLON.Vector3(0, -15, 15);
        deathPlane.isVisible = false;
        deathPlane.metadata = { type: 'deathPlane' };
        
        // North boundary
        const northWall = BABYLON.MeshBuilder.CreateBox("boundaryNorth", {
            width: playAreaSize,
            height: boundaryHeight,
            depth: 0.5
        }, this.scene);
        northWall.position = new BABYLON.Vector3(0, boundaryHeight / 2, 35);
        northWall.material = boundaryMat;
        northWall.isVisible = false;
        new BABYLON.PhysicsAggregate(northWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // South boundary
        const southWall = BABYLON.MeshBuilder.CreateBox("boundarySouth", {
            width: playAreaSize,
            height: boundaryHeight,
            depth: 0.5
        }, this.scene);
        southWall.position = new BABYLON.Vector3(0, boundaryHeight / 2, -10);
        southWall.material = boundaryMat;
        southWall.isVisible = false;
        new BABYLON.PhysicsAggregate(southWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // East boundary
        const eastWall = BABYLON.MeshBuilder.CreateBox("boundaryEast", {
            width: 0.5,
            height: boundaryHeight,
            depth: playAreaSize * 1.5
        }, this.scene);
        eastWall.position = new BABYLON.Vector3(18, boundaryHeight / 2, 10);
        eastWall.material = boundaryMat;
        eastWall.isVisible = false;
        new BABYLON.PhysicsAggregate(eastWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // West boundary
        const westWall = BABYLON.MeshBuilder.CreateBox("boundaryWest", {
            width: 0.5,
            height: boundaryHeight,
            depth: playAreaSize * 1.5
        }, this.scene);
        westWall.position = new BABYLON.Vector3(-18, boundaryHeight / 2, 10);
        westWall.material = boundaryMat;
        westWall.isVisible = false;
        new BABYLON.PhysicsAggregate(westWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Floor extension to catch any gaps
        const floorExtend = BABYLON.MeshBuilder.CreateBox("floorExtend", {
            width: playAreaSize,
            height: 0.5,
            depth: playAreaSize * 1.5
        }, this.scene);
        floorExtend.position = new BABYLON.Vector3(0, -0.5, 10);
        floorExtend.isVisible = false;
        new BABYLON.PhysicsAggregate(floorExtend, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
    }
    
    createCorridor(x, y, length, width, height, rotation = 0) {
        // Floor
        const floor = BABYLON.MeshBuilder.CreateBox("corridor_floor", {
            width: width,
            height: 0.3,
            depth: length
        }, this.scene);
        
        floor.position = new BABYLON.Vector3(x, y - 0.15, length / 2);
        floor.rotation.y = rotation;
        
        const floorMat = new BABYLON.StandardMaterial("facilityFloorMat", this.scene);
        floorMat.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.65);
        floorMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        floor.material = floorMat;
        floor.receiveShadows = true;
        floor.checkCollisions = true;
        
        new BABYLON.PhysicsAggregate(floor, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Walls
        const wallMat = new BABYLON.StandardMaterial("facilityWallMat", this.scene);
        wallMat.diffuseColor = new BABYLON.Color3(0.85, 0.85, 0.88);
        
        // Calculate wall positions based on rotation
        if (rotation === 0) {
            // Main corridor (facing +Z)
            // Left wall
            const leftWall = BABYLON.MeshBuilder.CreateBox("corridor_left", {
                width: 0.3,
                height: height,
                depth: length
            }, this.scene);
            leftWall.position = new BABYLON.Vector3(x - width / 2, y + height / 2, length / 2);
            leftWall.material = wallMat;
            leftWall.checkCollisions = true;
            new BABYLON.PhysicsAggregate(leftWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
            
            // Right wall
            const rightWall = BABYLON.MeshBuilder.CreateBox("corridor_right", {
                width: 0.3,
                height: height,
                depth: length
            }, this.scene);
            rightWall.position = new BABYLON.Vector3(x + width / 2, y + height / 2, length / 2);
            rightWall.material = wallMat;
            rightWall.checkCollisions = true;
            new BABYLON.PhysicsAggregate(rightWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        } else {
            // Branch corridor (perpendicular)
            const cosR = Math.cos(rotation);
            const sinR = Math.sin(rotation);
            
            // Wall segments with openings for doorways
            const wallSegmentLength = (length - 3) / 2;  // Leave 3m gap for door
            
            // Near side wall segments
            const nearWall1 = BABYLON.MeshBuilder.CreateBox("corridor_near1", {
                width: wallSegmentLength,
                height: height,
                depth: 0.3
            }, this.scene);
            nearWall1.position = new BABYLON.Vector3(x - cosR * wallSegmentLength/2 - cosR * 1.5, y + height / 2, 5 - sinR * 2);
            nearWall1.material = wallMat;
            nearWall1.checkCollisions = true;
            new BABYLON.PhysicsAggregate(nearWall1, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
            
            // Far wall (complete)
            const farWall = BABYLON.MeshBuilder.CreateBox("corridor_far", {
                width: length,
                height: height,
                depth: 0.3
            }, this.scene);
            farWall.position = new BABYLON.Vector3(x - cosR * length/2, y + height / 2, 5 + sinR * width);
            farWall.material = wallMat;
            farWall.checkCollisions = true;
            new BABYLON.PhysicsAggregate(farWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        }
        
        // Ceiling
        const ceiling = BABYLON.MeshBuilder.CreateBox("corridor_ceiling", {
            width: width,
            height: 0.3,
            depth: length
        }, this.scene);
        ceiling.position = new BABYLON.Vector3(x, y + height, length / 2);
        ceiling.rotation.y = rotation;
        ceiling.material = wallMat;
        
        // Add lights along corridor
        for (let i = 0; i < length; i += 5) {
            const light = new BABYLON.PointLight(
                `corridor_light_${x}_${i}`,
                new BABYLON.Vector3(x, y + height - 0.5, i + 2),
                this.scene
            );
            light.intensity = 0.6;
            light.diffuse = new BABYLON.Color3(0.95, 0.95, 1);
            light.range = 8;
        }
    }
    
    createRoom(position, name) {
        const roomWidth = 8;
        const roomDepth = 8;
        const roomHeight = 4;
        const doorWidth = 2;
        const doorHeight = 3;
        
        // Floor
        const floor = BABYLON.MeshBuilder.CreateBox(`${name}_floor`, {
            width: roomWidth,
            height: 0.3,
            depth: roomDepth
        }, this.scene);
        floor.position = new BABYLON.Vector3(position.x, -0.15, position.z);
        
        const floorMat = new BABYLON.StandardMaterial(`${name}_floorMat`, this.scene);
        floorMat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.55);
        floor.material = floorMat;
        floor.receiveShadows = true;
        floor.checkCollisions = true;
        
        new BABYLON.PhysicsAggregate(floor, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Walls (with doorway)
        const wallMat = new BABYLON.StandardMaterial(`${name}_wallMat`, this.scene);
        wallMat.diffuseColor = new BABYLON.Color3(0.75, 0.75, 0.8);
        
        // Back wall
        const backWall = BABYLON.MeshBuilder.CreateBox(`${name}_back`, {
            width: roomWidth,
            height: roomHeight,
            depth: 0.3
        }, this.scene);
        backWall.position = new BABYLON.Vector3(position.x, roomHeight / 2, position.z - roomDepth / 2);
        backWall.material = wallMat;
        backWall.checkCollisions = true;
        new BABYLON.PhysicsAggregate(backWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Side walls
        const leftWall = BABYLON.MeshBuilder.CreateBox(`${name}_left`, {
            width: 0.3,
            height: roomHeight,
            depth: roomDepth
        }, this.scene);
        leftWall.position = new BABYLON.Vector3(position.x - roomWidth / 2, roomHeight / 2, position.z);
        leftWall.material = wallMat;
        leftWall.checkCollisions = true;
        new BABYLON.PhysicsAggregate(leftWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        const rightWall = BABYLON.MeshBuilder.CreateBox(`${name}_right`, {
            width: 0.3,
            height: roomHeight,
            depth: roomDepth
        }, this.scene);
        rightWall.position = new BABYLON.Vector3(position.x + roomWidth / 2, roomHeight / 2, position.z);
        rightWall.material = wallMat;
        rightWall.checkCollisions = true;
        new BABYLON.PhysicsAggregate(rightWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Front wall with doorway (split into two parts + top)
        const sideWallWidth = (roomWidth - doorWidth) / 2;
        
        // Left part of front wall
        const frontLeft = BABYLON.MeshBuilder.CreateBox(`${name}_front_left`, {
            width: sideWallWidth,
            height: roomHeight,
            depth: 0.3
        }, this.scene);
        frontLeft.position = new BABYLON.Vector3(
            position.x - roomWidth / 2 + sideWallWidth / 2, 
            roomHeight / 2, 
            position.z + roomDepth / 2
        );
        frontLeft.material = wallMat;
        frontLeft.checkCollisions = true;
        new BABYLON.PhysicsAggregate(frontLeft, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Right part of front wall
        const frontRight = BABYLON.MeshBuilder.CreateBox(`${name}_front_right`, {
            width: sideWallWidth,
            height: roomHeight,
            depth: 0.3
        }, this.scene);
        frontRight.position = new BABYLON.Vector3(
            position.x + roomWidth / 2 - sideWallWidth / 2, 
            roomHeight / 2, 
            position.z + roomDepth / 2
        );
        frontRight.material = wallMat;
        frontRight.checkCollisions = true;
        new BABYLON.PhysicsAggregate(frontRight, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Top part of doorway
        const frontTop = BABYLON.MeshBuilder.CreateBox(`${name}_front_top`, {
            width: doorWidth,
            height: roomHeight - doorHeight,
            depth: 0.3
        }, this.scene);
        frontTop.position = new BABYLON.Vector3(
            position.x, 
            doorHeight + (roomHeight - doorHeight) / 2, 
            position.z + roomDepth / 2
        );
        frontTop.material = wallMat;
        frontTop.checkCollisions = true;
        new BABYLON.PhysicsAggregate(frontTop, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Ceiling
        const ceiling = BABYLON.MeshBuilder.CreateBox(`${name}_ceiling`, {
            width: roomWidth,
            height: 0.3,
            depth: roomDepth
        }, this.scene);
        ceiling.position = new BABYLON.Vector3(position.x, roomHeight, position.z);
        ceiling.material = wallMat;
        
        // Room light
        const roomLight = new BABYLON.PointLight(
            `${name}_light`,
            new BABYLON.Vector3(position.x, roomHeight - 0.5, position.z),
            this.scene
        );
        roomLight.intensity = 0.7;
        roomLight.range = 10;
    }
    
    async createJetpackGirl() {
        const modelLoader = this.game.modelLoader;
        
        // Jetpack Girl starts flying near the entrance
        this.jetpackGirl = new JetpackGirl(this.scene, new BABYLON.Vector3(0, 0, 3));
        await this.jetpackGirl.init(modelLoader);
        
        // Set her patrol route around the facility
        this.jetpackGirl.setPatrolPoints([
            new BABYLON.Vector3(0, 4, 3),
            new BABYLON.Vector3(-8, 4, 8),
            new BABYLON.Vector3(-12, 4, 5),
            new BABYLON.Vector3(-8, 4, 15),
            new BABYLON.Vector3(0, 4, 20),
            new BABYLON.Vector3(8, 4, 15),
            new BABYLON.Vector3(12, 4, 5),
            new BABYLON.Vector3(8, 4, 8),
            new BABYLON.Vector3(0, 4, 3)
        ]);
        
        console.log('✅ Jetpack Girl created and patrolling!');
    }
    
    async createNPCs() {
        const modelLoader = this.game.modelLoader;
        
        // Sarah - in the left cell (center of room, not near wall)
        const sarah = new NPC(this.scene, GAME.RESCUE_NPCS.sarah, 
            new BABYLON.Vector3(-10, 0.8, 5));  // Moved to room center
        await sarah.create(modelLoader);
        this.npcs.push(sarah);
        
        // Dr. Chen - in the lab room (center of room)
        const chen = new NPC(this.scene, GAME.RESCUE_NPCS.chen,
            new BABYLON.Vector3(10, 0.8, 0));  // Moved to room center
        await chen.create(modelLoader);
        this.npcs.push(chen);
        
        // Emma - in the control room (center of room)
        const emma = new NPC(this.scene, GAME.RESCUE_NPCS.emma,
            new BABYLON.Vector3(0, 0.8, 23));  // Moved to room center
        await emma.create(modelLoader);
        this.npcs.push(emma);
        
        // Add markers above NPCs
        this.npcs.forEach(npc => {
            this.addMarker(npc.mesh.position);
        });
    }
    
    addMarker(position) {
        // Floating marker above NPC
        const marker = BABYLON.MeshBuilder.CreateCylinder("marker", {
            height: 0.3,
            diameterTop: 0,
            diameterBottom: 0.4
        }, this.scene);
        
        marker.position = new BABYLON.Vector3(position.x, 3, position.z);
        marker.rotation.x = Math.PI; // Point down
        
        const markerMat = new BABYLON.StandardMaterial("markerMat", this.scene);
        markerMat.diffuseColor = new BABYLON.Color3(0, 1, 0.5);
        markerMat.emissiveColor = new BABYLON.Color3(0, 0.5, 0.25);
        marker.material = markerMat;
        
        // Bobbing animation
        const bobAnim = new BABYLON.Animation(
            "markerBob",
            "position.y",
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        bobAnim.setKeys([
            { frame: 0, value: 3 },
            { frame: 30, value: 3.3 },
            { frame: 60, value: 3 }
        ]);
        marker.animations.push(bobAnim);
        this.scene.beginAnimation(marker, 0, 60, true);
    }
    
    createObstacles() {
        // Add some crates/barriers
        const crateMat = new BABYLON.StandardMaterial("crateMat", this.scene);
        crateMat.diffuseColor = new BABYLON.Color3(0.6, 0.5, 0.3);
        
        const cratePositions = [
            new BABYLON.Vector3(-2, 0.5, 8),
            new BABYLON.Vector3(2, 0.5, 15),
            new BABYLON.Vector3(-1, 0.5, 20),
        ];
        
        cratePositions.forEach((pos, i) => {
            const crate = BABYLON.MeshBuilder.CreateBox(`crate_${i}`, {
                width: 1,
                height: 1,
                depth: 1
            }, this.scene);
            crate.position = pos;
            crate.material = crateMat;
            crate.receiveShadows = true;
            
            new BABYLON.PhysicsAggregate(crate, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        });
    }
    
    createLighting() {
        // Ambient fill
        const ambient = new BABYLON.HemisphericLight(
            "facilityAmbient",
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );
        ambient.intensity = 0.4;
        ambient.diffuse = new BABYLON.Color3(0.9, 0.9, 1);
    }
    
    createExit() {
        // Exit door at end of main corridor
        const exitDoor = BABYLON.MeshBuilder.CreateBox("exitDoor", {
            width: 2,
            height: 3,
            depth: 0.2
        }, this.scene);
        exitDoor.position = new BABYLON.Vector3(0, 1.5, 30);
        
        const doorMat = new BABYLON.StandardMaterial("exitDoorMat", this.scene);
        doorMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.25);
        exitDoor.material = doorMat;
        
        new BABYLON.PhysicsAggregate(exitDoor, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // "LOCKED" sign
        this.exitSign = BABYLON.MeshBuilder.CreatePlane("exitSign", {
            width: 1.5,
            height: 0.5
        }, this.scene);
        this.exitSign.position = new BABYLON.Vector3(0, 2.8, 29.9);
        
        const signMat = new BABYLON.StandardMaterial("signMat", this.scene);
        signMat.diffuseColor = new BABYLON.Color3(1, 0, 0);
        signMat.emissiveColor = new BABYLON.Color3(0.5, 0, 0);
        this.exitSign.material = signMat;
        
        this.exitDoor = exitDoor;
    }
    
    checkRescueComplete() {
        let rescued = 0;
        
        for (const npc of this.npcs) {
            if (npc.isRescued || (npc.mesh.metadata && npc.mesh.metadata.rescued)) {
                rescued++;
            }
        }
        
        this.rescuedCount = rescued;
        
        // Update objective
        document.getElementById('objectiveDisplay').textContent = 
            `Objective: Rescue the women (${rescued}/${this.totalNpcs})`;
        
        if (rescued >= this.totalNpcs) {
            this.unlockExit();
        }
    }
    
    unlockExit() {
        if (this.exitUnlocked) return;
        
        this.exitUnlocked = true;
        
        // Change door color to green
        const doorMat = new BABYLON.StandardMaterial("unlockedDoorMat", this.scene);
        doorMat.diffuseColor = new BABYLON.Color3(0.1, 0.5, 0.1);
        doorMat.emissiveColor = new BABYLON.Color3(0, 0.2, 0);
        this.exitDoor.material = doorMat;
        
        // Update sign
        const signMat = new BABYLON.StandardMaterial("unlockedSignMat", this.scene);
        signMat.diffuseColor = new BABYLON.Color3(0, 1, 0);
        signMat.emissiveColor = new BABYLON.Color3(0, 0.5, 0);
        this.exitSign.material = signMat;
        
        // Remove door physics to allow passage
        if (this.exitDoor.physicsBody) {
            this.exitDoor.physicsBody.dispose();
        }
        
        // Update objective
        document.getElementById('objectiveDisplay').textContent = 
            "Objective: Escape through the exit!";
        
        // Show dialogue
        this.game.dialogue.show([
            { speaker: "Sarah", text: "Everyone's free! Let's get out of here!" },
            { speaker: "Jake", text: "The exit's unlocked. Move, move, move!" }
        ]);
    }
    
    update(deltaTime) {
        const player = this.game.player;
        
        // Check death plane (fell too far)
        if (player && player.mesh.position.y < -10) {
            this.respawnPlayer();
        }
        
        // Update Jetpack Girl
        if (this.jetpackGirl) {
            this.jetpackGirl.update(deltaTime);
        }
        
        // Update all enemies
        for (const enemy of this.enemies) {
            enemy.update(deltaTime, this.game.player);
        }
        
        // Update boss if spawned
        if (this.boss && this.boss.state !== 'dead') {
            this.boss.update(deltaTime, this.game.player);
        }
        
        // Check if player entered boss arena (trigger boss fight)
        if (this.exitUnlocked && !this.bossSpawned && player) {
            if (player.mesh.position.z > 35 && this.bossSpawnPoint) {
                this.spawnBoss();
            }
        }
        
        // Check for boss defeat
        if (this.boss && this.boss.state === 'dead' && !this.bossDefeated) {
            this.onBossDefeated();
        }
        
        // Check for level completion (after boss defeated)
        if (this.bossDefeated) {
            if (player && player.mesh.position.z > 55) {
                this.onLevelComplete();
            }
        }
        
        // Update enemy count HUD
        const aliveEnemies = this.enemies.filter(e => e.state !== 'dead').length;
        const enemyCountEl = document.getElementById('enemyCount');
        if (enemyCountEl && aliveEnemies > 0) {
            enemyCountEl.textContent = `Enemies: ${aliveEnemies}`;
        } else if (enemyCountEl) {
            enemyCountEl.textContent = '';
        }
    }
    
    async spawnBoss() {
        if (this.bossSpawned) return;
        this.bossSpawned = true;
        
        console.log('🔥 SPAWNING BOSS!');
        
        // Lock player in arena (close entrance)
        const arenaGate = BABYLON.MeshBuilder.CreateBox("arenaGate", {
            width: 6,
            height: 8,
            depth: 0.5
        }, this.scene);
        arenaGate.position = new BABYLON.Vector3(0, 4, 35);
        
        const gateMat = new BABYLON.StandardMaterial("gateMat", this.scene);
        gateMat.diffuseColor = new BABYLON.Color3(0.3, 0.1, 0.1);
        gateMat.emissiveColor = new BABYLON.Color3(0.2, 0, 0);
        arenaGate.material = gateMat;
        new BABYLON.PhysicsAggregate(arenaGate, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        this.arenaGate = arenaGate;
        
        // Dramatic boss intro
        this.game.dialogue.show([
            { speaker: "???", text: "You think you can just walk out of MY facility?!" },
            { speaker: "Dr. Nexus", text: "I am DR. NEXUS! Director of NexaGen. And you... you're just an experiment gone wrong." },
            { speaker: "Jake", text: "I'm the experiment that's going to END you." },
            { speaker: "Dr. Nexus", text: "We shall see, Subject 48. WE SHALL SEE!" }
        ]);
        
        // Spawn the boss
        this.boss = new Boss(this.scene, this.bossSpawnPoint);
        await this.boss.init(this.game.modelLoader);
        this.enemies.push(this.boss);
        
        // Update objective
        document.getElementById('objectiveDisplay').textContent = 
            "BOSS FIGHT: Defeat Dr. Nexus!";
        
        // Play alarm sound
        if (this.game.soundSystem) {
            this.game.soundSystem.play('alarm');
        }
        
        // Screen shake
        this.screenShake(1000, 0.15);
        
        console.log('✅ Boss spawned: Dr. Nexus');
    }
    
    onBossDefeated() {
        this.bossDefeated = true;
        
        console.log('🎉 BOSS DEFEATED!');
        
        // Open arena gate
        if (this.arenaGate) {
            this.arenaGate.dispose();
            this.arenaGate = null;
        }
        
        // Create exit at back of arena
        const victoryExit = BABYLON.MeshBuilder.CreateBox("victoryExit", {
            width: 4,
            height: 6,
            depth: 0.3
        }, this.scene);
        victoryExit.position = new BABYLON.Vector3(0, 3, 55);
        
        const exitMat = new BABYLON.StandardMaterial("victoryExitMat", this.scene);
        exitMat.diffuseColor = new BABYLON.Color3(0.2, 1, 0.3);
        exitMat.emissiveColor = new BABYLON.Color3(0.1, 0.5, 0.15);
        victoryExit.material = exitMat;
        
        // Bright light at exit
        const exitLight = new BABYLON.PointLight("exitLight", new BABYLON.Vector3(0, 5, 57), this.scene);
        exitLight.diffuse = new BABYLON.Color3(0.5, 1, 0.5);
        exitLight.intensity = 3;
        exitLight.range = 15;
        
        // Victory dialogue
        this.game.dialogue.show([
            { speaker: "Dr. Nexus", text: "Impossible... how... could a mere test subject..." },
            { speaker: "Jake", text: "Turns out 400% strength comes in handy." },
            { speaker: "Sarah", text: "Jake! You did it! The exit is clear!" },
            { speaker: "Jake", text: "Let's get out of here. All of us." }
        ]);
        
        // Update objective
        document.getElementById('objectiveDisplay').textContent = 
            "Victory! Head to the exit!";
        
        // Drop rewards
        this.dropBossRewards();
    }
    
    dropBossRewards() {
        // Health pack
        const health = BABYLON.MeshBuilder.CreateBox("bossHealth", {
            width: 0.6,
            height: 0.6,
            depth: 0.6
        }, this.scene);
        health.position = this.bossSpawnPoint.add(new BABYLON.Vector3(-2, 0.5, 0));
        
        const healthMat = new BABYLON.StandardMaterial("bossHealthMat", this.scene);
        healthMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
        healthMat.emissiveColor = new BABYLON.Color3(0.5, 0, 0);
        health.material = healthMat;
        
        health.metadata = {
            interactable: true,
            type: 'health',
            healAmount: 100,
            name: 'MEGA Health Pack'
        };
        
        // Special weapon (placeholder for future)
        const reward = BABYLON.MeshBuilder.CreateSphere("bossReward", { diameter: 0.5 }, this.scene);
        reward.position = this.bossSpawnPoint.add(new BABYLON.Vector3(2, 0.5, 0));
        
        const rewardMat = new BABYLON.StandardMaterial("bossRewardMat", this.scene);
        rewardMat.diffuseColor = new BABYLON.Color3(1, 0.8, 0);
        rewardMat.emissiveColor = new BABYLON.Color3(0.5, 0.4, 0);
        reward.material = rewardMat;
        
        // Float animation
        const floatAnim = new BABYLON.Animation("float", "position.y", 30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
        floatAnim.setKeys([
            { frame: 0, value: 0.5 },
            { frame: 30, value: 0.8 },
            { frame: 60, value: 0.5 }
        ]);
        reward.animations.push(floatAnim);
        this.scene.beginAnimation(reward, 0, 60, true);
    }
    
    onLevelComplete() {
        if (this.levelComplete) return;
        this.levelComplete = true;
        
        console.log('🏆 LEVEL 2 COMPLETE!');
        
        // Final dialogue
        this.game.dialogue.show([
            { speaker: "Jake", text: "We made it! Everyone's safe now." },
            { speaker: "Sarah", text: "Thank you, Jake. You saved us all." },
            { speaker: "Dr. Chen", text: "NexaGen is finished. The world will know what they did here." },
            { speaker: "Emma", text: "You're a hero, Jake!" },
            { speaker: "System", text: "🎮 LEVEL 2 COMPLETE!" },
            { speaker: "System", text: "Congratulations! More levels coming soon..." },
            { speaker: "System", text: "Thanks for playing ESCAPE LAB 48!" }
        ]);
        
        // Update HUD
        document.getElementById('objectiveDisplay').textContent = 
            "🏆 CONGRATULATIONS - GAME COMPLETE!";
        
        // Victory screen overlay
        setTimeout(() => {
            this.showVictoryScreen();
        }, 8000);
    }
    
    showVictoryScreen() {
        const overlay = document.createElement('div');
        overlay.id = 'victoryOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: linear-gradient(135deg, rgba(0,50,0,0.9) 0%, rgba(0,20,0,0.95) 100%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 200;
            animation: fadeIn 2s ease-out;
        `;
        
        overlay.innerHTML = `
            <h1 style="color: #00ff00; font-size: 64px; text-shadow: 0 0 30px rgba(0,255,0,0.8); margin-bottom: 20px;">
                🏆 VICTORY! 🏆
            </h1>
            <h2 style="color: #88ff88; font-size: 32px; margin-bottom: 40px;">
                ESCAPE LAB 48 COMPLETE
            </h2>
            <div style="color: #aaffaa; font-size: 20px; text-align: center; max-width: 600px; line-height: 1.8;">
                <p>Jake Morrison escaped NexaGen with his 400% enhanced strength.</p>
                <p>Sarah, Dr. Chen, and Emma were rescued.</p>
                <p>Dr. Nexus was defeated.</p>
                <p style="margin-top: 30px; color: #ffff00;">Stay tuned for ESCAPE LAB 48: AFTERMATH</p>
            </div>
            <div style="margin-top: 40px;">
                <button id="playAgainBtn" style="
                    background: #004400;
                    border: 3px solid #00ff00;
                    color: #00ff00;
                    padding: 15px 40px;
                    font-size: 24px;
                    font-family: monospace;
                    cursor: pointer;
                    margin-right: 20px;
                ">PLAY AGAIN</button>
                <button id="creditsBtn" style="
                    background: #222;
                    border: 3px solid #888;
                    color: #aaa;
                    padding: 15px 40px;
                    font-size: 24px;
                    font-family: monospace;
                    cursor: pointer;
                ">CREDITS</button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Add button handlers
        document.getElementById('playAgainBtn').onclick = () => {
            location.reload();
        };
        
        document.getElementById('creditsBtn').onclick = () => {
            alert('ESCAPE LAB 48\n\nCreated with Babylon.js\nHavok Physics Engine\n\nThank you for playing!');
        };
    }
    
    screenShake(duration, intensity) {
        const camera = this.game.camera;
        if (!camera) return;
        
        const originalPos = camera.position.clone();
        const startTime = Date.now();
        
        const shakeInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            if (elapsed > duration) {
                clearInterval(shakeInterval);
                return;
            }
            
            const progress = elapsed / duration;
            const currentIntensity = intensity * (1 - progress);
            
            camera.position.x = originalPos.x + (Math.random() - 0.5) * currentIntensity;
            camera.position.y = originalPos.y + (Math.random() - 0.5) * currentIntensity;
        }, 16);
    }
    
    respawnPlayer() {
        const player = this.game.player;
        if (!player) return;
        
        // Reset player position to spawn point
        player.mesh.position = this.playerSpawn.clone();
        
        // Reset physics velocity
        if (player.body) {
            player.body.setLinearVelocity(BABYLON.Vector3.Zero());
            player.body.setAngularVelocity(BABYLON.Vector3.Zero());
        }
        
        // Show feedback
        console.log("Player respawned!");
        
        // Flash screen red briefly
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(255, 0, 0, 0.5); pointer-events: none; z-index: 100;
        `;
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), 200);
    }
    
    dispose() {
        // Clean up Jetpack Girl
        if (this.jetpackGirl) {
            this.jetpackGirl.dispose();
            this.jetpackGirl = null;
        }
        
        // Clean up enemies
        for (const enemy of this.enemies) {
            enemy.dispose();
        }
        this.enemies = [];
        this.drones = [];
        
        // Clean up NPCs
        for (const npc of this.npcs) {
            if (npc.mesh) npc.mesh.dispose();
        }
        this.npcs = [];
    }
}
