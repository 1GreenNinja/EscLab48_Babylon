/* ============================================================================
   ESCAPE LAB 48 - BABYLON.JS EDITION
   Level 1: Security Cell Breakout
   Jake awakens with 400% strength and must bend the bars to escape
   ============================================================================ */

class Level1_Cell {
    constructor(gameEngine) {
        this.game = gameEngine;
        this.scene = gameEngine.scene;
        
        this.bars = [];
        this.barsRequired = 3;
        this.barsBent = 0;
        this.exitUnlocked = false;
        
        // Player spawn point (on the bed - against back wall)
        this.playerSpawn = new BABYLON.Vector3(-2, 0.8, -2.5);
        
        // Intro sequence state
        this.introPlaying = true;
        this.introStep = 0;
        this.introTimer = 0;
        
        // Voice synthesis
        this.synth = window.speechSynthesis;
        this.jakeVoice = null;
        this.speechEnabled = false; // default off until toggled
        this.setupVoice();
        
        // Restraints
        this.restraints = [];
        this.restraintsBroken = false;
    }
    
    setupVoice() {
        // Wait for voices to load
        if (this.synth.getVoices().length === 0) {
            this.synth.addEventListener('voiceschanged', () => {
                this.selectJakeVoice();
            });
        } else {
            this.selectJakeVoice();
        }
    }
    
    selectJakeVoice() {
        const voices = this.synth.getVoices();
        console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
        
        // Prefer Microsoft Mark first, then other smooth male voices
        this.jakeVoice = voices.find(v => v.name === 'Microsoft Mark - English (United States)') ||
                         voices.find(v => v.name.includes('Mark')) ||
                         voices.find(v => v.name === 'Microsoft David - English (United States)') ||
                         voices.find(v => v.name === 'Google US English') ||
                         voices.find(v => v.name.includes('Daniel')) ||  // Good UK voice
                         voices.find(v => v.name.includes('David')) ||
                         // Prefer Microsoft Neural voices (Edge) - most natural
                         voices.find(v => v.name.includes('Guy Online') && v.name.includes('Natural')) ||
                         voices.find(v => v.name.includes('Davis') && v.name.includes('Natural')) ||
                         voices.find(v => v.name.includes('Christopher') && v.name.includes('Natural')) ||
                         voices.find(v => v.name.includes('Eric') && v.name.includes('Natural')) ||
                         // Google Neural voices (Chrome)
                         voices.find(v => v.name.includes('Google US English Male')) ||
                         // Standard quality fallbacks
                         voices.find(v => v.name.includes('James')) ||
                         voices.find(v => v.name.includes('Alex')) ||
                         voices.find(v => v.lang === 'en-US' && !v.name.includes('Zira') && v.name.toLowerCase().includes('male')) ||
                         voices.find(v => v.lang === 'en-US' && !v.name.includes('Zira')) ||
                         voices.find(v => v.lang.startsWith('en')) ||
                         voices[0];
        console.log('Available voices:', voices.map(v => v.name));
        console.log('Selected Jake voice:', this.jakeVoice?.name);
    }
    
    speak(text, callback) {
        if (!this.speechEnabled) {
            if (callback) setTimeout(callback, 0);
            return;
        }
        
        if (!this.synth) {
            console.error('Speech synthesis not available');
            if (callback) setTimeout(callback, 2000);
            return;
        }
        
        // Cancel any ongoing speech
        this.synth.cancel();
        
        // Ensure voices are loaded
        if (!this.jakeVoice) {
            this.selectJakeVoice();
        }
        
        // FIX: Add delay to prevent first word cutoff
        // Speech synthesis needs time to initialize audio stream
        setTimeout(() => {
            this.speakNow(text, callback);
        }, 400);
    }
    
    speakNow(text, callback) {
        // Ensure voices are loaded
        if (!this.jakeVoice) {
            this.selectJakeVoice();
        }
        
        // FIX: Warm up speech engine with a near-silent utterance to avoid clipping first word
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = this.jakeVoice;
        
        // Base settings - force user-requested defaults every time
        this.basePitch = 0.10;
        this.baseRate = 0.60;
        const basePitch = this.basePitch;
        const baseRate = this.baseRate;
        
        // EMOTIONAL SPEECH - Jake is stressed, confused, then determined!
        // Analyze text for emotion cues and modify pitch/rate
        const lowerText = text.toLowerCase();
        let rateModifier = 1.0;
        let pitchModifier = 1.0;
        
        // Confusion/pain - slower, slightly higher (questioning tone)
        if (lowerText.includes('where am i') || lowerText.includes('what the') || lowerText.includes('?')) {
            rateModifier = 0.9;
            pitchModifier = 1.1;
        }
        // Pain/discomfort - groaning, slow
        else if (lowerText.includes('ugh') || lowerText.includes('head') || lowerText.includes('pounding')) {
            rateModifier = 0.7;
            pitchModifier = 0.9;
        }
        // Alarm/realization - faster, higher (surprised)
        else if (lowerText.includes('wait') || lowerText.includes('can\'t move') || lowerText.includes('hell')) {
            rateModifier = 1.2;
            pitchModifier = 1.15;
        }
        // Determination/power - slower, DEEPER (confident)
        else if (lowerText.includes('stronger') || lowerText.includes('bend steel') || lowerText.includes('feel')) {
            rateModifier = 0.85;
            pitchModifier = 0.85;
        }
        // Triumph/excitement - faster, higher
        else if (lowerText.includes('ha!') || lowerText.includes('got it') || lowerText.includes('free')) {
            rateModifier = 1.25;
            pitchModifier = 1.2;
        }
        // Discovery - intrigued
        else if (lowerText.includes('hidden') || lowerText.includes('secret') || lowerText.includes('computer')) {
            rateModifier = 0.9;
            pitchModifier = 1.0;
        }
        
        utterance.rate = Math.max(0.5, Math.min(2.0, baseRate * rateModifier));
        utterance.pitch = Math.max(0.5, Math.min(2.0, basePitch * pitchModifier));
        utterance.volume = 1.0;
        
        // Add natural pauses for punctuation by processing the text
        // The browser handles this automatically, but we can emphasize it
        
        utterance.onend = () => {
            console.log('Finished speaking:', text);
            if (callback) callback();
        };
        
        utterance.onerror = (e) => {
            console.error('Speech error:', e);
            if (callback) callback();
        };
        
        // Chrome bug workaround - speech can stop mid-sentence on long text
        // Keep speech synthesis active
        const resumeSpeech = () => {
            if (this.synth.speaking) {
                this.synth.pause();
                this.synth.resume();
            }
        };
        
        // Resume every 10 seconds to prevent Chrome from cutting off
        this.speechResumeInterval = setInterval(resumeSpeech, 10000);
        
        const speakMain = () => {
            utterance.onend = () => {
                clearInterval(this.speechResumeInterval);
                console.log('Finished speaking:', text);
                if (callback) callback();
            };
            
            // Nudge audio engine right at start to avoid initial word drop
            utterance.onstart = () => {
                try {
                    this.synth.pause();
                    this.synth.resume();
                } catch (e) {
                    console.warn('Speech nudge failed', e);
                }
            };
            
            console.log('Speaking:', text);
            this.synth.speak(utterance);
        };
        
        // Warm-up utterance (almost silent, very short) to prime audio output
        // Use an actual phoneme ("dot") at very low volume so engines reliably start
        const warmup = new SpeechSynthesisUtterance('.');
        warmup.volume = 0.01;
        warmup.rate = this.baseRate;
        warmup.pitch = this.basePitch;
        
        let warmupEnded = false;
        warmup.onend = () => {
            warmupEnded = true;
            // Slightly longer delay after warmup to ensure audio pipeline is active
            setTimeout(speakMain, 300);
        };
        
        this.synth.speak(warmup);
        // Fallback: if warmup doesn't end for some reason, speak main shortly
        setTimeout(() => { if (!warmupEnded) speakMain(); }, 500);
    }
    
    async build() {
        // ===== NEW EXPANDED LEVEL LAYOUT =====
        // Based on the map: 4 cells stacked vertically on left
        // Main hallway runs horizontally to elevator on right
        // Rooms branch off hallway: Guard Station, Storage, Medical Bay, Armory
        // Secret underground passage from Cell 4
        
        // Create materials first (reusable)
        this.createMaterials();
        
        // Create Jake's starting cell (Cell 1 - top)
        this.createCell();
        
        // Create bed with restraints
        this.createBedWithRestraints();
        
        // Create computer terminal
        this.createComputerTerminal();
        
        // Create the security door with LED stripes (back wall exit)
        this.createMetalDoor();
        
        // Create bars for Jake's cell
        this.createBars();
        
        // Create additional cells (2, 3, 4)
        this.createCell2();  // Abandoned
        this.createCell3();  // Empty
        this.createCell4();  // Skeleton + Secret stairs
        
        // Create the main hallway system
        this.createMainHallway();
        
        // Create rooms along hallway
        this.createGuardStation();
        this.createStorageRoom();
        this.createMedicalBay();
        this.createExpandedArmory();
        
        // Create elevator area
        this.createElevatorLobby();
        
        // Create secret underground passage
        this.createUndergroundPassage();
        
        // Load 3D character models
        this.loadCharacterModels();
        
        // Add atmospheric lighting
        this.createLighting();
        
        // Exit trigger
        this.createExitTrigger();
        
        // Show click prompt for intro
        this.showClickPrompt();
    }
    
    createMaterials() {
        // ========================================================
        // PROCEDURAL TEXTURES WITH BUMP MAPS
        // All DynamicTextures have mipmaps disabled to prevent WebGL errors
        // ========================================================
        
        // Floor material with procedural texture + BUMP
        this.floorMat = new BABYLON.StandardMaterial("floorMat", this.scene);
        this.floorMat.diffuseTexture = this.createWallTexture("floor", new BABYLON.Color3(0.25, 0.25, 0.28), true);
        this.floorMat.diffuseTexture.uScale = 2;
        this.floorMat.diffuseTexture.vScale = 2;
        this.floorMat.bumpTexture = this.createBumpTexture("floorBump", true);
        this.floorMat.bumpTexture.uScale = 2;
        this.floorMat.bumpTexture.vScale = 2;
        this.floorMat.bumpTexture.level = 0.5;
        this.floorMat.specularColor = new BABYLON.Color3(0.15, 0.15, 0.15);
        
        // Wall material with cinder block texture + BUMP
        this.wallMat = new BABYLON.StandardMaterial("wallMat", this.scene);
        this.wallMat.diffuseTexture = this.createWallTexture("wall", new BABYLON.Color3(0.35, 0.35, 0.38));
        this.wallMat.diffuseTexture.uScale = 1.5;
        this.wallMat.diffuseTexture.vScale = 1;
        this.wallMat.bumpTexture = this.createBumpTexture("wallBump", false);
        this.wallMat.bumpTexture.uScale = 1.5;
        this.wallMat.bumpTexture.vScale = 1;
        this.wallMat.bumpTexture.level = 0.6;
        this.wallMat.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);
        
        // Ceiling material
        this.ceilingMat = new BABYLON.StandardMaterial("ceilingMat", this.scene);
        this.ceilingMat.diffuseTexture = this.createWallTexture("ceiling", new BABYLON.Color3(0.32, 0.32, 0.35));
        this.ceilingMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        
        // Hallway floor with BUMP
        this.hallwayFloorMat = new BABYLON.StandardMaterial("hallwayFloorMat", this.scene);
        this.hallwayFloorMat.diffuseTexture = this.createWallTexture("hallFloor", new BABYLON.Color3(0.28, 0.26, 0.22), true);
        this.hallwayFloorMat.diffuseTexture.uScale = 4;
        this.hallwayFloorMat.diffuseTexture.vScale = 4;
        this.hallwayFloorMat.bumpTexture = this.createBumpTexture("hallFloorBump", true);
        this.hallwayFloorMat.bumpTexture.uScale = 4;
        this.hallwayFloorMat.bumpTexture.vScale = 4;
        this.hallwayFloorMat.bumpTexture.level = 0.4;
        this.hallwayFloorMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        
        // Medical Bay - white tiles with TILE BUMP
        this.medicalWallMat = new BABYLON.StandardMaterial("medicalWallMat", this.scene);
        this.medicalWallMat.diffuseTexture = this.createWallTexture("medWall", new BABYLON.Color3(0.85, 0.85, 0.88));
        this.medicalWallMat.bumpTexture = this.createTileBumpTexture("medBump");
        this.medicalWallMat.bumpTexture.level = 0.3;
        this.medicalWallMat.specularColor = new BABYLON.Color3(0.4, 0.4, 0.4);
        this.medicalWallMat.specularPower = 32;
        
        // Guard Station - green tint with BUMP
        this.guardWallMat = new BABYLON.StandardMaterial("guardWallMat", this.scene);
        this.guardWallMat.diffuseTexture = this.createWallTexture("guardWall", new BABYLON.Color3(0.32, 0.38, 0.32));
        this.guardWallMat.bumpTexture = this.createBumpTexture("guardBump", false);
        this.guardWallMat.bumpTexture.level = 0.5;
        this.guardWallMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        
        // Storage - brown tint with BUMP
        this.storageWallMat = new BABYLON.StandardMaterial("storageWallMat", this.scene);
        this.storageWallMat.diffuseTexture = this.createWallTexture("storageWall", new BABYLON.Color3(0.35, 0.32, 0.28));
        this.storageWallMat.bumpTexture = this.createBumpTexture("storageBump", false);
        this.storageWallMat.bumpTexture.level = 0.5;
        this.storageWallMat.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);
        
        // Armory - dark blue with BUMP
        this.armoryWallMat = new BABYLON.StandardMaterial("armoryWallMat", this.scene);
        this.armoryWallMat.diffuseTexture = this.createWallTexture("armoryWall", new BABYLON.Color3(0.28, 0.28, 0.35));
        this.armoryWallMat.bumpTexture = this.createBumpTexture("armoryBump", false);
        this.armoryWallMat.bumpTexture.level = 0.6;
        this.armoryWallMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        
        // Cave/rock material with ROCK BUMP (heavy)
        this.rockMat = new BABYLON.StandardMaterial("rockMat", this.scene);
        this.rockMat.diffuseTexture = this.createWallTexture("rock", new BABYLON.Color3(0.35, 0.30, 0.25));
        this.rockMat.bumpTexture = this.createRockBumpTexture("rockBump");
        this.rockMat.bumpTexture.level = 0.8;
        this.rockMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        
        // Elevator material with METAL BUMP
        this.elevatorMat = new BABYLON.StandardMaterial("elevatorMat", this.scene);
        this.elevatorMat.diffuseTexture = this.createWallTexture("metalPanel", new BABYLON.Color3(0.4, 0.4, 0.45));
        this.elevatorMat.bumpTexture = this.createMetalBumpTexture("elevBump");
        this.elevatorMat.bumpTexture.level = 0.3;
        this.elevatorMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        this.elevatorMat.specularPower = 64;
        
        // Dark abandoned cell with BUMP (damaged look)
        this.abandonedWallMat = new BABYLON.StandardMaterial("abandonedWallMat", this.scene);
        this.abandonedWallMat.diffuseTexture = this.createWallTexture("abandoned", new BABYLON.Color3(0.22, 0.22, 0.24));
        this.abandonedWallMat.bumpTexture = this.createBumpTexture("abandonedBump", false);
        this.abandonedWallMat.bumpTexture.level = 0.7;
        this.abandonedWallMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        
        // Bone/skeleton material (no bump needed)
        this.boneMat = new BABYLON.StandardMaterial("boneMat", this.scene);
        this.boneMat.diffuseColor = new BABYLON.Color3(0.85, 0.82, 0.75);
        this.boneMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    }
    
    // =====================================================
    // CELL 2 - Abandoned cell (south of Jake's cell)
    // =====================================================
    createCell2() {
        const cellWidth = 6;
        const cellDepth = 5;
        const cellHeight = 3.5;
        const cellZ = -8; // South of Cell 1 (Jake's at 0)
        const cellX = 0;
        
        // Floor
        const floor = BABYLON.MeshBuilder.CreateBox("cell2Floor", {
            width: cellWidth,
            height: 0.2,
            depth: cellDepth
        }, this.scene);
        floor.position = new BABYLON.Vector3(cellX, -0.1, cellZ);
        floor.material = this.floorMat;
        new BABYLON.PhysicsAggregate(floor, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Ceiling
        const ceiling = BABYLON.MeshBuilder.CreateBox("cell2Ceiling", {
            width: cellWidth,
            height: 0.2,
            depth: cellDepth
        }, this.scene);
        ceiling.position = new BABYLON.Vector3(cellX, cellHeight, cellZ);
        ceiling.material = this.ceilingMat;
        
        // Back wall (south)
        const backWall = BABYLON.MeshBuilder.CreateBox("cell2BackWall", {
            width: cellWidth,
            height: cellHeight,
            depth: 0.3
        }, this.scene);
        backWall.position = new BABYLON.Vector3(cellX, cellHeight/2, cellZ - cellDepth/2);
        backWall.material = this.abandonedWallMat;
        new BABYLON.PhysicsAggregate(backWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Left wall (west)
        const leftWall = BABYLON.MeshBuilder.CreateBox("cell2LeftWall", {
            width: 0.3,
            height: cellHeight,
            depth: cellDepth
        }, this.scene);
        leftWall.position = new BABYLON.Vector3(cellX - cellWidth/2, cellHeight/2, cellZ);
        leftWall.material = this.abandonedWallMat;
        new BABYLON.PhysicsAggregate(leftWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Right wall (east) - has opening to hallway
        const rightWallTop = BABYLON.MeshBuilder.CreateBox("cell2RightWallTop", {
            width: 0.3,
            height: 0.5,
            depth: cellDepth
        }, this.scene);
        rightWallTop.position = new BABYLON.Vector3(cellX + cellWidth/2, cellHeight - 0.25, cellZ);
        rightWallTop.material = this.abandonedWallMat;
        new BABYLON.PhysicsAggregate(rightWallTop, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Front wall sections with bars
        const barGapWidth = 2.5;
        const frontWallSide = (cellWidth - barGapWidth) / 2;
        
        [-1, 1].forEach((side, i) => {
            const fwSection = BABYLON.MeshBuilder.CreateBox(`cell2FrontWall_${i}`, {
                width: frontWallSide,
                height: cellHeight,
                depth: 0.3
            }, this.scene);
            fwSection.position = new BABYLON.Vector3(cellX + side * (barGapWidth/2 + frontWallSide/2), cellHeight/2, cellZ + cellDepth/2);
            fwSection.material = this.abandonedWallMat;
            new BABYLON.PhysicsAggregate(fwSection, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        });
        
        // Bars (rusted, some broken)
        this.createRustedBars(cellX, cellZ + cellDepth/2, barGapWidth, cellHeight);
        
        // Abandoned furniture
        this.createAbandonedFurniture(cellX, cellZ);
        
        // DISABLED - Too many lights cause WebGL shader overflow
        // Flickering light
        // const light = new BABYLON.PointLight("cell2Light", new BABYLON.Vector3(cellX, cellHeight - 0.5, cellZ), this.scene);
        // light.intensity = 0.3;
        // light.diffuse = new BABYLON.Color3(0.9, 0.8, 0.6);
    }
    
    createRustedBars(x, z, width, height) {
        const barMat = new BABYLON.StandardMaterial("rustedBarMat", this.scene);
        barMat.diffuseColor = new BABYLON.Color3(0.45, 0.35, 0.25); // Rusty color
        barMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        
        const numBars = 6;
        const spacing = width / (numBars + 1);
        
        for (let i = 1; i <= numBars; i++) {
            // Some bars are broken (missing)
            if (i === 3 || i === 4) continue; // Gap for passage
            
            const barHeight = i === 2 || i === 5 ? height * 0.6 : height; // Some shorter
            const bar = BABYLON.MeshBuilder.CreateCylinder(`cell2Bar_${i}`, {
                diameter: 0.08,
                height: barHeight
            }, this.scene);
            bar.position = new BABYLON.Vector3(x - width/2 + i * spacing, barHeight/2, z);
            bar.material = barMat;
            
            if (i !== 2 && i !== 5) {
                new BABYLON.PhysicsAggregate(bar, BABYLON.PhysicsShapeType.CYLINDER, { mass: 0 }, this.scene);
            }
        }
    }
    
    createAbandonedFurniture(cellX, cellZ) {
        // Overturned bed frame
        const bedFrame = BABYLON.MeshBuilder.CreateBox("cell2Bed", {
            width: 2,
            height: 0.3,
            depth: 1
        }, this.scene);
        bedFrame.position = new BABYLON.Vector3(cellX - 1, 0.5, cellZ - 1);
        bedFrame.rotation.z = Math.PI / 6; // Tilted
        
        const rustMat = new BABYLON.StandardMaterial("rustMat", this.scene);
        rustMat.diffuseColor = new BABYLON.Color3(0.35, 0.28, 0.22);
        bedFrame.material = rustMat;
        
        // Broken chair
        const chairSeat = BABYLON.MeshBuilder.CreateBox("cell2Chair", {
            width: 0.5,
            height: 0.1,
            depth: 0.5
        }, this.scene);
        chairSeat.position = new BABYLON.Vector3(cellX + 1.5, 0.3, cellZ + 0.5);
        chairSeat.rotation.y = 0.3;
        chairSeat.material = rustMat;
    }
    
    // =====================================================
    // CELL 3 - Empty cell (south of Cell 2)
    // =====================================================
    createCell3() {
        const cellWidth = 6;
        const cellDepth = 5;
        const cellHeight = 3.5;
        const cellZ = -16; // South of Cell 2
        const cellX = 0;
        
        // Floor
        const floor = BABYLON.MeshBuilder.CreateBox("cell3Floor", {
            width: cellWidth,
            height: 0.2,
            depth: cellDepth
        }, this.scene);
        floor.position = new BABYLON.Vector3(cellX, -0.1, cellZ);
        floor.material = this.floorMat;
        new BABYLON.PhysicsAggregate(floor, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Ceiling
        const ceiling = BABYLON.MeshBuilder.CreateBox("cell3Ceiling", {
            width: cellWidth,
            height: 0.2,
            depth: cellDepth
        }, this.scene);
        ceiling.position = new BABYLON.Vector3(cellX, cellHeight, cellZ);
        ceiling.material = this.ceilingMat;
        
        // Back wall
        const backWall = BABYLON.MeshBuilder.CreateBox("cell3BackWall", {
            width: cellWidth,
            height: cellHeight,
            depth: 0.3
        }, this.scene);
        backWall.position = new BABYLON.Vector3(cellX, cellHeight/2, cellZ - cellDepth/2);
        backWall.material = this.wallMat;
        new BABYLON.PhysicsAggregate(backWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Left wall
        const leftWall = BABYLON.MeshBuilder.CreateBox("cell3LeftWall", {
            width: 0.3,
            height: cellHeight,
            depth: cellDepth
        }, this.scene);
        leftWall.position = new BABYLON.Vector3(cellX - cellWidth/2, cellHeight/2, cellZ);
        leftWall.material = this.wallMat;
        new BABYLON.PhysicsAggregate(leftWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Right wall with opening
        const rightWallTop = BABYLON.MeshBuilder.CreateBox("cell3RightWallTop", {
            width: 0.3,
            height: 0.5,
            depth: cellDepth
        }, this.scene);
        rightWallTop.position = new BABYLON.Vector3(cellX + cellWidth/2, cellHeight - 0.25, cellZ);
        rightWallTop.material = this.wallMat;
        new BABYLON.PhysicsAggregate(rightWallTop, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Front wall with bars
        const barGapWidth = 2.5;
        const frontWallSide = (cellWidth - barGapWidth) / 2;
        
        [-1, 1].forEach((side, i) => {
            const fwSection = BABYLON.MeshBuilder.CreateBox(`cell3FrontWall_${i}`, {
                width: frontWallSide,
                height: cellHeight,
                depth: 0.3
            }, this.scene);
            fwSection.position = new BABYLON.Vector3(cellX + side * (barGapWidth/2 + frontWallSide/2), cellHeight/2, cellZ + cellDepth/2);
            fwSection.material = this.wallMat;
            new BABYLON.PhysicsAggregate(fwSection, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        });
        
        // Intact bars
        this.createIntactBars(cellX, cellZ + cellDepth/2, barGapWidth, cellHeight, "cell3");
        
        // DISABLED - Too many lights cause WebGL shader overflow
        // Empty - just a dim light
        // const light = new BABYLON.PointLight("cell3Light", new BABYLON.Vector3(cellX, cellHeight - 0.5, cellZ), this.scene);
        // light.intensity = 0.4;
        // light.diffuse = new BABYLON.Color3(0.9, 0.9, 1.0);
    }
    
    createIntactBars(x, z, width, height, prefix) {
        const barMat = new BABYLON.StandardMaterial(`${prefix}BarMat`, this.scene);
        barMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.35);
        barMat.specularColor = new BABYLON.Color3(0.4, 0.4, 0.4);
        
        const numBars = 7;
        const spacing = width / (numBars + 1);
        
        for (let i = 1; i <= numBars; i++) {
            const bar = BABYLON.MeshBuilder.CreateCylinder(`${prefix}Bar_${i}`, {
                diameter: 0.08,
                height: height
            }, this.scene);
            bar.position = new BABYLON.Vector3(x - width/2 + i * spacing, height/2, z);
            bar.material = barMat;
            new BABYLON.PhysicsAggregate(bar, BABYLON.PhysicsShapeType.CYLINDER, { mass: 0 }, this.scene);
        }
    }
    
    // =====================================================
    // CELL 4 - Skeleton cell with SECRET STAIRS (south of Cell 3)
    // =====================================================
    createCell4() {
        const cellWidth = 6;
        const cellDepth = 5;
        const cellHeight = 3.5;
        const cellZ = -24; // South of Cell 3
        const cellX = 0;
        
        // Floor
        const floor = BABYLON.MeshBuilder.CreateBox("cell4Floor", {
            width: cellWidth,
            height: 0.2,
            depth: cellDepth
        }, this.scene);
        floor.position = new BABYLON.Vector3(cellX, -0.1, cellZ);
        floor.material = this.floorMat;
        new BABYLON.PhysicsAggregate(floor, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Ceiling
        const ceiling = BABYLON.MeshBuilder.CreateBox("cell4Ceiling", {
            width: cellWidth,
            height: 0.2,
            depth: cellDepth
        }, this.scene);
        ceiling.position = new BABYLON.Vector3(cellX, cellHeight, cellZ);
        ceiling.material = this.ceilingMat;
        
        // Back wall
        const backWall = BABYLON.MeshBuilder.CreateBox("cell4BackWall", {
            width: cellWidth,
            height: cellHeight,
            depth: 0.3
        }, this.scene);
        backWall.position = new BABYLON.Vector3(cellX, cellHeight/2, cellZ - cellDepth/2);
        backWall.material = this.abandonedWallMat;
        new BABYLON.PhysicsAggregate(backWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // LEFT WALL - has SECRET STAIRS hidden behind panel
        this.createCell4LeftWallWithSecret(cellX, cellZ, cellWidth, cellDepth, cellHeight);
        
        // Right wall with opening
        const rightWallTop = BABYLON.MeshBuilder.CreateBox("cell4RightWallTop", {
            width: 0.3,
            height: 0.5,
            depth: cellDepth
        }, this.scene);
        rightWallTop.position = new BABYLON.Vector3(cellX + cellWidth/2, cellHeight - 0.25, cellZ);
        rightWallTop.material = this.abandonedWallMat;
        new BABYLON.PhysicsAggregate(rightWallTop, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Front wall with bars
        const barGapWidth = 2.5;
        const frontWallSide = (cellWidth - barGapWidth) / 2;
        
        [-1, 1].forEach((side, i) => {
            const fwSection = BABYLON.MeshBuilder.CreateBox(`cell4FrontWall_${i}`, {
                width: frontWallSide,
                height: cellHeight,
                depth: 0.3
            }, this.scene);
            fwSection.position = new BABYLON.Vector3(cellX + side * (barGapWidth/2 + frontWallSide/2), cellHeight/2, cellZ + cellDepth/2);
            fwSection.material = this.abandonedWallMat;
            new BABYLON.PhysicsAggregate(fwSection, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        });
        
        // Broken bars - can walk through
        this.createRustedBars(cellX, cellZ + cellDepth/2, barGapWidth, cellHeight);
        
        // Create skeleton in corner
        this.createSkeleton(cellX + 1.5, cellZ - 1.5);
        
        // DISABLED - Too many lights cause WebGL shader overflow
        // Very dim light
        // const light = new BABYLON.PointLight("cell4Light", new BABYLON.Vector3(cellX, cellHeight - 0.5, cellZ), this.scene);
        // light.intensity = 0.2;
        // light.diffuse = new BABYLON.Color3(0.7, 0.7, 0.8);
    }
    
    createCell4LeftWallWithSecret(cellX, cellZ, cellWidth, cellDepth, cellHeight) {
        const wallX = cellX - cellWidth/2;
        const panelWidth = 1.8;
        const panelHeight = 2.5;
        
        // Top section above panel
        const wallTopSection = BABYLON.MeshBuilder.CreateBox("cell4WallTop", {
            width: 0.3,
            height: cellHeight - panelHeight,
            depth: cellDepth
        }, this.scene);
        wallTopSection.position = new BABYLON.Vector3(wallX, cellHeight - (cellHeight - panelHeight)/2, cellZ);
        wallTopSection.material = this.abandonedWallMat;
        new BABYLON.PhysicsAggregate(wallTopSection, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Section in front of panel (toward bars)
        const wallFrontSection = BABYLON.MeshBuilder.CreateBox("cell4WallFront", {
            width: 0.3,
            height: panelHeight,
            depth: (cellDepth - panelWidth) / 2
        }, this.scene);
        wallFrontSection.position = new BABYLON.Vector3(wallX, panelHeight/2, cellZ + cellDepth/2 - (cellDepth - panelWidth)/4);
        wallFrontSection.material = this.abandonedWallMat;
        new BABYLON.PhysicsAggregate(wallFrontSection, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Section behind panel (toward back wall)
        const wallBackSection = BABYLON.MeshBuilder.CreateBox("cell4WallBack", {
            width: 0.3,
            height: panelHeight,
            depth: (cellDepth - panelWidth) / 2
        }, this.scene);
        wallBackSection.position = new BABYLON.Vector3(wallX, panelHeight/2, cellZ - cellDepth/2 + (cellDepth - panelWidth)/4);
        wallBackSection.material = this.abandonedWallMat;
        new BABYLON.PhysicsAggregate(wallBackSection, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // SECRET PANEL - slides to reveal underground passage
        const secretPanelMat = new BABYLON.StandardMaterial("cell4SecretPanelMat", this.scene);
        secretPanelMat.diffuseTexture = this.createWallTexture("secretPanel", new BABYLON.Color3(0.22, 0.22, 0.24));
        secretPanelMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        
        this.cell4SecretPanel = BABYLON.MeshBuilder.CreateBox("cell4SecretPanel", {
            width: 0.25,
            height: panelHeight,
            depth: panelWidth
        }, this.scene);
        this.cell4SecretPanel.position = new BABYLON.Vector3(wallX + 0.05, panelHeight/2, cellZ);
        this.cell4SecretPanel.material = secretPanelMat;
        new BABYLON.PhysicsAggregate(this.cell4SecretPanel, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Subtle crack hint
        const crackMat = new BABYLON.StandardMaterial("crackMat", this.scene);
        crackMat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.17);
        
        const crack = BABYLON.MeshBuilder.CreateBox("panelCrack", {
            width: 0.02,
            height: panelHeight - 0.2,
            depth: 0.26
        }, this.scene);
        crack.position = new BABYLON.Vector3(wallX + 0.1, panelHeight/2, cellZ - panelWidth/2 + 0.13);
        crack.material = crackMat;
        
        this.cell4SecretPanel.metadata = {
            interactable: true,
            type: 'cell4_secret_panel',
            name: 'Cracked Wall',
            hint: 'There seems to be a draft coming from behind...',
            opened: false
        };
        
        this.cell4SecretPanelOpen = false;
    }
    
    createSkeleton(x, z) {
        // Simple skeleton representation using primitives
        // Skull
        const skull = BABYLON.MeshBuilder.CreateSphere("skull", { diameter: 0.3 }, this.scene);
        skull.position = new BABYLON.Vector3(x, 0.4, z);
        skull.material = this.boneMat;
        
        // Ribcage (simplified as box)
        const ribcage = BABYLON.MeshBuilder.CreateBox("ribcage", {
            width: 0.4,
            height: 0.5,
            depth: 0.25
        }, this.scene);
        ribcage.position = new BABYLON.Vector3(x, 0.15, z + 0.3);
        ribcage.rotation.x = -Math.PI / 6;
        ribcage.material = this.boneMat;
        
        // Arms (cylinders)
        [-0.3, 0.3].forEach((offset, i) => {
            const arm = BABYLON.MeshBuilder.CreateCylinder(`arm_${i}`, {
                diameter: 0.06,
                height: 0.5
            }, this.scene);
            arm.position = new BABYLON.Vector3(x + offset, 0.1, z + 0.4);
            arm.rotation.z = offset > 0 ? Math.PI / 4 : -Math.PI / 4;
            arm.material = this.boneMat;
        });
        
        // Legs (cylinders)
        [-0.15, 0.15].forEach((offset, i) => {
            const leg = BABYLON.MeshBuilder.CreateCylinder(`leg_${i}`, {
                diameter: 0.08,
                height: 0.7
            }, this.scene);
            leg.position = new BABYLON.Vector3(x + offset, 0.1, z + 0.8);
            leg.rotation.x = Math.PI / 2;
            leg.material = this.boneMat;
        });
        
        // Creepy detail: a rusty key next to the skeleton (hint!)
        const keyMat = new BABYLON.StandardMaterial("oldKeyMat", this.scene);
        keyMat.diffuseColor = new BABYLON.Color3(0.5, 0.35, 0.2);
        keyMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        
        const keyHandle = BABYLON.MeshBuilder.CreateTorus("keyHandle", {
            diameter: 0.08,
            thickness: 0.015
        }, this.scene);
        keyHandle.position = new BABYLON.Vector3(x - 0.4, 0.02, z + 0.2);
        keyHandle.rotation.x = Math.PI / 2;
        keyHandle.material = keyMat;
        
        const keyShaft = BABYLON.MeshBuilder.CreateCylinder("keyShaft", {
            diameter: 0.02,
            height: 0.12
        }, this.scene);
        keyShaft.position = new BABYLON.Vector3(x - 0.4, 0.02, z + 0.26);
        keyShaft.rotation.x = Math.PI / 2;
        keyShaft.material = keyMat;
    }
    
    // =====================================================
    // MAIN HALLWAY - Horizontal corridor connecting cells to rooms
    // =====================================================
    createMainHallway() {
        const hallWidth = 3;
        const hallLength = 25; // Long hallway
        const hallHeight = 3.5;
        const hallX = 5; // East of cells
        const hallZ = -12; // Center point
        
        // Hallway floor
        const floor = BABYLON.MeshBuilder.CreateBox("hallwayFloor", {
            width: hallWidth,
            height: 0.2,
            depth: hallLength
        }, this.scene);
        floor.position = new BABYLON.Vector3(hallX, -0.1, hallZ);
        floor.material = this.hallwayFloorMat;
        new BABYLON.PhysicsAggregate(floor, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Hallway ceiling
        const ceiling = BABYLON.MeshBuilder.CreateBox("hallwayCeiling", {
            width: hallWidth,
            height: 0.2,
            depth: hallLength
        }, this.scene);
        ceiling.position = new BABYLON.Vector3(hallX, hallHeight, hallZ);
        ceiling.material = this.ceilingMat;
        
        // Left wall (toward cells) - has openings at each cell
        this.createHallwayLeftWall(hallX, hallZ, hallWidth, hallLength, hallHeight);
        
        // Right wall (toward rooms) - has openings for Guard Station, Storage, Medical, Armory
        this.createHallwayRightWall(hallX, hallZ, hallWidth, hallLength, hallHeight);
        
        // North end wall
        const northWall = BABYLON.MeshBuilder.CreateBox("hallNorthWall", {
            width: hallWidth,
            height: hallHeight,
            depth: 0.3
        }, this.scene);
        northWall.position = new BABYLON.Vector3(hallX, hallHeight/2, hallZ + hallLength/2);
        northWall.material = this.wallMat;
        new BABYLON.PhysicsAggregate(northWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // South end - opening to elevator lobby
        // (No wall - connects to elevator lobby)
        
        // Hallway lighting - REDUCED TO 1 LIGHT to avoid WebGL uniform overflow
        // Central hallway light only
        const centralLight = new BABYLON.PointLight(`hallLight_central`, 
            new BABYLON.Vector3(hallX, hallHeight - 0.3, hallZ), this.scene);
        centralLight.intensity = 0.8;
        centralLight.diffuse = new BABYLON.Color3(1, 0.95, 0.9);
        centralLight.range = 25; // Increased range to cover entire hallway
        
        // Light fixtures (visual only, no extra lights)
        const numFixtures = 5;
        for (let i = 0; i < numFixtures; i++) {
            const fixtureZ = hallZ + hallLength/2 - (i + 0.5) * (hallLength / numFixtures);
            const fixture = BABYLON.MeshBuilder.CreateBox(`lightFixture_${i}`, {
                width: 0.6,
                height: 0.1,
                depth: 0.3
            }, this.scene);
            fixture.position = new BABYLON.Vector3(hallX, hallHeight - 0.1, fixtureZ);
            const fixtureMat = new BABYLON.StandardMaterial(`fixtureMat_${i}`, this.scene);
            fixtureMat.emissiveColor = new BABYLON.Color3(1, 0.95, 0.85);
            fixture.material = fixtureMat;
        }
    }
    
    createHallwayLeftWall(hallX, hallZ, hallWidth, hallLength, hallHeight) {
        const wallX = hallX - hallWidth/2;
        const doorWidth = 2;
        const doorHeight = 2.8;
        
        // Cell connection points (Z positions relative to hallZ)
        const cellConnections = [
            { z: 0, name: "cell1" },      // Jake's cell
            { z: -8, name: "cell2" },     // Abandoned
            { z: -16, name: "cell3" },    // Empty
            { z: -24, name: "cell4" }     // Skeleton
        ];
        
        // We need wall sections between and around the doors
        // For simplicity, create a wall with holes
        // Top section (above all doors)
        const topWall = BABYLON.MeshBuilder.CreateBox("hallLeftWallTop", {
            width: 0.3,
            height: hallHeight - doorHeight,
            depth: hallLength
        }, this.scene);
        topWall.position = new BABYLON.Vector3(wallX, doorHeight + (hallHeight - doorHeight)/2, hallZ);
        topWall.material = this.wallMat;
        new BABYLON.PhysicsAggregate(topWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Wall sections between doors
        let lastZ = hallZ + hallLength/2;
        cellConnections.forEach((conn, i) => {
            const doorZ = hallZ + hallLength/2 + conn.z - hallLength/2;
            const sectionDepth = lastZ - doorZ - doorWidth/2;
            
            if (sectionDepth > 0.1) {
                const section = BABYLON.MeshBuilder.CreateBox(`hallLeftSection_${i}`, {
                    width: 0.3,
                    height: doorHeight,
                    depth: sectionDepth
                }, this.scene);
                section.position = new BABYLON.Vector3(wallX, doorHeight/2, lastZ - sectionDepth/2);
                section.material = this.wallMat;
                new BABYLON.PhysicsAggregate(section, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
            }
            
            lastZ = doorZ - doorWidth/2;
        });
        
        // Final section after last door
        const finalSectionDepth = lastZ - (hallZ - hallLength/2);
        if (finalSectionDepth > 0.1) {
            const finalSection = BABYLON.MeshBuilder.CreateBox("hallLeftFinal", {
                width: 0.3,
                height: doorHeight,
                depth: finalSectionDepth
            }, this.scene);
            finalSection.position = new BABYLON.Vector3(wallX, doorHeight/2, lastZ - finalSectionDepth/2);
            finalSection.material = this.wallMat;
            new BABYLON.PhysicsAggregate(finalSection, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        }
    }
    
    createHallwayRightWall(hallX, hallZ, hallWidth, hallLength, hallHeight) {
        const wallX = hallX + hallWidth/2;
        const doorWidth = 2;
        const doorHeight = 2.8;
        
        // Room connection points
        const roomConnections = [
            { z: -4, name: "guardStation" },  // North side
            { z: -10, name: "storage" },      // North side
            { z: -14, name: "medical" },      // South side
            { z: -20, name: "armory" }        // South side
        ];
        
        // Top section
        const topWall = BABYLON.MeshBuilder.CreateBox("hallRightWallTop", {
            width: 0.3,
            height: hallHeight - doorHeight,
            depth: hallLength
        }, this.scene);
        topWall.position = new BABYLON.Vector3(wallX, doorHeight + (hallHeight - doorHeight)/2, hallZ);
        topWall.material = this.wallMat;
        new BABYLON.PhysicsAggregate(topWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Wall sections between doors
        let lastZ = hallZ + hallLength/2;
        roomConnections.forEach((conn, i) => {
            const doorZ = hallZ + hallLength/2 + conn.z - hallLength/2;
            const sectionDepth = lastZ - doorZ - doorWidth/2;
            
            if (sectionDepth > 0.1) {
                const section = BABYLON.MeshBuilder.CreateBox(`hallRightSection_${i}`, {
                    width: 0.3,
                    height: doorHeight,
                    depth: sectionDepth
                }, this.scene);
                section.position = new BABYLON.Vector3(wallX, doorHeight/2, lastZ - sectionDepth/2);
                section.material = this.wallMat;
                new BABYLON.PhysicsAggregate(section, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
            }
            
            lastZ = doorZ - doorWidth/2;
        });
        
        // Final section
        const finalSectionDepth = lastZ - (hallZ - hallLength/2);
        if (finalSectionDepth > 0.1) {
            const finalSection = BABYLON.MeshBuilder.CreateBox("hallRightFinal", {
                width: 0.3,
                height: doorHeight,
                depth: finalSectionDepth
            }, this.scene);
            finalSection.position = new BABYLON.Vector3(wallX, doorHeight/2, lastZ - finalSectionDepth/2);
            finalSection.material = this.wallMat;
            new BABYLON.PhysicsAggregate(finalSection, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        }
    }
    
    // =====================================================
    // GUARD STATION - Has GUARD with KEYCARD
    // =====================================================
    createGuardStation() {
        const roomWidth = 6;
        const roomDepth = 5;
        const roomHeight = 3.5;
        const roomX = 10; // East of hallway
        const roomZ = -4; // North section
        
        // Floor
        const floor = BABYLON.MeshBuilder.CreateBox("guardFloor", {
            width: roomWidth,
            height: 0.2,
            depth: roomDepth
        }, this.scene);
        floor.position = new BABYLON.Vector3(roomX, -0.1, roomZ);
        floor.material = this.hallwayFloorMat;
        new BABYLON.PhysicsAggregate(floor, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Ceiling
        const ceiling = BABYLON.MeshBuilder.CreateBox("guardCeiling", {
            width: roomWidth,
            height: 0.2,
            depth: roomDepth
        }, this.scene);
        ceiling.position = new BABYLON.Vector3(roomX, roomHeight, roomZ);
        ceiling.material = this.ceilingMat;
        
        // Walls (back, left partial with door, right, front)
        const backWall = BABYLON.MeshBuilder.CreateBox("guardBackWall", {
            width: roomWidth,
            height: roomHeight,
            depth: 0.3
        }, this.scene);
        backWall.position = new BABYLON.Vector3(roomX, roomHeight/2, roomZ - roomDepth/2);
        backWall.material = this.guardWallMat;
        new BABYLON.PhysicsAggregate(backWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        const rightWall = BABYLON.MeshBuilder.CreateBox("guardRightWall", {
            width: 0.3,
            height: roomHeight,
            depth: roomDepth
        }, this.scene);
        rightWall.position = new BABYLON.Vector3(roomX + roomWidth/2, roomHeight/2, roomZ);
        rightWall.material = this.guardWallMat;
        new BABYLON.PhysicsAggregate(rightWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        const frontWall = BABYLON.MeshBuilder.CreateBox("guardFrontWall", {
            width: roomWidth,
            height: roomHeight,
            depth: 0.3
        }, this.scene);
        frontWall.position = new BABYLON.Vector3(roomX, roomHeight/2, roomZ + roomDepth/2);
        frontWall.material = this.guardWallMat;
        new BABYLON.PhysicsAggregate(frontWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Left wall partial (door toward hallway)
        const leftWallTop = BABYLON.MeshBuilder.CreateBox("guardLeftWallTop", {
            width: 0.3,
            height: 0.7,
            depth: roomDepth
        }, this.scene);
        leftWallTop.position = new BABYLON.Vector3(roomX - roomWidth/2, roomHeight - 0.35, roomZ);
        leftWallTop.material = this.guardWallMat;
        new BABYLON.PhysicsAggregate(leftWallTop, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Desk
        this.createGuardDesk(roomX, roomZ);
        
        // CCTV Monitors
        this.createCCTVMonitors(roomX + 1.5, roomZ - 1.5);
        
        // Guard position marker (will load 3D model here)
        this.guardPosition = new BABYLON.Vector3(roomX, 0, roomZ);
        
        // KEYCARD pickup (dropped by guard or on desk)
        this.createKeycardPickup(roomX - 0.5, roomZ - 1);
        
        // DISABLED - Too many lights cause WebGL shader overflow
        // const light = new BABYLON.PointLight("guardLight", 
        //     new BABYLON.Vector3(roomX, roomHeight - 0.3, roomZ), this.scene);
        // light.intensity = 0.7;
        // light.diffuse = new BABYLON.Color3(0.9, 1, 0.9);
    }
    
    createGuardDesk(x, z) {
        // Main desk surface
        const deskMat = new BABYLON.StandardMaterial("deskMat", this.scene);
        deskMat.diffuseColor = new BABYLON.Color3(0.35, 0.25, 0.18);
        deskMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        
        const deskTop = BABYLON.MeshBuilder.CreateBox("guardDeskTop", {
            width: 2,
            height: 0.1,
            depth: 1
        }, this.scene);
        deskTop.position = new BABYLON.Vector3(x - 1, 0.8, z - 1.5);
        deskTop.material = deskMat;
        new BABYLON.PhysicsAggregate(deskTop, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Desk legs
        const legMat = new BABYLON.StandardMaterial("legMat", this.scene);
        legMat.diffuseColor = new BABYLON.Color3(0.25, 0.25, 0.28);
        
        [[-0.8, -1.8], [-0.8, -1.2], [0.8, -1.8], [0.8, -1.2]].forEach((offset, i) => {
            const leg = BABYLON.MeshBuilder.CreateBox(`deskLeg_${i}`, {
                width: 0.1,
                height: 0.75,
                depth: 0.1
            }, this.scene);
            leg.position = new BABYLON.Vector3(x - 1 + offset[0], 0.375, z + offset[1]);
            leg.material = legMat;
        });
        
        // Chair
        const chairSeat = BABYLON.MeshBuilder.CreateBox("guardChair", {
            width: 0.6,
            height: 0.1,
            depth: 0.6
        }, this.scene);
        chairSeat.position = new BABYLON.Vector3(x - 1, 0.5, z - 0.5);
        chairSeat.material = legMat;
        
        const chairBack = BABYLON.MeshBuilder.CreateBox("guardChairBack", {
            width: 0.6,
            height: 0.6,
            depth: 0.1
        }, this.scene);
        chairBack.position = new BABYLON.Vector3(x - 1, 0.8, z - 0.15);
        chairBack.material = legMat;
    }
    
    createCCTVMonitors(x, z) {
        const monitorMat = new BABYLON.StandardMaterial("monitorMat", this.scene);
        monitorMat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.18);
        
        const screenMat = new BABYLON.StandardMaterial("screenMat", this.scene);
        screenMat.emissiveColor = new BABYLON.Color3(0.1, 0.15, 0.1);
        
        // 2x2 monitor grid
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 2; col++) {
                const monitor = BABYLON.MeshBuilder.CreateBox(`cctvMonitor_${row}_${col}`, {
                    width: 0.6,
                    height: 0.45,
                    depth: 0.15
                }, this.scene);
                monitor.position = new BABYLON.Vector3(x + col * 0.7, 1.2 + row * 0.5, z);
                monitor.material = monitorMat;
                
                // Screen
                const screen = BABYLON.MeshBuilder.CreatePlane(`cctvScreen_${row}_${col}`, {
                    width: 0.5,
                    height: 0.35
                }, this.scene);
                screen.position = new BABYLON.Vector3(x + col * 0.7, 1.2 + row * 0.5, z + 0.08);
                screen.material = screenMat;
            }
        }
    }
    
    createKeycardPickup(x, z) {
        // Keycard on desk or floor
        const keycardMat = new BABYLON.StandardMaterial("keycardMat", this.scene);
        keycardMat.diffuseColor = new BABYLON.Color3(0.2, 0.5, 0.8);
        keycardMat.emissiveColor = new BABYLON.Color3(0.05, 0.1, 0.15);
        keycardMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        
        const keycard = BABYLON.MeshBuilder.CreateBox("keycard", {
            width: 0.15,
            height: 0.01,
            depth: 0.1
        }, this.scene);
        keycard.position = new BABYLON.Vector3(x, 0.86, z);
        keycard.material = keycardMat;
        
        // Glow effect
        const glowLayer = new BABYLON.GlowLayer("keycardGlow", this.scene);
        glowLayer.addIncludedOnlyMesh(keycard);
        
        keycard.metadata = {
            interactable: true,
            type: 'keycard',
            name: 'Security Keycard',
            description: 'Opens elevator access'
        };
        
        this.keycardPickup = keycard;
        
        // Floating animation
        let floatTime = 0;
        this.scene.registerBeforeRender(() => {
            if (this.keycardPickup && this.keycardPickup.isVisible) {
                floatTime += 0.05;
                this.keycardPickup.position.y = 0.86 + Math.sin(floatTime) * 0.02;
                this.keycardPickup.rotation.y += 0.02;
            }
        });
    }
    
    // =====================================================
    // STORAGE ROOM - Crates and supplies
    // =====================================================
    createStorageRoom() {
        const roomWidth = 5;
        const roomDepth = 4;
        const roomHeight = 3.5;
        const roomX = 10;
        const roomZ = -10;
        
        // Floor
        const floor = BABYLON.MeshBuilder.CreateBox("storageFloor", {
            width: roomWidth,
            height: 0.2,
            depth: roomDepth
        }, this.scene);
        floor.position = new BABYLON.Vector3(roomX, -0.1, roomZ);
        floor.material = this.floorMat;
        new BABYLON.PhysicsAggregate(floor, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Ceiling
        const ceiling = BABYLON.MeshBuilder.CreateBox("storageCeiling", {
            width: roomWidth,
            height: 0.2,
            depth: roomDepth
        }, this.scene);
        ceiling.position = new BABYLON.Vector3(roomX, roomHeight, roomZ);
        ceiling.material = this.ceilingMat;
        
        // Walls
        const backWall = BABYLON.MeshBuilder.CreateBox("storageBackWall", {
            width: roomWidth,
            height: roomHeight,
            depth: 0.3
        }, this.scene);
        backWall.position = new BABYLON.Vector3(roomX, roomHeight/2, roomZ - roomDepth/2);
        backWall.material = this.storageWallMat;
        new BABYLON.PhysicsAggregate(backWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        const rightWall = BABYLON.MeshBuilder.CreateBox("storageRightWall", {
            width: 0.3,
            height: roomHeight,
            depth: roomDepth
        }, this.scene);
        rightWall.position = new BABYLON.Vector3(roomX + roomWidth/2, roomHeight/2, roomZ);
        rightWall.material = this.storageWallMat;
        new BABYLON.PhysicsAggregate(rightWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        const frontWall = BABYLON.MeshBuilder.CreateBox("storageFrontWall", {
            width: roomWidth,
            height: roomHeight,
            depth: 0.3
        }, this.scene);
        frontWall.position = new BABYLON.Vector3(roomX, roomHeight/2, roomZ + roomDepth/2);
        frontWall.material = this.storageWallMat;
        new BABYLON.PhysicsAggregate(frontWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Left wall partial
        const leftWallTop = BABYLON.MeshBuilder.CreateBox("storageLeftWallTop", {
            width: 0.3,
            height: 0.7,
            depth: roomDepth
        }, this.scene);
        leftWallTop.position = new BABYLON.Vector3(roomX - roomWidth/2, roomHeight - 0.35, roomZ);
        leftWallTop.material = this.storageWallMat;
        new BABYLON.PhysicsAggregate(leftWallTop, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Create crates
        this.createStorageCrates(roomX, roomZ);
        
        // Shelves
        this.createStorageShelves(roomX, roomZ);
        
        // DISABLED - Too many lights cause WebGL shader overflow
        // const light = new BABYLON.PointLight("storageLight", 
        //     new BABYLON.Vector3(roomX, roomHeight - 0.3, roomZ), this.scene);
        // light.intensity = 0.4;
        // light.diffuse = new BABYLON.Color3(1, 0.9, 0.8);
    }
    
    createStorageCrates(x, z) {
        const crateMat = new BABYLON.StandardMaterial("crateMat", this.scene);
        crateMat.diffuseColor = new BABYLON.Color3(0.45, 0.35, 0.2);
        crateMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        
        // Various sized crates
        const crateConfigs = [
            { pos: [1.5, 0.4, -1], size: [0.8, 0.8, 0.8] },
            { pos: [1.5, 1.2, -1], size: [0.7, 0.7, 0.7] },
            { pos: [0.5, 0.3, -1.2], size: [0.6, 0.6, 0.6] },
            { pos: [-1, 0.5, 0.5], size: [1, 1, 1] },
            { pos: [-1.5, 0.25, -0.8], size: [0.5, 0.5, 0.5] }
        ];
        
        crateConfigs.forEach((config, i) => {
            const crate = BABYLON.MeshBuilder.CreateBox(`crate_${i}`, {
                width: config.size[0],
                height: config.size[1],
                depth: config.size[2]
            }, this.scene);
            crate.position = new BABYLON.Vector3(x + config.pos[0], config.pos[1], z + config.pos[2]);
            crate.rotation.y = Math.random() * 0.3;
            crate.material = crateMat;
            new BABYLON.PhysicsAggregate(crate, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        });
    }
    
    createStorageShelves(x, z) {
        const shelfMat = new BABYLON.StandardMaterial("shelfMat", this.scene);
        shelfMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.33);
        
        // Metal shelving unit against back wall
        const shelfUnit = BABYLON.MeshBuilder.CreateBox("shelfUnit", {
            width: 2,
            height: 2.5,
            depth: 0.5
        }, this.scene);
        shelfUnit.position = new BABYLON.Vector3(x, 1.25, z - 1.5);
        shelfUnit.material = shelfMat;
        
        // Shelf boards
        for (let i = 0; i < 4; i++) {
            const board = BABYLON.MeshBuilder.CreateBox(`shelfBoard_${i}`, {
                width: 1.9,
                height: 0.05,
                depth: 0.45
            }, this.scene);
            board.position = new BABYLON.Vector3(x, 0.5 + i * 0.6, z - 1.5);
            board.material = shelfMat;
        }
    }
    
    // =====================================================
    // MEDICAL BAY - Health pickup, medkit, supplies
    // =====================================================
    createMedicalBay() {
        const roomWidth = 5;
        const roomDepth = 5;
        const roomHeight = 3.5;
        const roomX = 10;
        const roomZ = -14;
        
        // Floor (slightly cleaner)
        const medFloorMat = new BABYLON.StandardMaterial("medFloorMat", this.scene);
        medFloorMat.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.42);
        medFloorMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        
        const floor = BABYLON.MeshBuilder.CreateBox("medicalFloor", {
            width: roomWidth,
            height: 0.2,
            depth: roomDepth
        }, this.scene);
        floor.position = new BABYLON.Vector3(roomX, -0.1, roomZ);
        floor.material = medFloorMat;
        new BABYLON.PhysicsAggregate(floor, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Ceiling
        const ceiling = BABYLON.MeshBuilder.CreateBox("medicalCeiling", {
            width: roomWidth,
            height: 0.2,
            depth: roomDepth
        }, this.scene);
        ceiling.position = new BABYLON.Vector3(roomX, roomHeight, roomZ);
        ceiling.material = this.ceilingMat;
        
        // Walls
        const backWall = BABYLON.MeshBuilder.CreateBox("medicalBackWall", {
            width: roomWidth,
            height: roomHeight,
            depth: 0.3
        }, this.scene);
        backWall.position = new BABYLON.Vector3(roomX, roomHeight/2, roomZ - roomDepth/2);
        backWall.material = this.medicalWallMat;
        new BABYLON.PhysicsAggregate(backWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        const rightWall = BABYLON.MeshBuilder.CreateBox("medicalRightWall", {
            width: 0.3,
            height: roomHeight,
            depth: roomDepth
        }, this.scene);
        rightWall.position = new BABYLON.Vector3(roomX + roomWidth/2, roomHeight/2, roomZ);
        rightWall.material = this.medicalWallMat;
        new BABYLON.PhysicsAggregate(rightWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        const frontWall = BABYLON.MeshBuilder.CreateBox("medicalFrontWall", {
            width: roomWidth,
            height: roomHeight,
            depth: 0.3
        }, this.scene);
        frontWall.position = new BABYLON.Vector3(roomX, roomHeight/2, roomZ + roomDepth/2);
        frontWall.material = this.medicalWallMat;
        new BABYLON.PhysicsAggregate(frontWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Left wall partial
        const leftWallTop = BABYLON.MeshBuilder.CreateBox("medicalLeftWallTop", {
            width: 0.3,
            height: 0.7,
            depth: roomDepth
        }, this.scene);
        leftWallTop.position = new BABYLON.Vector3(roomX - roomWidth/2, roomHeight - 0.35, roomZ);
        leftWallTop.material = this.medicalWallMat;
        new BABYLON.PhysicsAggregate(leftWallTop, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Medical bed/gurney
        this.createMedicalBed(roomX + 1, roomZ);
        
        // Medical cabinet with supplies
        this.createMedicalCabinet(roomX - 1.5, roomZ - 1.5);
        
        // Health pickup
        this.createHealthPickup(roomX, roomZ + 1);
        
        // Medical bay light - bright clinical lighting
        const light = new BABYLON.PointLight("medicalLight", 
            new BABYLON.Vector3(roomX, roomHeight - 0.3, roomZ), this.scene);
        light.intensity = 0.6;
        light.diffuse = new BABYLON.Color3(1, 1, 1);
        light.range = 12;
        
        // Red cross on wall
        this.createRedCross(roomX, roomZ - roomDepth/2 + 0.2, roomHeight/2 + 0.5);
    }
    
    createMedicalBed(x, z) {
        const bedMat = new BABYLON.StandardMaterial("medBedMat", this.scene);
        bedMat.diffuseColor = new BABYLON.Color3(0.85, 0.85, 0.85);
        
        // Gurney frame
        const frame = BABYLON.MeshBuilder.CreateBox("medGurney", {
            width: 0.9,
            height: 0.6,
            depth: 2
        }, this.scene);
        frame.position = new BABYLON.Vector3(x, 0.3, z);
        frame.material = bedMat;
        
        // Mattress
        const mattressMat = new BABYLON.StandardMaterial("medMattressMat", this.scene);
        mattressMat.diffuseColor = new BABYLON.Color3(0.3, 0.5, 0.3);
        
        const mattress = BABYLON.MeshBuilder.CreateBox("medMattress", {
            width: 0.8,
            height: 0.15,
            depth: 1.9
        }, this.scene);
        mattress.position = new BABYLON.Vector3(x, 0.68, z);
        mattress.material = mattressMat;
        
        // Wheels
        [-0.3, 0.3].forEach(xOff => {
            [-0.8, 0.8].forEach(zOff => {
                const wheel = BABYLON.MeshBuilder.CreateCylinder("medWheel", {
                    diameter: 0.12,
                    height: 0.05
                }, this.scene);
                wheel.rotation.z = Math.PI / 2;
                wheel.position = new BABYLON.Vector3(x + xOff, 0.06, z + zOff);
                wheel.material = new BABYLON.StandardMaterial("wheelMat", this.scene);
                wheel.material.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            });
        });
    }
    
    createMedicalCabinet(x, z) {
        const cabinetMat = new BABYLON.StandardMaterial("cabinetMat", this.scene);
        cabinetMat.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.92);
        
        const cabinet = BABYLON.MeshBuilder.CreateBox("medCabinet", {
            width: 1.2,
            height: 2,
            depth: 0.5
        }, this.scene);
        cabinet.position = new BABYLON.Vector3(x, 1, z);
        cabinet.material = cabinetMat;
        new BABYLON.PhysicsAggregate(cabinet, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Glass door effect
        const glassMat = new BABYLON.StandardMaterial("glassMat", this.scene);
        glassMat.diffuseColor = new BABYLON.Color3(0.8, 0.9, 1);
        glassMat.alpha = 0.3;
        
        const glass = BABYLON.MeshBuilder.CreatePlane("cabinetGlass", {
            width: 1,
            height: 1.6
        }, this.scene);
        glass.position = new BABYLON.Vector3(x, 1.1, z + 0.26);
        glass.material = glassMat;
    }
    
    createHealthPickup(x, z) {
        // Medkit pickup
        const medkitMat = new BABYLON.StandardMaterial("medkitMat", this.scene);
        medkitMat.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        
        const medkit = BABYLON.MeshBuilder.CreateBox("medkit", {
            width: 0.3,
            height: 0.1,
            depth: 0.2
        }, this.scene);
        medkit.position = new BABYLON.Vector3(x, 0.55, z);
        medkit.material = medkitMat;
        
        // Red cross on medkit
        const crossMat = new BABYLON.StandardMaterial("crossMat", this.scene);
        crossMat.diffuseColor = new BABYLON.Color3(0.8, 0.1, 0.1);
        crossMat.emissiveColor = new BABYLON.Color3(0.3, 0.05, 0.05);
        
        const crossH = BABYLON.MeshBuilder.CreateBox("crossH", {
            width: 0.15,
            height: 0.02,
            depth: 0.05
        }, this.scene);
        crossH.position = new BABYLON.Vector3(x, 0.56, z);
        crossH.material = crossMat;
        
        const crossV = BABYLON.MeshBuilder.CreateBox("crossV", {
            width: 0.05,
            height: 0.02,
            depth: 0.15
        }, this.scene);
        crossV.position = new BABYLON.Vector3(x, 0.57, z);
        crossV.material = crossMat;
        
        medkit.metadata = {
            interactable: true,
            type: 'health',
            name: 'Medkit',
            healAmount: 50
        };
        
        this.healthPickup = medkit;
    }
    
    createRedCross(x, z, y) {
        const crossMat = new BABYLON.StandardMaterial("wallCrossMat", this.scene);
        crossMat.diffuseColor = new BABYLON.Color3(0.8, 0.1, 0.1);
        crossMat.emissiveColor = new BABYLON.Color3(0.2, 0.02, 0.02);
        
        const crossH = BABYLON.MeshBuilder.CreateBox("wallCrossH", {
            width: 0.8,
            height: 0.2,
            depth: 0.05
        }, this.scene);
        crossH.position = new BABYLON.Vector3(x, y, z);
        crossH.material = crossMat;
        
        const crossV = BABYLON.MeshBuilder.CreateBox("wallCrossV", {
            width: 0.2,
            height: 0.8,
            depth: 0.05
        }, this.scene);
        crossV.position = new BABYLON.Vector3(x, y, z);
        crossV.material = crossMat;
    }
    
    // =====================================================
    // EXPANDED ARMORY - Weapons, ammo, armor
    // =====================================================
    createExpandedArmory() {
        const roomWidth = 6;
        const roomDepth = 5;
        const roomHeight = 3.5;
        const roomX = 10;
        const roomZ = -20;
        
        // Floor
        const floor = BABYLON.MeshBuilder.CreateBox("armoryFloor", {
            width: roomWidth,
            height: 0.2,
            depth: roomDepth
        }, this.scene);
        floor.position = new BABYLON.Vector3(roomX, -0.1, roomZ);
        floor.material = this.floorMat;
        new BABYLON.PhysicsAggregate(floor, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Ceiling
        const ceiling = BABYLON.MeshBuilder.CreateBox("armoryCeiling", {
            width: roomWidth,
            height: 0.2,
            depth: roomDepth
        }, this.scene);
        ceiling.position = new BABYLON.Vector3(roomX, roomHeight, roomZ);
        ceiling.material = this.ceilingMat;
        
        // Walls
        const backWall = BABYLON.MeshBuilder.CreateBox("armoryBackWall", {
            width: roomWidth,
            height: roomHeight,
            depth: 0.3
        }, this.scene);
        backWall.position = new BABYLON.Vector3(roomX, roomHeight/2, roomZ - roomDepth/2);
        backWall.material = this.armoryWallMat;
        new BABYLON.PhysicsAggregate(backWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        const rightWall = BABYLON.MeshBuilder.CreateBox("armoryRightWall", {
            width: 0.3,
            height: roomHeight,
            depth: roomDepth
        }, this.scene);
        rightWall.position = new BABYLON.Vector3(roomX + roomWidth/2, roomHeight/2, roomZ);
        rightWall.material = this.armoryWallMat;
        new BABYLON.PhysicsAggregate(rightWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        const frontWall = BABYLON.MeshBuilder.CreateBox("armoryFrontWall", {
            width: roomWidth,
            height: roomHeight,
            depth: 0.3
        }, this.scene);
        frontWall.position = new BABYLON.Vector3(roomX, roomHeight/2, roomZ + roomDepth/2);
        frontWall.material = this.armoryWallMat;
        new BABYLON.PhysicsAggregate(frontWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Left wall partial
        const leftWallTop = BABYLON.MeshBuilder.CreateBox("armoryLeftWallTop", {
            width: 0.3,
            height: 0.7,
            depth: roomDepth
        }, this.scene);
        leftWallTop.position = new BABYLON.Vector3(roomX - roomWidth/2, roomHeight - 0.35, roomZ);
        leftWallTop.material = this.armoryWallMat;
        new BABYLON.PhysicsAggregate(leftWallTop, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Weapon racks
        this.createWeaponRacks(roomX, roomZ);
        
        // Ammo crates
        this.createAmmoCrates(roomX + 1.5, roomZ + 1);
        
        // Armor stand
        this.createArmorStand(roomX - 1.5, roomZ - 1);
        
        // DISABLED - Too many lights cause WebGL shader overflow
        // const light = new BABYLON.PointLight("armoryLight", 
        //     new BABYLON.Vector3(roomX, roomHeight - 0.3, roomZ), this.scene);
        // light.intensity = 0.7;
        // light.diffuse = new BABYLON.Color3(0.9, 0.95, 1);
    }
    
    createWeaponRacks(x, z) {
        const rackMat = new BABYLON.StandardMaterial("rackMat", this.scene);
        rackMat.diffuseColor = new BABYLON.Color3(0.25, 0.25, 0.28);
        
        // Wall-mounted weapon rack
        const rack = BABYLON.MeshBuilder.CreateBox("weaponRack", {
            width: 3,
            height: 1.5,
            depth: 0.3
        }, this.scene);
        rack.position = new BABYLON.Vector3(x, 1.5, z - 2);
        rack.material = rackMat;
        new BABYLON.PhysicsAggregate(rack, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Weapon silhouettes (rifles)
        const weaponMat = new BABYLON.StandardMaterial("weaponMat", this.scene);
        weaponMat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.18);
        
        for (let i = 0; i < 4; i++) {
            const rifle = BABYLON.MeshBuilder.CreateBox(`rifle_${i}`, {
                width: 0.08,
                height: 0.15,
                depth: 0.8
            }, this.scene);
            rifle.position = new BABYLON.Vector3(x - 1.2 + i * 0.8, 1.5, z - 1.85);
            rifle.rotation.x = Math.PI / 12;
            rifle.material = weaponMat;
        }
    }
    
    createAmmoCrates(x, z) {
        const crateMat = new BABYLON.StandardMaterial("ammoCrateMat", this.scene);
        crateMat.diffuseColor = new BABYLON.Color3(0.3, 0.35, 0.25); // Military green
        
        // Stack of ammo crates
        [[0, 0], [0.5, 0], [0.25, 0.35]].forEach((offset, i) => {
            const crate = BABYLON.MeshBuilder.CreateBox(`ammoCrate_${i}`, {
                width: 0.5,
                height: 0.35,
                depth: 0.7
            }, this.scene);
            crate.position = new BABYLON.Vector3(x + offset[0], 0.175 + offset[1], z);
            crate.material = crateMat;
            new BABYLON.PhysicsAggregate(crate, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        });
    }
    
    createArmorStand(x, z) {
        // Mannequin-style armor stand
        const standMat = new BABYLON.StandardMaterial("armorStandMat", this.scene);
        standMat.diffuseColor = new BABYLON.Color3(0.35, 0.35, 0.38);
        
        // Torso
        const torso = BABYLON.MeshBuilder.CreateBox("armorTorso", {
            width: 0.5,
            height: 0.8,
            depth: 0.3
        }, this.scene);
        torso.position = new BABYLON.Vector3(x, 1.2, z);
        torso.material = standMat;
        
        // Vest (armor piece)
        const vestMat = new BABYLON.StandardMaterial("vestMat", this.scene);
        vestMat.diffuseColor = new BABYLON.Color3(0.2, 0.25, 0.2);
        
        const vest = BABYLON.MeshBuilder.CreateBox("armorVest", {
            width: 0.55,
            height: 0.6,
            depth: 0.35
        }, this.scene);
        vest.position = new BABYLON.Vector3(x, 1.2, z);
        vest.material = vestMat;
        
        vest.metadata = {
            interactable: true,
            type: 'armor',
            name: 'Tactical Vest',
            armorAmount: 25
        };
        
        this.armorPickup = vest;
        
        // Stand base
        const base = BABYLON.MeshBuilder.CreateCylinder("armorBase", {
            diameter: 0.4,
            height: 0.1
        }, this.scene);
        base.position = new BABYLON.Vector3(x, 0.05, z);
        base.material = standMat;
        
        // Stand pole
        const pole = BABYLON.MeshBuilder.CreateCylinder("armorPole", {
            diameter: 0.06,
            height: 0.8
        }, this.scene);
        pole.position = new BABYLON.Vector3(x, 0.5, z);
        pole.material = standMat;
    }
    
    // =====================================================
    // ELEVATOR LOBBY - End of hallway with elevator
    // =====================================================
    createElevatorLobby() {
        const lobbyWidth = 5;
        const lobbyDepth = 4;
        const lobbyHeight = 3.5;
        const lobbyX = 5;
        const lobbyZ = -26; // South end of main hallway
        
        // Floor
        const floor = BABYLON.MeshBuilder.CreateBox("lobbyFloor", {
            width: lobbyWidth,
            height: 0.2,
            depth: lobbyDepth
        }, this.scene);
        floor.position = new BABYLON.Vector3(lobbyX, -0.1, lobbyZ);
        floor.material = this.hallwayFloorMat;
        new BABYLON.PhysicsAggregate(floor, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Ceiling
        const ceiling = BABYLON.MeshBuilder.CreateBox("lobbyCeiling", {
            width: lobbyWidth,
            height: 0.2,
            depth: lobbyDepth
        }, this.scene);
        ceiling.position = new BABYLON.Vector3(lobbyX, lobbyHeight, lobbyZ);
        ceiling.material = this.ceilingMat;
        
        // Side walls
        const leftWall = BABYLON.MeshBuilder.CreateBox("lobbyLeftWall", {
            width: 0.3,
            height: lobbyHeight,
            depth: lobbyDepth
        }, this.scene);
        leftWall.position = new BABYLON.Vector3(lobbyX - lobbyWidth/2, lobbyHeight/2, lobbyZ);
        leftWall.material = this.wallMat;
        new BABYLON.PhysicsAggregate(leftWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        const rightWall = BABYLON.MeshBuilder.CreateBox("lobbyRightWall", {
            width: 0.3,
            height: lobbyHeight,
            depth: lobbyDepth
        }, this.scene);
        rightWall.position = new BABYLON.Vector3(lobbyX + lobbyWidth/2, lobbyHeight/2, lobbyZ);
        rightWall.material = this.wallMat;
        new BABYLON.PhysicsAggregate(rightWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Back wall with elevator doors
        this.createElevatorDoors(lobbyX, lobbyZ - lobbyDepth/2, lobbyHeight);
        
        // Keycard reader next to elevator
        this.createKeycardReader(lobbyX + 1.2, lobbyZ - lobbyDepth/2 + 0.5);
        
        // "ELEVATOR" sign
        this.createElevatorSign(lobbyX, lobbyZ - lobbyDepth/2 + 0.2, lobbyHeight - 0.5);
        
        // Lobby light - strategic location (elevator area)
        const light = new BABYLON.PointLight("lobbyLight", 
            new BABYLON.Vector3(lobbyX, lobbyHeight - 0.3, lobbyZ), this.scene);
        light.intensity = 0.5;
        light.diffuse = new BABYLON.Color3(1, 0.98, 0.95);
        light.range = 15;
    }
    
    createElevatorDoors(x, z, height) {
        const doorWidth = 1;
        const doorHeight = 2.8;
        const doorGap = 0.02;
        
        // Wall around elevator
        const wallAbove = BABYLON.MeshBuilder.CreateBox("elevWallAbove", {
            width: 4,
            height: height - doorHeight,
            depth: 0.3
        }, this.scene);
        wallAbove.position = new BABYLON.Vector3(x, doorHeight + (height - doorHeight)/2, z);
        wallAbove.material = this.elevatorMat;
        new BABYLON.PhysicsAggregate(wallAbove, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        const wallLeft = BABYLON.MeshBuilder.CreateBox("elevWallLeft", {
            width: 1,
            height: doorHeight,
            depth: 0.3
        }, this.scene);
        wallLeft.position = new BABYLON.Vector3(x - doorWidth - 0.5, doorHeight/2, z);
        wallLeft.material = this.elevatorMat;
        new BABYLON.PhysicsAggregate(wallLeft, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        const wallRight = wallLeft.clone("elevWallRight");
        wallRight.position.x = x + doorWidth + 0.5;
        
        // Elevator doors (will animate)
        const doorMat = new BABYLON.StandardMaterial("elevDoorMat", this.scene);
        doorMat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.55);
        doorMat.specularColor = new BABYLON.Color3(0.6, 0.6, 0.6);
        
        this.elevatorDoorLeft = BABYLON.MeshBuilder.CreateBox("elevDoorLeft", {
            width: doorWidth - doorGap,
            height: doorHeight,
            depth: 0.08
        }, this.scene);
        this.elevatorDoorLeft.position = new BABYLON.Vector3(x - doorWidth/2, doorHeight/2, z + 0.15);
        this.elevatorDoorLeft.material = doorMat;
        new BABYLON.PhysicsAggregate(this.elevatorDoorLeft, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        this.elevatorDoorRight = BABYLON.MeshBuilder.CreateBox("elevDoorRight", {
            width: doorWidth - doorGap,
            height: doorHeight,
            depth: 0.08
        }, this.scene);
        this.elevatorDoorRight.position = new BABYLON.Vector3(x + doorWidth/2, doorHeight/2, z + 0.15);
        this.elevatorDoorRight.material = doorMat;
        new BABYLON.PhysicsAggregate(this.elevatorDoorRight, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Elevator interior (dark shaft behind doors)
        const shaftMat = new BABYLON.StandardMaterial("shaftMat", this.scene);
        shaftMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.12);
        
        const shaft = BABYLON.MeshBuilder.CreateBox("elevShaft", {
            width: doorWidth * 2,
            height: doorHeight,
            depth: 2
        }, this.scene);
        shaft.position = new BABYLON.Vector3(x, doorHeight/2, z - 1);
        shaft.material = shaftMat;
        
        this.elevatorLocked = true;
        this.elevatorPosition = new BABYLON.Vector3(x, 0.5, z - 0.5);
    }
    
    createKeycardReader(x, z) {
        // Keycard reader panel
        const readerMat = new BABYLON.StandardMaterial("readerMat", this.scene);
        readerMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.22);
        
        const reader = BABYLON.MeshBuilder.CreateBox("keycardReader", {
            width: 0.15,
            height: 0.25,
            depth: 0.08
        }, this.scene);
        reader.position = new BABYLON.Vector3(x, 1.2, z);
        reader.material = readerMat;
        
        // Status light (red = locked)
        const lightMat = new BABYLON.StandardMaterial("readerLightMat", this.scene);
        lightMat.emissiveColor = new BABYLON.Color3(0.8, 0.1, 0.1);
        
        const statusLight = BABYLON.MeshBuilder.CreateSphere("readerLight", {
            diameter: 0.03
        }, this.scene);
        statusLight.position = new BABYLON.Vector3(x, 1.35, z + 0.04);
        statusLight.material = lightMat;
        
        this.keycardReaderLight = statusLight;
        this.keycardReaderLightMat = lightMat;
        
        reader.metadata = {
            interactable: true,
            type: 'keycard_reader',
            name: 'Keycard Reader',
            requiresKeycard: true
        };
        
        this.keycardReader = reader;
    }
    
    createElevatorSign(x, z, y) {
        const signMat = new BABYLON.StandardMaterial("elevSignMat", this.scene);
        signMat.emissiveColor = new BABYLON.Color3(0.1, 0.4, 0.1);
        
        // "ELEVATOR" text using dynamic texture
        const signTexture = new BABYLON.DynamicTexture("elevSignTex", { width: 256, height: 64 }, this.scene, false);
        const ctx = signTexture.getContext();
        ctx.fillStyle = "#001100";
        ctx.fillRect(0, 0, 256, 64);
        ctx.font = "bold 28px Arial";
        ctx.fillStyle = "#22ff22";
        ctx.textAlign = "center";
        ctx.fillText("ELEVATOR", 128, 42);
        signTexture.update();
        
        signMat.diffuseTexture = signTexture;
        signMat.emissiveTexture = signTexture;
        
        const sign = BABYLON.MeshBuilder.CreatePlane("elevSign", {
            width: 1.5,
            height: 0.4
        }, this.scene);
        sign.position = new BABYLON.Vector3(x, y, z);
        sign.material = signMat;
    }
    
    // =====================================================
    // UNDERGROUND PASSAGE - Secret path from Cell 4 to cave-in
    // =====================================================
    createUndergroundPassage() {
        const passageWidth = 2;
        const passageHeight = 2.5;
        const passageLength = 15;
        const startX = -5; // West of Cell 4 (through secret panel)
        const startZ = -24; // Same Z as Cell 4
        const startY = -3; // Underground
        
        // Stairs down from Cell 4
        this.createSecretStairs(startX + 2, startZ, 0, startY);
        
        // Underground corridor going west then south
        this.createUndergroundCorridor(startX, startZ, startY, passageWidth, passageHeight, passageLength);
        
        // Cave-in at the end (blocks further progress)
        this.createCaveIn(startX - passageLength + 2, startZ - 8, startY);
        
        // Dim lighting with flickering
        const torchPositions = [
            new BABYLON.Vector3(startX, startY + passageHeight - 0.3, startZ),
            new BABYLON.Vector3(startX - 5, startY + passageHeight - 0.3, startZ - 4),
            new BABYLON.Vector3(startX - 10, startY + passageHeight - 0.3, startZ - 6)
        ];
        
        // DISABLED - Too many lights cause WebGL shader overflow
        // torchPositions.forEach((pos, i) => {
        //     const torch = new BABYLON.PointLight(`passageLight_${i}`, pos, this.scene);
        //     torch.intensity = 0.3;
        //     torch.diffuse = new BABYLON.Color3(1, 0.7, 0.4);
        //     torch.range = 6;
        //     
        //     // Flicker
        //     let flickerOffset = Math.random() * 100;
        //     this.scene.registerBeforeRender(() => {
        //         flickerOffset += 0.1;
        //         torch.intensity = 0.3 + Math.sin(flickerOffset * 2) * 0.08 + Math.random() * 0.05;
        //     });
        // });
    }
    
    createSecretStairs(x, z, topY, bottomY) {
        const numSteps = 12;
        const stepHeight = (topY - bottomY) / numSteps;
        const stepDepth = 0.4;
        
        const stairMat = new BABYLON.StandardMaterial("secretStairMat", this.scene);
        stairMat.diffuseTexture = this.createWallTexture("secretStair", new BABYLON.Color3(0.3, 0.28, 0.25));
        
        // Stairs going down (west, into the wall)
        for (let i = 0; i < numSteps; i++) {
            const step = BABYLON.MeshBuilder.CreateBox(`secretStep_${i}`, {
                width: 1.5,
                height: stepHeight,
                depth: stepDepth
            }, this.scene);
            step.position = new BABYLON.Vector3(
                x - i * 0.3,
                topY - stepHeight/2 - i * stepHeight,
                z
            );
            step.material = stairMat;
            step.isVisible = false; // Hidden until panel opens
            
            step.metadata = { secretStair: true, index: i };
        }
        
        this.secretStairSteps = this.scene.meshes.filter(m => m.metadata && m.metadata.secretStair);
        
        // Stair walls (hidden)
        const wallMat = new BABYLON.StandardMaterial("secretStairWallMat", this.scene);
        wallMat.diffuseColor = new BABYLON.Color3(0.25, 0.23, 0.2);
        
        const leftWall = BABYLON.MeshBuilder.CreateBox("secretStairLeftWall", {
            width: numSteps * 0.3 + 1,
            height: 3,
            depth: 0.15
        }, this.scene);
        leftWall.position = new BABYLON.Vector3(x - numSteps * 0.15, bottomY + 1.5, z - 0.85);
        leftWall.material = wallMat;
        leftWall.isVisible = false;
        
        const rightWall = leftWall.clone("secretStairRightWall");
        rightWall.position.z = z + 0.85;
        
        this.secretStairWalls = [leftWall, rightWall];
    }
    
    createUndergroundCorridor(x, z, y, width, height, length) {
        // L-shaped corridor: goes west then curves south
        
        // First section (going west)
        const section1Length = 8;
        const floor1 = BABYLON.MeshBuilder.CreateBox("passageFloor1", {
            width: section1Length,
            height: 0.2,
            depth: width
        }, this.scene);
        floor1.position = new BABYLON.Vector3(x - section1Length/2, y - 0.1, z);
        floor1.material = this.rockMat;
        floor1.isVisible = false;
        new BABYLON.PhysicsAggregate(floor1, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        const ceiling1 = BABYLON.MeshBuilder.CreateBox("passageCeiling1", {
            width: section1Length,
            height: 0.2,
            depth: width
        }, this.scene);
        ceiling1.position = new BABYLON.Vector3(x - section1Length/2, y + height, z);
        ceiling1.material = this.rockMat;
        ceiling1.isVisible = false;
        
        // Walls for section 1
        const northWall1 = BABYLON.MeshBuilder.CreateBox("passageNorthWall1", {
            width: section1Length,
            height: height,
            depth: 0.3
        }, this.scene);
        northWall1.position = new BABYLON.Vector3(x - section1Length/2, y + height/2, z + width/2);
        northWall1.material = this.rockMat;
        northWall1.isVisible = false;
        new BABYLON.PhysicsAggregate(northWall1, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        const southWall1 = BABYLON.MeshBuilder.CreateBox("passageSouthWall1", {
            width: section1Length - 2,
            height: height,
            depth: 0.3
        }, this.scene);
        southWall1.position = new BABYLON.Vector3(x - section1Length/2 + 1, y + height/2, z - width/2);
        southWall1.material = this.rockMat;
        southWall1.isVisible = false;
        new BABYLON.PhysicsAggregate(southWall1, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Second section (going south)
        const section2Length = 10;
        const floor2 = BABYLON.MeshBuilder.CreateBox("passageFloor2", {
            width: width,
            height: 0.2,
            depth: section2Length
        }, this.scene);
        floor2.position = new BABYLON.Vector3(x - section1Length, y - 0.1, z - width/2 - section2Length/2);
        floor2.material = this.rockMat;
        floor2.isVisible = false;
        new BABYLON.PhysicsAggregate(floor2, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        const ceiling2 = BABYLON.MeshBuilder.CreateBox("passageCeiling2", {
            width: width,
            height: 0.2,
            depth: section2Length
        }, this.scene);
        ceiling2.position = new BABYLON.Vector3(x - section1Length, y + height, z - width/2 - section2Length/2);
        ceiling2.material = this.rockMat;
        ceiling2.isVisible = false;
        
        // Store all passage meshes for revealing later
        this.passageMeshes = [floor1, ceiling1, northWall1, southWall1, floor2, ceiling2];
    }
    
    createCaveIn(x, z, y) {
        // Pile of rocks blocking the passage
        const rockConfigs = [
            { pos: [0, 0.4, 0], size: 0.8 },
            { pos: [0.5, 0.3, 0.3], size: 0.6 },
            { pos: [-0.4, 0.25, -0.2], size: 0.5 },
            { pos: [0.2, 0.8, 0.1], size: 0.5 },
            { pos: [-0.3, 0.7, 0.2], size: 0.4 },
            { pos: [0, 1.1, 0], size: 0.45 },
            { pos: [0.4, 0.6, -0.1], size: 0.35 },
            { pos: [-0.2, 0.5, 0.4], size: 0.4 }
        ];
        
        const rockMat = new BABYLON.StandardMaterial("caveInRockMat", this.scene);
        rockMat.diffuseColor = new BABYLON.Color3(0.4, 0.35, 0.3);
        rockMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        
        rockConfigs.forEach((config, i) => {
            const rock = BABYLON.MeshBuilder.CreateSphere(`caveInRock_${i}`, {
                diameter: config.size,
                segments: 6
            }, this.scene);
            rock.position = new BABYLON.Vector3(
                x + config.pos[0],
                y + config.pos[1],
                z + config.pos[2]
            );
            // Slightly irregular shape
            rock.scaling = new BABYLON.Vector3(
                1 + Math.random() * 0.3,
                0.8 + Math.random() * 0.4,
                1 + Math.random() * 0.3
            );
            rock.material = rockMat;
            rock.isVisible = false;
            
            rock.metadata = { caveInRock: true };
        });
        
        this.caveInRocks = this.scene.meshes.filter(m => m.metadata && m.metadata.caveInRock);
        
        // Dust particles near cave-in
        this.caveInPosition = new BABYLON.Vector3(x, y + 1, z);
    }
    
    // =====================================================
    // LOAD CHARACTER MODELS - Jake, Guard, etc.
    // =====================================================
    loadCharacterModels() {
        // Load Jake's model (player)
        // Note: Jake model is loaded by Player.js, not here
        // this.loadJakeModel();
        
        // Load Guard model (enemy with keycard)
        this.loadGuardModel();
    }
    
    loadJakeModel() {
        // Jake's model path
        const modelPath = "assets/models/jake/";
        const modelFile = "base_basic_shaded.glb"; // Smaller file
        
        BABYLON.SceneLoader.ImportMeshAsync("", modelPath, modelFile, this.scene)
            .then((result) => {
                const jakeMesh = result.meshes[0];
                jakeMesh.name = "jakeModel";
                
                // Scale and position
                jakeMesh.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
                jakeMesh.position = this.playerSpawn.clone();
                jakeMesh.rotation.y = Math.PI;
                
                // Store for animation
                this.jakeModel = jakeMesh;
                this.jakeAnimations = result.animationGroups;
                
                // Play idle animation if available
                if (this.jakeAnimations && this.jakeAnimations.length > 0) {
                    console.log("Jake animations loaded:", this.jakeAnimations.map(a => a.name));
                    // Find and play idle animation
                    const idleAnim = this.jakeAnimations.find(a => 
                        a.name.toLowerCase().includes('idle'));
                    if (idleAnim) {
                        idleAnim.start(true);
                    } else {
                        this.jakeAnimations[0].start(true);
                    }
                }
                
                console.log("Jake model loaded successfully");
            })
            .catch((error) => {
                console.warn("Could not load Jake model:", error);
            });
    }
    
    loadGuardModel() {
        // Guard's model path (FBX - need to check if Babylon can load)
        const modelPath = "assets/models/enemies/guard/";
        
        // Try GLB first, fall back to creating a placeholder
        // Note: Babylon.js needs FBX loader plugin for FBX files
        // For now, create a placeholder guard
        
        this.createGuardPlaceholder();
    }
    
    createGuardPlaceholder() {
        // Placeholder guard model until proper model is loaded
        const guardMat = new BABYLON.StandardMaterial("guardPlaceholderMat", this.scene);
        guardMat.diffuseColor = new BABYLON.Color3(0.3, 0.35, 0.3);
        
        // Body
        const body = BABYLON.MeshBuilder.CreateCapsule("guardBody", {
            height: 1.8,
            radius: 0.3
        }, this.scene);
        body.position = this.guardPosition.clone();
        body.position.y = 0.9;
        body.material = guardMat;
        
        // Head
        const headMat = new BABYLON.StandardMaterial("guardHeadMat", this.scene);
        headMat.diffuseColor = new BABYLON.Color3(0.8, 0.7, 0.6);
        
        const head = BABYLON.MeshBuilder.CreateSphere("guardHead", {
            diameter: 0.35
        }, this.scene);
        head.position = this.guardPosition.clone();
        head.position.y = 1.9;
        head.material = headMat;
        
        // Helmet
        const helmetMat = new BABYLON.StandardMaterial("helmetMat", this.scene);
        helmetMat.diffuseColor = new BABYLON.Color3(0.2, 0.22, 0.2);
        
        const helmet = BABYLON.MeshBuilder.CreateSphere("guardHelmet", {
            diameter: 0.38,
            slice: 0.5
        }, this.scene);
        helmet.position = this.guardPosition.clone();
        helmet.position.y = 2;
        helmet.material = helmetMat;
        
        this.guardMesh = body;
        this.guardMesh.metadata = {
            interactable: true,
            type: 'enemy',
            name: 'Security Guard',
            health: 100,
            hasKeycard: true
        };
        
        console.log("Guard placeholder created at", this.guardPosition);
    }
    
    showClickPrompt() {
        let prompt = document.getElementById('clickPrompt');
        if (!prompt) {
            prompt = document.createElement('div');
            prompt.id = 'clickPrompt';
            prompt.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 30px 50px;
                border-radius: 10px;
                font-family: Arial, sans-serif;
                font-size: 24px;
                text-align: center;
                z-index: 200;
                border: 2px solid #4a9eff;
                cursor: pointer;
            `;
            prompt.innerHTML = `
                <div style="margin-bottom: 15px;">🔊 Click to Start</div>
                <div style="font-size: 14px; color: #aaa;">Audio enabled experience</div>
            `;
            document.body.appendChild(prompt);
            
            // Hide on click
            prompt.addEventListener('click', () => {
                prompt.style.display = 'none';
            });
        }
    }
    
    createBedWithRestraints() {
        // Hospital-style bed frame - against back wall
        const bedFrame = BABYLON.MeshBuilder.CreateBox("bed", {
            width: 2.2,
            height: 0.4,
            depth: 1.2
        }, this.scene);
        bedFrame.position = new BABYLON.Vector3(-2, 0.4, -2.5);
        
        const bedMat = new BABYLON.StandardMaterial("bedMat", this.scene);
        bedMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.35);
        bedMat.specularColor = new BABYLON.Color3(0.4, 0.4, 0.4);
        bedFrame.material = bedMat;
        
        // Mattress
        const mattress = BABYLON.MeshBuilder.CreateBox("mattress", {
            width: 2,
            height: 0.15,
            depth: 1
        }, this.scene);
        mattress.position = new BABYLON.Vector3(-2, 0.65, -2.5);
        
        const mattressMat = new BABYLON.StandardMaterial("mattressMat", this.scene);
        mattressMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.25);
        mattress.material = mattressMat;
        
        // Pillow
        const pillow = BABYLON.MeshBuilder.CreateBox("pillow", {
            width: 0.5,
            height: 0.1,
            depth: 0.8
        }, this.scene);
        pillow.position = new BABYLON.Vector3(-2.8, 0.75, -2.5);
        
        const pillowMat = new BABYLON.StandardMaterial("pillowMat", this.scene);
        pillowMat.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.55);
        pillow.material = pillowMat;
        
        // Create heavy-duty metal restraint bands that will BEND/DEFORM when broken
        const restraintMat = new BABYLON.PBRMaterial("restraintMat", this.scene);
        restraintMat.albedoColor = new BABYLON.Color3(0.83, 0.83, 0.85); // Bright silver
        restraintMat.metallic = 1.0;
        restraintMat.roughness = 0.22; // Slightly polished
        restraintMat.microSurface = 0.9;
        restraintMat.reflectivityColor = new BABYLON.Color3(0.95, 0.95, 0.95);
        
        // Create each restraint as a SOLID THICK BAND that bends when broken (rounded capsule segments)
        const createBendableRestraint = (name, position, isWrist = true) => {
            const restraintContainer = new BABYLON.TransformNode(name + "_container", this.scene);
            restraintContainer.position = position.clone();
            
            // THICK solid band dimensions - tight around limbs!
            const bandRadius = isWrist ? 0.08 : 0.10; // Tight around wrist/ankle
            const bandThickness = 0.04; // Thick solid metal (visual radius)
            const bandHeight = isWrist ? 0.06 : 0.08; // visual band height
            const numSegments = 12; // More segments = smoother appearance
            
            const segments = [];
            const pivots = [];
            
            for (let i = 0; i < numSegments; i++) {
                const angle = (i / numSegments) * Math.PI * 2;
                
                // Create pivot for this segment (allows bending)
                const pivot = new BABYLON.TransformNode(name + `_pivot_${i}`, this.scene);
                pivot.parent = restraintContainer;
                pivot.position = new BABYLON.Vector3(0, 0, 0);
                pivot.rotation.y = angle;
                pivots.push(pivot);
                
                // Create rounded segment using capsule for smooth metal look
                const segmentArcLength = (Math.PI * 2) / numSegments;
                const segLen = Math.max(0.02, bandRadius * segmentArcLength * 1.05);
                const segment = BABYLON.MeshBuilder.CreateCapsule(name + `_seg_${i}`, {
                    height: segLen,
                    radius: bandThickness * 0.5
                }, this.scene);
                // Align capsule so its length points outward along X
                segment.rotation.z = Math.PI / 2;

                segment.parent = pivot;
                // Position at outer edge of band
                segment.position = new BABYLON.Vector3(bandRadius, 0, 0);
                segment.material = restraintMat;
                segments.push(segment);

                // Add to shadow caster if present for better lighting
                if (this.game && this.game.shadowGenerator) {
                    try { this.game.shadowGenerator.addShadowCaster(segment); } catch (e) { /* ignore */ }
                }

                // Improve visuals: smooth normals and receive shadows if available
                segment.alwaysSelectAsActiveMesh = true;
            }
            
            // Add mounting brackets to bed rails (makes it look secured)
            const bracketMat = new BABYLON.PBRMaterial(name + "_bracketMat", this.scene);
            bracketMat.albedoColor = new BABYLON.Color3(0.3, 0.3, 0.32);
            bracketMat.metallic = 1.0;
            bracketMat.roughness = 0.3;
            bracketMat.microSurface = 0.8;
            
            // Side mounting brackets
            [-1, 1].forEach((side, idx) => {
                const bracket = BABYLON.MeshBuilder.CreateBox(name + `_bracket_${idx}`, {
                    width: 0.03,
                    height: bandHeight + 0.02,
                    depth: 0.15
                }, this.scene);
                bracket.position = new BABYLON.Vector3(0, 0, side * (bandRadius + 0.08));
                bracket.parent = restraintContainer; // Will be anchored when container is parented to bedFrame
                bracket.material = bracketMat;

                // Make brackets cast shadows too
                if (this.game && this.game.shadowGenerator) {
                    try { this.game.shadowGenerator.addShadowCaster(bracket); } catch (e) { /* ignore */ }
                }
            });
            
            // Anchor restraint container to the rigid bed frame so it moves with the bed
            if (typeof bedFrame !== 'undefined' && bedFrame) {
                restraintContainer.parent = bedFrame;
            }
            
            // Store metadata for deformation
            restraintContainer.metadata = {
                segments: segments,
                pivots: pivots,
                deformAmount: 0,
                isWrist: isWrist
            };
            
            console.log(`🔩 Created restraint ${name} anchoredToBed=${!!bedFrame} segments=${segments.length}`);
            return restraintContainer;
        };
        
        // ═══════════════════════════════════════════════════════════════════
        // RESTRAINTS TIGHT AROUND JAKE'S LIMBS
        // Jake center at (-2, 0.84, -2.5), lying along X axis
        // Head toward X=-2.8, feet toward X=-1.2
        // Body width: left Z=-2.7, right Z=-2.3
        // Restraint Y = 1.37 to match Jake's visual mesh height
        // ═══════════════════════════════════════════════════════════════════
        const restraintY = 1.37; // Match Jake's visual mesh Y position on bed
        
        // LEFT WRIST - over left arm near shoulder
        const leftWrist = createBendableRestraint("leftWristRestraint", 
            new BABYLON.Vector3(-2.45, restraintY, -2.72), true);
        leftWrist.rotation.x = Math.PI / 2; // Band wraps around arm
        leftWrist.metadata.limb = 'leftWrist';
        leftWrist.metadata.attached = false;
        this.restraints.push(leftWrist);
        
        // RIGHT WRIST - over right arm near shoulder
        const rightWrist = createBendableRestraint("rightWristRestraint",
            new BABYLON.Vector3(-2.45, restraintY, -2.28), true);
        rightWrist.rotation.x = Math.PI / 2;
        rightWrist.metadata.limb = 'rightWrist';
        rightWrist.metadata.attached = false;
        this.restraints.push(rightWrist);
        
        // LEFT ANKLE - over left leg near feet
        const leftAnkle = createBendableRestraint("leftAnkleRestraint",
            new BABYLON.Vector3(-1.50, restraintY, -2.65), false);
        leftAnkle.rotation.x = Math.PI / 2;
        leftAnkle.metadata.limb = 'leftAnkle';
        leftAnkle.metadata.attached = false;
        this.restraints.push(leftAnkle);
        
        // RIGHT ANKLE - over right leg near feet  
        const rightAnkle = createBendableRestraint("rightAnkleRestraint",
            new BABYLON.Vector3(-1.50, restraintY, -2.35), false);
        rightAnkle.rotation.x = Math.PI / 2;
        rightAnkle.metadata.limb = 'rightAnkle';
        rightAnkle.metadata.attached = false;
        this.restraints.push(rightAnkle);
        
        // Attempt to attach restraints to Jake when his model is loaded and he's restrained
        const tryAttachRestraints = () => {
            const player = this.game?.player;
            if (player && player.modelLoaded && player.isRestrained) {
                this.attachRestraintsToPlayer(player);
                this.scene.onBeforeRenderObservable.remove(tryAttachRestraints);
            }
        };
        this.scene.onBeforeRenderObservable.add(tryAttachRestraints);
        
        // Bed legs
        const legMat = new BABYLON.StandardMaterial("legMat", this.scene);
        legMat.diffuseColor = new BABYLON.Color3(0.25, 0.25, 0.28);
        
        const legPositions = [
            new BABYLON.Vector3(-2.9, 0.15, -2.9),
            new BABYLON.Vector3(-2.9, 0.15, -2.1),
            new BABYLON.Vector3(-1.1, 0.15, -2.9),
            new BABYLON.Vector3(-1.1, 0.15, -2.1)
        ];
        
        legPositions.forEach((pos, i) => {
            const leg = BABYLON.MeshBuilder.CreateCylinder(`bedLeg${i}`, {
                height: 0.3,
                diameter: 0.08
            }, this.scene);
            leg.position = pos;
            leg.material = legMat;
        });
    }

    /**
     * Attach restraints to player skeleton bones and update them each frame
     * Restraints will follow wrist/ankle bone world positions until they break
     */
    attachRestraintsToPlayer(player) {
        if (!player || !player.skeleton) {
            console.warn('attachRestraintsToPlayer: Player or skeleton not ready');
            return;
        }

        const bones = player.skeleton.bones || [];
        if (bones.length === 0) {
            console.warn('attachRestraintsToPlayer: No bones found on skeleton');
            return;
        }

        // Helper: find best bone by substring matching, with distance fallback
        const findBone = (side, partCandidates, restraintWorldPos = null) => {
            side = side.toLowerCase();
            // First try side+part matches (e.g., left_hand / right_ankle)
            for (const b of bones) {
                const n = (b.name || '').toLowerCase();
                for (const cand of partCandidates) {
                    if (n.includes(cand) && n.includes(side)) return b;
                }
            }

            // Then try part-only matches (no explicit side in name)
            for (const b of bones) {
                const n = (b.name || '').toLowerCase();
                for (const cand of partCandidates) {
                    if (n.includes(cand)) return b;
                }
            }

            // Distance-based fallback if we have an estimated world position for where restraint should be
            if (restraintWorldPos) {
                let best = null;
                let bestDist = Infinity;
                for (const b of bones) {
                    try {
                        const mat = b.getAbsoluteTransform();
                        const pos = BABYLON.Vector3.TransformCoordinates(BABYLON.Vector3.Zero(), mat);
                        const d = BABYLON.Vector3.DistanceSquared(pos, restraintWorldPos);
                        if (d < bestDist) { bestDist = d; best = b; }
                    } catch (e) {
                        // ignore bones that fail to provide a transform
                    }
                }
                if (best) {
                    console.warn(`findBone: using closest bone '${best.name}' (dist^2=${bestDist.toFixed(3)}) as fallback`);
                    return best;
                }
            }

            return null;
        };

        const candidateParts = {
            wrist: ['hand', 'wrist', 'forearm', 'arm'],
            ankle: ['foot', 'ankle', 'leg', 'thigh']
        };

        this.restraints.forEach(restraint => {
            const limb = restraint.metadata?.limb || '';
            let side = limb.includes('left') ? 'left' : limb.includes('right') ? 'right' : '';
            let part = limb.toLowerCase().includes('wrist') ? 'wrist' : limb.toLowerCase().includes('ankle') ? 'ankle' : null;

            if (!part) return;

            // Use the current restraint world position as a hint for distance-based fallback
            const restraintWorldPos = (typeof restraint.getAbsolutePosition === 'function') ? restraint.getAbsolutePosition() : restraint.position.clone();
            const bone = findBone(side, candidateParts[part], restraintWorldPos);
            if (!bone) {
                console.warn(`Could not find matching bone for restraint ${restraint.name} (no name match or fallback)`);
                return;
            }

            // Store bone reference and compute initial offset
            restraint.metadata.attachedBoneName = bone.name;
            restraint.metadata.attachedBone = bone;

            // Compute bone world position
            const boneMat = bone.getAbsoluteTransform();
            const boneWorldPos = BABYLON.Vector3.TransformCoordinates(BABYLON.Vector3.Zero(), boneMat);

            // Save offset between current restraint world position and bone world pos (world-space)
            const restraintWorldPos2 = (typeof restraint.getAbsolutePosition === 'function') ? restraint.getAbsolutePosition() : restraint.position.clone();
            restraint.metadata.attachOffset = restraintWorldPos2.subtract(boneWorldPos);
            restraint.metadata.attached = true;

            console.log(`Attached ${restraint.name} -> bone ${bone.name}`);
        });

        // Remove any existing observer
        if (this._restraintAttachObserver) {
            this.scene.onBeforeRenderObservable.remove(this._restraintAttachObserver);
            this._restraintAttachObserver = null;
        }

        // Add update observer that runs while restraints are attached and not broken
        this._restraintAttachObserver = () => {
            if (!player || !player.skeleton) return;
            if (this.restraintsBroken) return;

            this.restraints.forEach(restraint => {
                if (!restraint.metadata?.attached) return;
                const bone = restraint.metadata.attachedBone;
                if (!bone) return;

                const boneMat = bone.getAbsoluteTransform();
                const boneWorldPos = BABYLON.Vector3.TransformCoordinates(BABYLON.Vector3.Zero(), boneMat);

                const offset = restraint.metadata.attachOffset || BABYLON.Vector3.Zero();
                const desiredWorld = boneWorldPos.add(offset);
                // Try a direct absolute set if available, otherwise convert to parent-local
                if (typeof restraint.setAbsolutePosition === 'function') {
                    restraint.setAbsolutePosition(desiredWorld);
                } else if (restraint.parent) {
                    // Transform world to local space of parent
                    const inv = new BABYLON.Matrix();
                    restraint.parent.getWorldMatrix().invertToRef(inv);
                    const localPos = BABYLON.Vector3.TransformCoordinates(desiredWorld, inv);
                    restraint.position.copyFrom(localPos);
                } else {
                    restraint.position.copyFrom(desiredWorld);
                }

                // Keep band oriented to player's facing direction
                if (player.visualMesh) {
                    restraint.rotation.y = player.visualMesh.rotation.y;
                }
            });
        };

        this.scene.onBeforeRenderObservable.add(this._restraintAttachObserver);
    }

    createComputerTerminal() {
        // Wall-mounted terminal - flat screen on back wall with console below
        const terminalX = 1.5;   // Centered more, on back wall
        const terminalZ = -3.3;  // Flat against back wall
        
        // Wall mount panel (dark metal backing) - flush with wall
        const wallMount = BABYLON.MeshBuilder.CreateBox("terminalMount", {
            width: 2,
            height: 1.8,
            depth: 0.08
        }, this.scene);
        wallMount.position = new BABYLON.Vector3(terminalX, 1.6, terminalZ);
        
        const mountMat = new BABYLON.StandardMaterial("mountMat", this.scene);
        mountMat.diffuseColor = new BABYLON.Color3(0.12, 0.12, 0.15);
        mountMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        wallMount.material = mountMat;
        
        // Large monitor frame - flat on wall
        const monitorFrame = BABYLON.MeshBuilder.CreateBox("monitorFrame", {
            width: 1.8,
            height: 1.2,
            depth: 0.1
        }, this.scene);
        monitorFrame.position = new BABYLON.Vector3(terminalX, 1.8, terminalZ + 0.06);
        
        const frameMat = new BABYLON.StandardMaterial("frameMat", this.scene);
        frameMat.diffuseColor = new BABYLON.Color3(0.06, 0.06, 0.08);
        frameMat.specularColor = new BABYLON.Color3(0.4, 0.4, 0.4);
        monitorFrame.material = frameMat;
        
        // LARGE SCREEN - facing INTO the room (toward player)
        const screen = BABYLON.MeshBuilder.CreatePlane("screen", {
            width: 1.6,
            height: 1.0,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, this.scene);
        screen.position = new BABYLON.Vector3(terminalX, 1.8, terminalZ + 0.12);
        // Rotate 180° on Y to face the player (plane faces +Z by default, player is at -Z)
        screen.rotation.y = Math.PI;
        
        // Create dynamic texture for screen content - high res for big screen
        const screenTexture = new BABYLON.DynamicTexture("screenTexture", {
            width: 1024,
            height: 640
        }, this.scene);
        
        const screenMat = new BABYLON.StandardMaterial("screenMat", this.scene);
        screenMat.diffuseTexture = screenTexture;
        screenMat.emissiveTexture = screenTexture;
        screenMat.emissiveColor = new BABYLON.Color3(0.6, 0.9, 0.6);
        screenMat.backFaceCulling = false;
        screen.material = screenMat;
        
        // Draw screen content
        this.drawScreenContent(screenTexture);
        
        // Make screen interactable
        screen.metadata = {
            interactable: true,
            type: 'computer',
            name: 'Terminal'
        };
        
        this.computerScreen = screen;
        this.screenTexture = screenTexture;
        this.terminalState = 'idle';  // For hacking/search functions later
        
        // Terminal console (shelf with keyboard) - below screen
        const termConsole = BABYLON.MeshBuilder.CreateBox("terminalConsole", {
            width: 1.4,
            height: 0.12,
            depth: 0.5
        }, this.scene);
        termConsole.position = new BABYLON.Vector3(terminalX, 0.95, terminalZ + 0.35);
        termConsole.rotation.x = -0.15;  // Slight angle toward user
        
        const consoleMat = new BABYLON.StandardMaterial("consoleMat", this.scene);
        consoleMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.22);
        consoleMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        termConsole.material = consoleMat;
        
        // Terminal keyboard
        const keyboard = BABYLON.MeshBuilder.CreateBox("keyboard", {
            width: 0.9,
            height: 0.04,
            depth: 0.3
        }, this.scene);
        keyboard.position = new BABYLON.Vector3(terminalX, 1.02, terminalZ + 0.4);
        keyboard.rotation.x = -0.15;
        
        const kbMat = new BABYLON.StandardMaterial("kbMat", this.scene);
        kbMat.diffuseColor = new BABYLON.Color3(0.12, 0.12, 0.15);
        kbMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        keyboard.material = kbMat;
        
        // Keyboard keys detail (small bumps)
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 12; col++) {
                const key = BABYLON.MeshBuilder.CreateBox("key_" + row + "_" + col, {
                    width: 0.055,
                    height: 0.015,
                    depth: 0.055
                }, this.scene);
                key.position = new BABYLON.Vector3(
                    terminalX - 0.36 + col * 0.065,
                    1.04,
                    terminalZ + 0.28 + row * 0.065
                );
                key.rotation.x = -0.15;
                
                const keyMat = new BABYLON.StandardMaterial("keyMat", this.scene);
                keyMat.diffuseColor = new BABYLON.Color3(0.18, 0.18, 0.2);
                key.material = keyMat;
            }
        }
        
        // Status lights on console
        const lightColors = [
            new BABYLON.Color3(0, 1, 0),    // Green - power
            new BABYLON.Color3(0, 0.8, 1),  // Cyan - network
            new BABYLON.Color3(1, 0.5, 0),  // Orange - warning
        ];
        
        lightColors.forEach((color, i) => {
            const light = BABYLON.MeshBuilder.CreateSphere("statusLight" + i, {
                diameter: 0.04
            }, this.scene);
            light.position = new BABYLON.Vector3(terminalX + 0.5, 1.02, terminalZ + 0.3 + i * 0.08);
            
            const lightMat = new BABYLON.StandardMaterial("lightMat" + i, this.scene);
            lightMat.diffuseColor = color;
            lightMat.emissiveColor = color.scale(0.5);
            light.material = lightMat;
        });
        
        // Console support brackets
        const bracketMat = new BABYLON.StandardMaterial("bracketMat", this.scene);
        bracketMat.diffuseColor = new BABYLON.Color3(0.25, 0.25, 0.28);
        
        [-0.5, 0.5].forEach(offset => {
            const bracket = BABYLON.MeshBuilder.CreateBox("bracket", {
                width: 0.08,
                height: 0.4,
                depth: 0.08
            }, this.scene);
            bracket.position = new BABYLON.Vector3(terminalX + offset, 0.75, terminalZ + 0.3);
            bracket.material = bracketMat;
        });
        
        // Add screen flicker effect
        this.scene.onBeforeRenderObservable.add(() => {
            if (Math.random() < 0.003) {
                screenMat.emissiveColor = new BABYLON.Color3(0.15, 0.3, 0.15);
                setTimeout(() => {
                    screenMat.emissiveColor = new BABYLON.Color3(0.6, 0.9, 0.6);
                }, 50);
            }
        });
    }
    
    drawScreenContent(texture) {
        const ctx = texture.getContext();
        const width = 1024;
        const height = 640;
        
        // Dark background
        ctx.fillStyle = '#050f05';
        ctx.fillRect(0, 0, width, height);
        
        // Scanline effect
        ctx.fillStyle = 'rgba(0, 40, 0, 0.15)';
        for (let i = 0; i < height; i += 3) {
            ctx.fillRect(0, i, width, 1);
        }
        
        // Border glow effect
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(0, 255, 0, 0.1)');
        gradient.addColorStop(0.5, 'rgba(0, 255, 0, 0)');
        gradient.addColorStop(1, 'rgba(0, 255, 0, 0.1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 20, height);
        ctx.fillRect(width - 20, 0, 20, height);
        
        // Green terminal text - Header
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 36px monospace';
        ctx.fillText('═══ NEXAGEN LABS - CLASSIFIED ═══', 180, 55);
        
        ctx.font = '24px monospace';
        ctx.fillStyle = '#00dd00';
        
        // Subject info
        ctx.fillText('SUBJECT: Jake Morrison', 50, 110);
        ctx.fillText('STATUS: ENHANCED - TIER 5', 50, 145);
        ctx.fillStyle = '#006600';
        ctx.fillText('─'.repeat(45), 50, 175);
        
        // Enhancement details
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 24px monospace';
        ctx.fillText('ENHANCEMENT REPORT:', 50, 215);
        ctx.font = '22px monospace';
        ctx.fillStyle = '#00dd00';
        ctx.fillText('> Muscle density: +400%', 70, 255);
        ctx.fillText('> Bone reinforcement: COMPLETE', 70, 290);
        ctx.fillText('> Neural response: ACCELERATED', 70, 325);
        ctx.fillText('> Side effects: AGGRESSION', 70, 360);
        
        // Warning
        ctx.fillStyle = '#ff6600';
        ctx.font = 'bold 26px monospace';
        ctx.fillText('⚠ WARNING: Subject unstable', 70, 410);
        
        // Sarah info - highlighted
        ctx.fillStyle = '#006600';
        ctx.font = '24px monospace';
        ctx.fillText('─'.repeat(45), 50, 450);
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 26px monospace';
        ctx.fillText('RELATED SUBJECTS:', 50, 490);
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 28px monospace';
        ctx.fillText('► Sarah Mitchell - FLOOR 7 - LAB B12', 70, 535);
        ctx.fillText('► Dr. Chen       - FLOOR 7 - LAB B15', 70, 575);
        
        // Command prompt at bottom
        ctx.fillStyle = '#00ff00';
        ctx.font = '20px monospace';
        ctx.fillText('> ENTER CODE TO UNLOCK DOOR_', 50, 620);
        
        texture.update();
    }
    
    startIntroSequence() {
        console.log('Starting intro sequence...');
        
        // Hide click prompt (already done by GameEngine, but just in case)
        const prompt = document.getElementById('clickPrompt');
        if (prompt) prompt.style.display = 'none';
        
        // Player is already on bed (GameEngine positioned him in setupInitialIntroPosition)
        // Just make sure controls are disabled
        if (this.game.player) {
            this.game.player.controlsEnabled = false;
        }
        
        // Camera is already at ceiling corner (GameEngine positioned it)
        // Just ensure introCameraMode is set
        this.introCameraMode = 'ceiling';
        this.introSkipped = false;
        
        // Small delay then start
        setTimeout(() => {
            this.playIntroStep(0);
        }, 800);
    }
    
    skipIntro() {
        // Skip/pause the intro sequence completely
        console.log('⏭️ INTRO SKIPPED - Editor mode ready');
        this.introSkipped = true;
        
        // Cancel any speech synthesis
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        
        // Hide subtitle
        this.hideSubtitle();
        
        // Stop all intro-related animations
        const player = this.game.player;
        if (player && player.visualMesh) {
            this.scene.stopAnimation(player.visualMesh);
        }
        
        // Stop restraint animations
        if (this.restraints) {
            this.restraints.forEach(r => {
                if (r.metadata && r.metadata.segments) {
                    r.metadata.segments.forEach(seg => {
                        this.scene.stopAnimation(seg);
                    });
                }
            });
        }
        
        // Keep Jake on bed but allow editor manipulation
        // Controls stay disabled so he doesn't walk away
        this.introCameraMode = null;
        
        // Show notification
        const msg = document.createElement('div');
        msg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,100,0,0.9);color:#0f0;padding:20px 40px;border-radius:10px;font-size:20px;z-index:9999;font-family:monospace;border:2px solid #0f0;';
        msg.textContent = '⏭️ INTRO PAUSED - Press F9 for Editor';
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 3000);
    }
    
    setupCeilingCamera() {
        const camera = this.game.camera;
        
        // CORNER SURVEILLANCE CAMERA - looking down at an angle at Jake on the bed
        // Position: upper rear left corner of the cell
        camera.position = new BABYLON.Vector3(-3.5, 4, -3.2);  // Rear left corner  
        camera.setTarget(new BABYLON.Vector3(-1, 0.7, -1.5)); // Look at Jake/center of cell
        
        this.introCameraMode = 'ceiling';
        
        console.log('Ceiling camera set - surveillance angle from rear left corner');
    }
    
    playIntroStep(step) {
        // Check if intro was skipped
        if (this.introSkipped) {
            console.log('Intro skipped - stopping playback');
            return;
        }
        
        const introDialogue = [
            // CEILING CAMERA - watching Jake wake up
            { delay: 1500, text: null, action: 'wakeUp' }, // Just camera movement at first
            { delay: 2000, text: "Ugh... where am I?", action: null },
            { delay: 2500, text: "My head... it's pounding.", action: null },
            { delay: 3000, text: "Wait... I can't move. What the hell?", action: 'struggle' },
            
            // Now switch to FIRST PERSON - Jake's POV
            { delay: 2000, text: null, action: 'switchToFirstPerson' },
            { delay: 1500, text: "Restraints. Heavy metal bands.", action: null },
            { delay: 2500, text: "I feel... different. Stronger, somehow.", action: null },
            { delay: 3000, text: "Like I could bend steel.", action: 'promptBreakFree' },
            // Player holds E to break free - sequence continues from completeBreakFree()
        ];
        
        if (step >= introDialogue.length) {
            return; // Waiting for player input
        }
        
        const current = introDialogue[step];
        
        // Perform action
        if (current.action) {
            this.performIntroAction(current.action);
        }
        
        // Speak line (if any)
        if (current.text) {
            this.showSubtitle('Jake', current.text);
            this.speak(current.text, () => {
                setTimeout(() => {
                    this.playIntroStep(step + 1);
                }, 500);
            });
        } else {
            // No text, just delay then continue
            setTimeout(() => {
                this.playIntroStep(step + 1);
            }, current.delay);
        }
    }
    
    performIntroAction(action) {
        const player = this.game.player;
        
        switch (action) {
            case 'wakeUp':
                // Camera slowly zooms closer to Jake on the bed
                this.animateCeilingZoom();
                break;
                
            case 'struggle':
                // ⚠️ ONLY shake restraints, NOT Jake's body while he's restrained on bed
                if (player.isRestrained) {
                    // Just shake the restraint bands, don't animate Jake
                    this.restraints.forEach(r => {
                        if (r.metadata && r.metadata.segments) {
                            r.metadata.segments.forEach(seg => {
                                const shakeAnim = new BABYLON.Animation(
                                    "shake", "rotation.z", 60,
                                    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                                    BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
                                );
                                shakeAnim.setKeys([
                                    { frame: 0, value: seg.rotation.z },
                                    { frame: 5, value: seg.rotation.z + 0.12 },
                                    { frame: 10, value: seg.rotation.z - 0.12 },
                                    { frame: 15, value: seg.rotation.z + 0.08 },
                                    { frame: 20, value: seg.rotation.z }
                                ]);
                                seg.animations = [shakeAnim];
                                this.scene.beginAnimation(seg, 0, 20, true);
                            });
                        }
                    });
                    
                    // Play struggle animation on Jake's model (no position/rotation changes)
                    if (player && player.animController) {
                        const struggleAnims = ['struggle', 'strain', 'fight', 'punch', 'idle'];
                        for (const animName of struggleAnims) {
                            if (player.animController.hasAnimation(animName)) {
                                player.animController.play(animName, true, 0.8);
                                break;
                            }
                        }
                    }
                    return;  // Stop here - don't do the rest
                }
                
                // If NOT restrained, full struggle animation with body shake
                this.restraints.forEach(r => {
                    if (r.metadata && r.metadata.segments) {
                        // Shake individual segments
                        r.metadata.segments.forEach(seg => {
                            const shakeAnim = new BABYLON.Animation(
                                "shake", "rotation.z", 60,
                                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
                            );
                            shakeAnim.setKeys([
                                { frame: 0, value: seg.rotation.z },
                                { frame: 5, value: seg.rotation.z + 0.12 },
                                { frame: 10, value: seg.rotation.z - 0.12 },
                                { frame: 15, value: seg.rotation.z + 0.08 },
                                { frame: 20, value: seg.rotation.z }
                            ]);
                            seg.animations = [shakeAnim];
                            this.scene.beginAnimation(seg, 0, 20, true);
                        });
                    }
                });
                
                // Shake Jake's body AND animate limbs struggling!
                if (player && player.visualMesh) {
                    // Body shake
                    const bodyShake = new BABYLON.Animation(
                        "bodyShake", "rotation.z", 60,
                        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
                    );
                    bodyShake.setKeys([
                        { frame: 0, value: 0 },
                        { frame: 8, value: 0.08 },
                        { frame: 16, value: -0.08 },
                        { frame: 24, value: 0.05 },
                        { frame: 32, value: 0 }
                    ]);
                    player.visualMesh.animations = [bodyShake];
                    this.scene.beginAnimation(player.visualMesh, 0, 32, true);
                    
                    // Try to play struggle animation if model has one
                    if (player.animController) {
                        // Look for struggle/strain animation, fallback to others
                        const struggleAnims = ['struggle', 'strain', 'fight', 'punch', 'idle'];
                        for (const animName of struggleAnims) {
                            if (player.animController.hasAnimation(animName)) {
                                player.animController.play(animName, true, 0.8);
                                break;
                            }
                        }
                    }
                }
                break;
                
            case 'switchToFirstPerson':
                // Stop struggle animations on restraints
                this.restraints.forEach(r => {
                    if (r.metadata && r.metadata.segments) {
                        r.metadata.segments.forEach(seg => {
                            this.scene.stopAnimation(seg);
                        });
                    }
                });
                
                // Stop animations on Jake ONLY if he's free
                // If restrained, leave him locked in bed position
                if (!player.isRestrained && player && player.visualMesh) {
                    this.scene.stopAnimation(player.visualMesh);
                    player.visualMesh.rotation.z = 0;
                }
                
                // Switch to first-person view
                this.switchToFirstPerson();
                break;
                
            case 'promptBreakFree':
                // Show the hold E prompt
                this.showBreakFreePrompt();
                break;
                
            case 'breakFree':
                // Deform and break restraints
                this.breakRestraints();
                break;
                
            case 'sitUp':
                // SAFETY: Do NOT animate position/rotation while still restrained on bed
                // Only proceed if restraints are actually broken. Allow sit-up to run
                // when restraints have been broken even if `player.isRestrained` flag
                // hasn't yet been cleared (enableControls will clear it shortly).
                if (player.isRestrained && !this.restraintsBroken) {
                    console.log('⚠️ sitUp skipped - player still restrained on bed');
                    return;
                }
                
                // Animate Jake sitting up, then standing
                if (player && player.visualMesh) {
                    player.visualMesh.isVisible = true; // Show Jake again
                    
                    // Reset visualMesh Y position (was offset for lying down)
                    player.visualMesh.position.y = 0;
                    
                    // Restore the rootMesh offset for standing
                    const rootMesh = player.visualMesh.getChildren()[0];
                    if (rootMesh) {
                        rootMesh.position = new BABYLON.Vector3(0, -0.9, 0);
                    }
                    
                    // Sit up animation - from lying flat to standing
                    // Starting rotation: (-90°, 0, -90°) = lying on side facing bars
                    const sitUpAnim = new BABYLON.Animation(
                        "sitUp", "rotation.x", 30,
                        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
                    );
                    sitUpAnim.setKeys([
                        { frame: 0, value: -Math.PI / 2 },  // Lying flat
                        { frame: 45, value: -Math.PI / 4 }, // Sitting up
                        { frame: 90, value: 0 }              // Standing
                    ]);
                    
                    // Roll animation - from side to upright
                    const rotZAnim = new BABYLON.Animation(
                        "rollAnim", "rotation.z", 30,
                        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
                    );
                    rotZAnim.setKeys([
                        { frame: 0, value: -Math.PI / 2 },  // On side
                        { frame: 30, value: 0 }              // Upright
                    ]);
                    
                    // Turn animation - face toward the bars
                    const rotYAnim = new BABYLON.Animation(
                        "turnAnim", "rotation.y", 30,
                        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
                    );
                    rotYAnim.setKeys([
                        { frame: 0, value: 0 },
                        { frame: 90, value: 0 }  // Keep facing bars
                    ]);
                    
                    const easing = new BABYLON.QuadraticEase();
                    easing.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEOUT);
                    sitUpAnim.setEasingFunction(easing);
                    rotZAnim.setEasingFunction(easing);
                    rotYAnim.setEasingFunction(easing);
                    
                    player.visualMesh.animations = [sitUpAnim, rotZAnim, rotYAnim];
                    this.scene.beginAnimation(player.visualMesh, 0, 90, false);
                    
                    // Also move player up
                    const posAnim = new BABYLON.Animation(
                        "standPos", "position.y", 30,
                        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
                    );
                    posAnim.setKeys([
                        { frame: 0, value: 0.85 },
                        { frame: 45, value: 1.2 },
                        { frame: 90, value: GAME.PLAYER.HEIGHT / 2 + 0.1 }
                    ]);
                    player.mesh.animations = [posAnim];
                    this.scene.beginAnimation(player.mesh, 0, 90, false);
                }
                
                // Animate camera from first-person to third-person behind Jake
                this.transitionToThirdPerson();
                
                this.introCameraMode = 'thirdPerson';
                break;
                
            case 'enableControls':
                // Enable player controls
                if (player) {
                    player.controlsEnabled = true;
                    player.isRestrained = false;
                    
                    // Set collider to proper standing position (Image 2 coordinates)
                    player.mesh.position.set(0.05, 0.80, 0.02);
                    
                    if (player.visualMesh) {
                        // Set visual mesh to exact standing position/rotation from F9 editor (Image 2)
                        player.visualMesh.rotationQuaternion = null;  // Use Euler angles
                        player.visualMesh.position.set(0.05, 0.80, 0.02);
                        player.visualMesh.rotation.set(
                            46.5 * Math.PI / 180,   // X: 46.5°
                            21.4 * Math.PI / 180,   // Y: 21.4°
                            101.7 * Math.PI / 180   // Z: 101.7°
                        );
                        player.visualMesh.isVisible = true;

                        // Restore rootMesh position for standing model offset
                        const rootMesh = player.visualMesh.getChildren()[0];
                        if (rootMesh) {
                            rootMesh.rotationQuaternion = null;
                            rootMesh.rotation = new BABYLON.Vector3(0, -Math.PI / 2, 0);  // Bind-pose correction
                            rootMesh.position = new BABYLON.Vector3(0, -0.9, 0);
                        }
                    }
                    
                    // Reset camera yaw to face forward (+Z = east/bars direction)
                    if (this.game.inputManager) {
                        this.game.inputManager.yaw = Math.PI / 2; // 90° = facing +Z (east)
                        this.game.inputManager.pitch = 0;
                        this.game.inputManager.headYaw = 0;
                        this.game.inputManager.headPitch = 0;
                    }
                }
                
                // Update objective
                document.getElementById('objectiveDisplay').textContent = 
                    "Objective: Bend the bars and escape!";
                
                // Ensure any subtitle/dialogue UI is hidden and resume the game
                try { if (this.game?.dialogue?.hide) this.game.dialogue.hide(); } catch (e) { }
                this.hideSubtitle();
                if (this.game) {
                    this.game.isPaused = false;
                    try { this.game.canvas.requestPointerLock(); } catch (e) { /* ignore */ }
                }
                this.introCameraMode = null;

                // Force immediate visual sync so editor shows new positions
                try { if (player && player.updateVisualMesh) player.updateVisualMesh(); } catch (e) { }
                break;
        }
    }
    
    animateCeilingZoom() {
        const camera = this.game.camera;
        
        // Slowly move camera from front-right corner closer to Jake on the bed
        // Camera starts at (3.5, 3.5, 2.0) - front-right near bars
        const posAnim = new BABYLON.Animation(
            "ceilingZoom", "position", 30,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        posAnim.setKeys([
            { frame: 0, value: camera.position.clone() },  // Start at front-right corner (3.5, 3.5, 2.0)
            { frame: 120, value: new BABYLON.Vector3(1.0, 2.8, -0.5) }  // Move closer to bed, still front-right side
        ]);
        
        const easing = new BABYLON.QuadraticEase();
        easing.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEOUT);
        posAnim.setEasingFunction(easing);
        
        camera.animations = [posAnim];
        this.scene.beginAnimation(camera, 0, 120, false);
        
        // Also smoothly update the target to follow the camera movement
        let frameCount = 0;
        const targetObserver = this.scene.onBeforeRenderObservable.add(() => {
            frameCount++;
            camera.setTarget(new BABYLON.Vector3(-2, 0.85, -2.5)); // Keep looking at Jake on bed
            if (frameCount > 120) {
                this.scene.onBeforeRenderObservable.remove(targetObserver);
            }
        });
    }
    
    switchToFirstPerson() {
        const camera = this.game.camera;
        const player = this.game.player;
        
        this.introCameraMode = 'firstPerson';
        
        // Animate camera from ceiling down into Jake's eyes (POV while lying down)
        // Jake is lying on his back, so he's looking UP at the ceiling/his body
        const eyePos = new BABYLON.Vector3(-2.65, 1.05, -2.5); // Jake's eye position on pillow
        
        // Smooth transition from ceiling to first-person
        const posAnim = new BABYLON.Animation(
            "toFirstPerson", "position", 30,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        posAnim.setKeys([
            { frame: 0, value: camera.position.clone() },
            { frame: 60, value: eyePos }
        ]);
        
        const easing = new BABYLON.CubicEase();
        easing.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
        posAnim.setEasingFunction(easing);
        
        camera.animations = [posAnim];
        this.scene.beginAnimation(camera, 0, 60, false, 1, () => {
            // After transition, look DOWN at Jake's body (his torso, arms, legs)
            // He's lying on his back so looking "down" means toward his feet
            camera.setTarget(new BABYLON.Vector3(-1.8, 0.8, -2.5)); // Looking at his chest/arms
        });
        
        // Hide player head in first person, but could show body later
        if (player && player.visualMesh) {
            player.visualMesh.isVisible = false;
        }
    }
    
    transitionToThirdPerson() {
        const camera = this.game.camera;
        const player = this.game.player;
        
        // Calculate where the third-person camera should be (behind Jake as he stands)
        // Jake is at approximately (-1.5, ~1, -2.5) after standing and stepping off bed
        // He'll be facing the bars (toward +Z), so camera should be behind him (-Z direction)
        const targetPlayerPos = new BABYLON.Vector3(-1.5, GAME.PLAYER.HEIGHT / 2 + 0.1, -2.5);
        const thirdPersonOffset = new BABYLON.Vector3(0, 1.5, -GAME.CAMERA.DISTANCE); // Behind player (negative Z)
        const finalCameraPos = targetPlayerPos.add(thirdPersonOffset);
        
        // Smooth camera pull-out from first-person to third-person
        const posAnim = new BABYLON.Animation(
            "toThirdPerson", "position", 30,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        posAnim.setKeys([
            { frame: 0, value: camera.position.clone() },
            { frame: 30, value: new BABYLON.Vector3(-1.5, 2.5, -4.0) }, // Pull back behind Jake
            { frame: 90, value: finalCameraPos }
        ]);
        
        const easing = new BABYLON.CubicEase();
        easing.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
        posAnim.setEasingFunction(easing);
        
        camera.animations = [posAnim];
        this.scene.beginAnimation(camera, 0, 90, false);
        
        // Also animate camera to look at player
        // Use onBeforeRender to smoothly track player during animation
        let trackingObserver = this.scene.onBeforeRenderObservable.add(() => {
            if (player && player.mesh) {
                const targetPos = player.mesh.position.clone();
                targetPos.y += 1.2; // Look at chest height
                camera.setTarget(BABYLON.Vector3.Lerp(camera.getTarget(), targetPos, 0.05));
            }
        });
        
        // Remove observer after animation completes
        setTimeout(() => {
            this.scene.onBeforeRenderObservable.remove(trackingObserver);
        }, 3500);
    }
    
    showBreakFreePrompt() {
        // Create or show the break free UI
        let breakPrompt = document.getElementById('breakFreePrompt');
        if (!breakPrompt) {
            breakPrompt = document.createElement('div');
            breakPrompt.id = 'breakFreePrompt';
            breakPrompt.style.cssText = `
                position: fixed;
                bottom: 30%;
                left: 50%;
                transform: translateX(-50%);
                color: #ff6600;
                font-family: monospace;
                font-size: 28px;
                text-shadow: 0 0 10px #ff3300, 0 0 20px #ff0000;
                text-align: center;
                z-index: 100;
            `;
            document.body.appendChild(breakPrompt);
        }
        
        breakPrompt.innerHTML = `
            <div>HOLD [E] TO BREAK FREE</div>
            <div style="font-size: 16px; color: #aaa; margin-top: 5px;">The metal is bending...</div>
            <div id="strainBar" style="
                width: 300px;
                height: 20px;
                background: #333;
                border: 2px solid #ff6600;
                margin: 15px auto;
                border-radius: 10px;
                overflow: hidden;
            ">
                <div id="strainProgress" style="
                    width: 0%;
                    height: 100%;
                    background: linear-gradient(90deg, #ff3300, #ff6600, #ffaa00);
                    transition: width 0.1s;
                "></div>
            </div>
        `;
        breakPrompt.style.display = 'block';
        
        // Start listening for E key hold - takes about 4-5 seconds
        this.breakFreeProgress = 0;
        this.isBreakingFree = false;
        this.breakFreeListener = this.scene.onBeforeRenderObservable.add(() => {
            this.updateBreakFree();
        });
    }
    
    updateBreakFree() {
        const input = this.game.inputManager;
        const progressBar = document.getElementById('strainProgress');
        
        if (input.isKeyDown('e')) {
            this.isBreakingFree = true;
            this.breakFreeProgress += 0.4; // Slower fill - takes ~4 seconds
            
            // Shake camera while straining - intensity increases with progress
            const camera = this.game.camera;
            const intensity = 0.01 + (this.breakFreeProgress / 100) * 0.03;
            camera.position.x += (Math.random() - 0.5) * intensity;
            camera.position.y += (Math.random() - 0.5) * intensity * 0.5;
            
            // DEFORM the restraints as progress increases!
            const deformAmount = this.breakFreeProgress / 100;
            this.restraints.forEach((restraint, rIndex) => {
                if (restraint.metadata && restraint.metadata.pivots) {
                    const pivots = restraint.metadata.pivots;
                    const numPivots = pivots.length;
                    
                    // Bend the segments outward - like the band is being stretched
                    pivots.forEach((pivot, i) => {
                        // Segments on opposite sides bend outward
                        const angleFromCenter = (i / numPivots) * Math.PI * 2;
                        
                        // Top segments bend up, bottom bend down (to open the band)
                        const bendDir = Math.sin(angleFromCenter);
                        const maxBend = 0.4 + (rIndex * 0.05); // Wrists break slightly differently than ankles
                        
                        pivot.rotation.x = bendDir * deformAmount * maxBend;
                        pivot.rotation.z = (Math.random() - 0.5) * deformAmount * 0.1; // Slight random twist
                    });
                    
                    // Also scale segments to show stretching
                    restraint.metadata.segments.forEach(seg => {
                        seg.scaling.x = 1 + deformAmount * 0.15; // Stretch
                        seg.scaling.y = 1 - deformAmount * 0.1;  // Compress
                    });
                }
                
                // Shake the whole restraint
                restraint.rotation.z += (Math.random() - 0.5) * 0.02 * (1 + deformAmount);
            });
            
            // Change restraint color as they heat up from stress
            if (this.breakFreeProgress > 50) {
                const heatFactor = (this.breakFreeProgress - 50) / 50;
                this.restraints.forEach(r => {
                    if (r.metadata && r.metadata.segments) {
                        r.metadata.segments.forEach(seg => {
                            if (seg.material) {
                                seg.material.emissiveColor = new BABYLON.Color3(
                                    0.2 * heatFactor,
                                    0.05 * heatFactor,
                                    0
                                );
                            }
                        });
                    }
                });
            }
            
            if (progressBar) {
                progressBar.style.width = Math.min(100, this.breakFreeProgress) + '%';
            }
            
            // Break free at 100%
            if (this.breakFreeProgress >= 100) {
                this.completeBreakFree();
            }
        } else {
            // Progress slowly decreases when not holding E (metal springs back slightly)
            if (this.breakFreeProgress > 0) {
                this.breakFreeProgress = Math.max(0, this.breakFreeProgress - 0.15);
                
                // Reverse some deformation
                const deformAmount = this.breakFreeProgress / 100;
                this.restraints.forEach(restraint => {
                    if (restraint.metadata && restraint.metadata.pivots) {
                        restraint.metadata.pivots.forEach((pivot, i) => {
                            const angleFromCenter = (i / restraint.metadata.pivots.length) * Math.PI * 2;
                            const bendDir = Math.sin(angleFromCenter);
                            pivot.rotation.x = bendDir * deformAmount * 0.4;
                        });
                    }
                });
                
                if (progressBar) {
                    progressBar.style.width = this.breakFreeProgress + '%';
                }
            }
        }
    }
    
    completeBreakFree() {
        // Remove the update listener
        if (this.breakFreeListener) {
            this.scene.onBeforeRenderObservable.remove(this.breakFreeListener);
            this.breakFreeListener = null;
        }
        
        // Hide prompt
        const prompt = document.getElementById('breakFreePrompt');
        if (prompt) prompt.style.display = 'none';
        
        // Final break animation
        this.performIntroAction('breakFree');
        
        // Continue the intro sequence
        this.speak("Ha! I'm free!", () => {
            this.showSubtitle('Jake', "Ha! I'm free!");
            setTimeout(() => {
                this.showSubtitle('Jake', "That computer. Maybe it has some answers.");
                this.speak("That computer. Maybe it has some answers.", () => {
                    setTimeout(() => {
                        this.performIntroAction('sitUp');
                        setTimeout(() => {
                            this.performIntroAction('enableControls');
                        }, 3500); // Wait for sit up animation
                    }, 500);
                });
            }, 1500);
        });
    }
    
    breakRestraints() {
        // If we had an attach observer running, remove it so restraints can animate freely
        if (this._restraintAttachObserver) {
            this.scene.onBeforeRenderObservable.remove(this._restraintAttachObserver);
            this._restraintAttachObserver = null;
        }

        // Final dramatic break - restraints snap open and fall
        this.restraints.forEach((restraint, i) => {
            // Mark as detached so updater doesn't reposition it
            if (restraint.metadata) {
                restraint.metadata.attached = false;
                restraint.metadata.attachedBone = null;
            }

            setTimeout(() => {
                if (restraint.metadata && restraint.metadata.pivots) {
                    // Final violent bend - snap the band open
                    restraint.metadata.pivots.forEach((pivot, pIndex) => {
                        const angleFromCenter = (pIndex / restraint.metadata.pivots.length) * Math.PI * 2;
                        const bendDir = Math.sin(angleFromCenter);
                        
                        // Animate the final snap
                        const snapAnim = new BABYLON.Animation(
                            `snap_${i}_${pIndex}`, "rotation.x", 60,
                            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
                        );
                        snapAnim.setKeys([
                            { frame: 0, value: pivot.rotation.x },
                            { frame: 8, value: bendDir * 1.2 }, // Violent snap
                            { frame: 20, value: bendDir * 0.9 }  // Settle
                        ]);
                        pivot.animations = [snapAnim];
                        this.scene.beginAnimation(pivot, 0, 20, false);
                    });
                    
                    // Make segments fall/scatter slightly
                    restraint.metadata.segments.forEach((seg, sIndex) => {
                        setTimeout(() => {
                            const fallAnim = new BABYLON.Animation(
                                `fall_${i}_${sIndex}`, "position.y", 60,
                                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
                            );
                            fallAnim.setKeys([
                                { frame: 0, value: seg.position.y },
                                { frame: 30, value: seg.position.y - 0.3 - Math.random() * 0.2 }
                            ]);
                            seg.animations = [fallAnim];
                            this.scene.beginAnimation(seg, 0, 30, false);
                        }, sIndex * 30);
                    });
                }
                
                // Spark particles
                const sparks = new BABYLON.ParticleSystem(`sparks${i}`, 30, this.scene);
                sparks.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGklEQVQYV2NkYGD4z4AHMP7//x8fN+JwAwMAYPYD/k//cHMAAAAASUVORK5CYII=", this.scene);
                sparks.emitter = restraint.position.clone();
                sparks.minSize = 0.01;
                sparks.maxSize = 0.04;
                sparks.minLifeTime = 0.2;
                sparks.maxLifeTime = 0.5;
                sparks.emitRate = 80;
                sparks.direction1 = new BABYLON.Vector3(-1, 1, -1);
                sparks.direction2 = new BABYLON.Vector3(1, 2, 1);
                sparks.minEmitPower = 1;
                sparks.maxEmitPower = 3;
                sparks.color1 = new BABYLON.Color4(1, 0.8, 0.3, 1);
                sparks.color2 = new BABYLON.Color4(1, 0.4, 0.1, 1);
                sparks.colorDead = new BABYLON.Color4(0.5, 0.2, 0, 0);
                
                sparks.start();
                setTimeout(() => {
                    sparks.stop();
                    setTimeout(() => sparks.dispose(), 1000);
                }, 150);
                
            }, i * 200); // Stagger the breaks
        });
        
        this.restraintsBroken = true;
    }
    
    showSubtitle(speaker, text) {
        let subtitleDiv = document.getElementById('subtitleDisplay');
        
        if (!subtitleDiv) {
            subtitleDiv = document.createElement('div');
            subtitleDiv.id = 'subtitleDisplay';
            subtitleDiv.style.cssText = `
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 15px 30px;
                border-radius: 8px;
                font-family: Arial, sans-serif;
                font-size: 18px;
                max-width: 600px;
                text-align: center;
                z-index: 100;
                border: 2px solid #444;
            `;
            document.body.appendChild(subtitleDiv);
        }
        
        subtitleDiv.innerHTML = `<strong style="color: #4a9eff;">${speaker}:</strong> "${text}"`;
        subtitleDiv.style.display = 'block';
        // Pause the game while subtitles are visible so the intro/cutscene halts
        if (this.game) {
            this.game.isPaused = true;
            try { document.exitPointerLock(); } catch (e) { /* ignore */ }
        }
    }
    
    hideSubtitle() {
        const subtitleDiv = document.getElementById('subtitleDisplay');
        if (subtitleDiv) {
            subtitleDiv.style.display = 'none';
            // Resume the game if it was paused by showSubtitle
            if (this.game && this.game.isPaused) {
                this.game.isPaused = false;
            }
        }
    }
    
    createWallTexture(name, baseColor, isFloor = false) {
        // Create procedural texture WITHOUT mipmaps (avoids WebGL errors on DynamicTexture)
        const texture = new BABYLON.DynamicTexture(name + "Tex", { width: 512, height: 512 }, this.scene, false);
        const ctx = texture.getContext();
        
        const r = Math.floor(baseColor.r * 255);
        const g = Math.floor(baseColor.g * 255);
        const b = Math.floor(baseColor.b * 255);
        
        // Determine texture type from name
        if (name.includes('floor') || name.includes('Floor') || isFloor) {
            this.drawConcreteFloorTexture(ctx, r, g, b, 512);
        } else if (name.includes('rock') || name.includes('cave')) {
            this.drawRockTexture(ctx, r, g, b, 512);
        } else if (name.includes('abandoned') || name.includes('creepy') || name.includes('dark')) {
            this.drawDamagedWallTexture(ctx, r, g, b, 512);
        } else if (name.includes('med') || name.includes('Med')) {
            this.drawTileWallTexture(ctx, r, g, b, true, 512);
        } else if (name.includes('secret') || name.includes('panel')) {
            this.drawMetalPanelTexture(ctx, r, g, b, 512);
        } else if (name.includes('stair') || name.includes('Stair')) {
            this.drawConcreteTexture(ctx, r, g, b, 512);
        } else {
            this.drawCinderBlockTexture(ctx, r, g, b, 512);
        }
        
        texture.update();
        return texture;
    }
    
    // Detailed concrete floor with cracks and wear
    drawConcreteFloorTexture(ctx, r, g, b, size = 512) {
        // Base concrete color with variation
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const variation = (Math.random() - 0.5) * 15;
                const nr = Math.max(0, Math.min(255, r + variation));
                const ng = Math.max(0, Math.min(255, g + variation));
                const nb = Math.max(0, Math.min(255, b + variation));
                ctx.fillStyle = `rgb(${nr},${ng},${nb})`;
                ctx.fillRect(x, y, 1, 1);
            }
        }
        
        // Large tile grid
        ctx.strokeStyle = `rgba(0,0,0,0.4)`;
        ctx.lineWidth = 4;
        const tileSize = size / 8;
        for (let x = 0; x <= size; x += tileSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, size);
            ctx.stroke();
        }
        for (let y = 0; y <= size; y += tileSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(size, y);
            ctx.stroke();
        }
        
        // Grout lines (lighter inner edge)
        ctx.strokeStyle = `rgba(255,255,255,0.1)`;
        ctx.lineWidth = 1;
        for (let x = 2; x <= size; x += tileSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, size);
            ctx.stroke();
        }
        
        // Add cracks
        this.drawCracks(ctx, 8, 0.3, size);
        
        // Wear patterns and stains
        this.drawWearPatterns(ctx, 15, size);
        this.drawStains(ctx, 12, 0.15, size);
        
        // Dust and debris
        this.drawDebris(ctx, 1500, size);
    }
    
    // Cinder block wall texture
    drawCinderBlockTexture(ctx, r, g, b, size = 512) {
        // Base fill
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(0, 0, size, size);
        
        const blockWidth = size / 4;
        const blockHeight = size / 8;
        const mortarWidth = 4;
        
        // Draw cinder blocks with offset pattern
        for (let row = 0; row < 1024 / blockHeight; row++) {
            const offset = (row % 2) * (blockWidth / 2);
            
            for (let col = -1; col < 1024 / blockWidth + 1; col++) {
                const x = col * blockWidth + offset;
                const y = row * blockHeight;
                
                // Block face with subtle variation
                const blockVar = (Math.random() - 0.5) * 20;
                const br = Math.max(0, Math.min(255, r + blockVar));
                const bg = Math.max(0, Math.min(255, g + blockVar));
                const bb = Math.max(0, Math.min(255, b + blockVar));
                
                // Block body
                ctx.fillStyle = `rgb(${br},${bg},${bb})`;
                ctx.fillRect(x + mortarWidth/2, y + mortarWidth/2, 
                    blockWidth - mortarWidth, blockHeight - mortarWidth);
                
                // Add texture to each block
                this.drawBlockTexture(ctx, x + mortarWidth/2, y + mortarWidth/2, 
                    blockWidth - mortarWidth, blockHeight - mortarWidth);
                
                // Mortar lines (dark)
                ctx.fillStyle = `rgba(20,18,15,0.8)`;
                // Horizontal mortar
                ctx.fillRect(x, y, blockWidth, mortarWidth);
                // Vertical mortar
                ctx.fillRect(x, y, mortarWidth, blockHeight);
            }
        }
        
        // Add overall wear and stains
        this.drawWearPatterns(ctx, 8);
        this.drawStains(ctx, 8, 0.1);
        this.drawDebris(ctx, 1500);
    }
    
    // Individual block texture detail
    drawBlockTexture(ctx, x, y, w, h) {
        // Subtle aggregate texture
        for (let i = 0; i < 80; i++) {
            const px = x + Math.random() * w;
            const py = y + Math.random() * h;
            const size = Math.random() * 4 + 1;
            const alpha = Math.random() * 0.15;
            ctx.fillStyle = Math.random() > 0.5 ? 
                `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Edge highlight (top/left)
        ctx.fillStyle = `rgba(255,255,255,0.08)`;
        ctx.fillRect(x, y, w, 3);
        ctx.fillRect(x, y, 3, h);
        
        // Edge shadow (bottom/right)
        ctx.fillStyle = `rgba(0,0,0,0.12)`;
        ctx.fillRect(x, y + h - 3, w, 3);
        ctx.fillRect(x + w - 3, y, 3, h);
    }
    
    // Damaged/abandoned wall texture
    drawDamagedWallTexture(ctx, r, g, b) {
        // Darker base
        const dr = Math.floor(r * 0.8);
        const dg = Math.floor(g * 0.8);
        const db = Math.floor(b * 0.8);
        
        // Draw base cinder blocks
        this.drawCinderBlockTexture(ctx, dr, dg, db);
        
        // Heavy damage - missing chunks
        for (let i = 0; i < 5; i++) {
            const cx = Math.random() * 1024;
            const cy = Math.random() * 1024;
            const size = Math.random() * 80 + 40;
            
            ctx.fillStyle = `rgb(${dr-30},${dg-30},${db-30})`;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            for (let a = 0; a < Math.PI * 2; a += 0.3) {
                const radius = size * (0.6 + Math.random() * 0.4);
                ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
            }
            ctx.fill();
        }
        
        // More cracks
        this.drawCracks(ctx, 15, 0.5);
        
        // Mold/water damage stains
        for (let i = 0; i < 8; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 600; // More on top (water damage)
            const gradient = ctx.createRadialGradient(x, y, 0, x, y + 100, 150);
            gradient.addColorStop(0, `rgba(20,30,20,0.3)`);
            gradient.addColorStop(0.5, `rgba(15,25,15,0.15)`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(x - 150, y - 50, 300, 300);
        }
        
        // Rust streaks
        this.drawRustStreaks(ctx, 6);
        
        // Extra debris
        this.drawDebris(ctx, 4000);
    }
    
    // Rock/cave texture
    drawRockTexture(ctx, r, g, b) {
        // Noisy base
        for (let y = 0; y < 1024; y += 2) {
            for (let x = 0; x < 1024; x += 2) {
                const variation = (Math.random() - 0.5) * 40;
                const nr = Math.max(0, Math.min(255, r + variation));
                const ng = Math.max(0, Math.min(255, g + variation - 5));
                const nb = Math.max(0, Math.min(255, b + variation - 10));
                ctx.fillStyle = `rgb(${nr},${ng},${nb})`;
                ctx.fillRect(x, y, 2, 2);
            }
        }
        
        // Rock formations / layers
        for (let i = 0; i < 20; i++) {
            const y = Math.random() * 1024;
            ctx.strokeStyle = `rgba(0,0,0,${Math.random() * 0.3 + 0.1})`;
            ctx.lineWidth = Math.random() * 8 + 2;
            ctx.beginPath();
            ctx.moveTo(0, y);
            let cy = y;
            for (let x = 0; x < 1024; x += 20) {
                cy += (Math.random() - 0.5) * 30;
                ctx.lineTo(x, cy);
            }
            ctx.stroke();
        }
        
        // Rock bumps/protrusions
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 1024;
            const size = Math.random() * 60 + 20;
            
            const gradient = ctx.createRadialGradient(
                x - size * 0.3, y - size * 0.3, 0,
                x, y, size
            );
            gradient.addColorStop(0, `rgba(255,255,255,0.15)`);
            gradient.addColorStop(0.5, `rgba(0,0,0,0)`);
            gradient.addColorStop(1, `rgba(0,0,0,0.2)`);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Crevices
        this.drawCracks(ctx, 12, 0.4);
        
        // Mineral deposits (slight color variation)
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 1024;
            ctx.fillStyle = `rgba(${100 + Math.random()*50},${80 + Math.random()*40},${60 + Math.random()*30},0.2)`;
            ctx.beginPath();
            ctx.arc(x, y, Math.random() * 30 + 10, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Clean tile wall (medical/bathroom)
    drawTileWallTexture(ctx, r, g, b, addCross = false) {
        // Brighter base for medical
        const tr = Math.min(255, r + 20);
        const tg = Math.min(255, g + 20);
        const tb = Math.min(255, b + 20);
        
        ctx.fillStyle = `rgb(${tr},${tg},${tb})`;
        ctx.fillRect(0, 0, 1024, 1024);
        
        const tileSize = 64;
        
        // Draw tiles
        for (let row = 0; row < 1024 / tileSize; row++) {
            for (let col = 0; col < 1024 / tileSize; col++) {
                const x = col * tileSize;
                const y = row * tileSize;
                
                // Slight tile color variation
                const tileVar = (Math.random() - 0.5) * 10;
                ctx.fillStyle = `rgb(${tr+tileVar},${tg+tileVar},${tb+tileVar})`;
                ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
                
                // Tile gloss highlight
                ctx.fillStyle = `rgba(255,255,255,0.1)`;
                ctx.fillRect(x + 4, y + 4, tileSize - 20, 8);
                
                // Grout (darker)
                ctx.fillStyle = `rgba(80,75,70,0.6)`;
                ctx.fillRect(x, y, tileSize, 2);
                ctx.fillRect(x, y, 2, tileSize);
            }
        }
        
        // Some dirty grout
        for (let i = 0; i < 500; i++) {
            const x = Math.floor(Math.random() * (1024 / tileSize)) * tileSize;
            const y = Math.floor(Math.random() * (1024 / tileSize)) * tileSize;
            ctx.fillStyle = `rgba(40,35,30,${Math.random() * 0.3})`;
            if (Math.random() > 0.5) {
                ctx.fillRect(x, y + Math.random() * tileSize, Math.random() * 20 + 5, 2);
            } else {
                ctx.fillRect(x + Math.random() * tileSize, y, 2, Math.random() * 20 + 5);
            }
        }
        
        // Minor stains
        this.drawStains(ctx, 5, 0.08);
    }
    
    // Metal panel texture
    drawMetalPanelTexture(ctx, r, g, b) {
        // Brushed metal base
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(0, 0, 1024, 1024);
        
        // Brushed metal lines
        for (let y = 0; y < 1024; y++) {
            const alpha = Math.random() * 0.1;
            ctx.fillStyle = Math.random() > 0.5 ? 
                `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
            ctx.fillRect(0, y, 1024, 1);
        }
        
        // Panel divisions
        ctx.strokeStyle = `rgba(0,0,0,0.5)`;
        ctx.lineWidth = 3;
        ctx.strokeRect(20, 20, 984, 984);
        
        // Inner panel
        ctx.strokeStyle = `rgba(0,0,0,0.3)`;
        ctx.lineWidth = 2;
        ctx.strokeRect(50, 50, 924, 924);
        
        // Rivets
        const rivetPositions = [
            [40, 40], [984, 40], [40, 984], [984, 984],
            [512, 40], [512, 984], [40, 512], [984, 512]
        ];
        rivetPositions.forEach(([x, y]) => {
            // Rivet body
            const gradient = ctx.createRadialGradient(x-2, y-2, 0, x, y, 8);
            gradient.addColorStop(0, `rgba(180,180,185,1)`);
            gradient.addColorStop(0.5, `rgba(100,100,105,1)`);
            gradient.addColorStop(1, `rgba(60,60,65,1)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Scratches
        for (let i = 0; i < 20; i++) {
            const x1 = Math.random() * 1024;
            const y1 = Math.random() * 1024;
            const length = Math.random() * 100 + 20;
            const angle = Math.random() * Math.PI;
            
            ctx.strokeStyle = `rgba(255,255,255,${Math.random() * 0.2})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 + Math.cos(angle) * length, y1 + Math.sin(angle) * length);
            ctx.stroke();
        }
        
        // Edge wear
        this.drawStains(ctx, 4, 0.1);
    }
    
    // Plain concrete texture
    drawConcreteTexture(ctx, r, g, b) {
        // Noise base
        for (let y = 0; y < 1024; y += 2) {
            for (let x = 0; x < 1024; x += 2) {
                const variation = (Math.random() - 0.5) * 20;
                ctx.fillStyle = `rgb(${r+variation},${g+variation},${b+variation})`;
                ctx.fillRect(x, y, 2, 2);
            }
        }
        
        // Aggregate specks
        for (let i = 0; i < 2000; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 1024;
            const size = Math.random() * 3 + 1;
            ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 180 : 60},${Math.random() > 0.5 ? 175 : 55},${Math.random() > 0.5 ? 170 : 50},0.3)`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Form lines
        ctx.strokeStyle = `rgba(0,0,0,0.15)`;
        ctx.lineWidth = 2;
        for (let y = 128; y < 1024; y += 256) {
            ctx.beginPath();
            ctx.moveTo(0, y + Math.random() * 10);
            ctx.lineTo(1024, y + Math.random() * 10);
            ctx.stroke();
        }
        
        this.drawCracks(ctx, 5, 0.2);
        this.drawStains(ctx, 6, 0.1);
    }
    
    // Helper: Draw cracks
    drawCracks(ctx, count, maxAlpha, size = 512) {
        for (let i = 0; i < count; i++) {
            let x = Math.random() * size;
            let y = Math.random() * size;
            
            ctx.strokeStyle = `rgba(0,0,0,${Math.random() * maxAlpha + 0.1})`;
            ctx.lineWidth = Math.random() * 2 + 0.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            
            const segments = Math.floor(Math.random() * 15) + 5;
            for (let s = 0; s < segments; s++) {
                x += (Math.random() - 0.5) * 30;
                y += Math.random() * 20;
                ctx.lineTo(x, y);
                
                // Branch cracks
                if (Math.random() > 0.7) {
                    const bx = x + (Math.random() - 0.5) * 20;
                    const by = y + Math.random() * 15;
                    ctx.moveTo(x, y);
                    ctx.lineTo(bx, by);
                    ctx.moveTo(x, y);
                }
            }
            ctx.stroke();
        }
    }
    
    // Helper: Draw wear patterns
    drawWearPatterns(ctx, count, size = 512) {
        for (let i = 0; i < count; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const w = Math.random() * (size/5) + (size/20);
            const h = Math.random() * (size/10) + (size/30);
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h));
            gradient.addColorStop(0, `rgba(0,0,0,${Math.random() * 0.15})`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.ellipse(x, y, w, h, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Helper: Draw stains
    drawStains(ctx, count, maxAlpha, size = 512) {
        for (let i = 0; i < count; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const stainSize = Math.random() * (size/12) + (size/17);
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, stainSize);
            const stainColor = Math.random() > 0.5 ? 
                `rgba(40,30,20,${Math.random() * maxAlpha})` :
                `rgba(30,35,25,${Math.random() * maxAlpha})`;
            gradient.addColorStop(0, stainColor);
            gradient.addColorStop(0.7, stainColor.replace(/[\d.]+\)$/, '0.02)'));
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, stainSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Helper: Draw rust streaks
    drawRustStreaks(ctx, count, size = 512) {
        for (let i = 0; i < count; i++) {
            const x = Math.random() * size;
            const startY = Math.random() * (size * 0.3);
            
            ctx.strokeStyle = `rgba(120,60,30,${Math.random() * 0.3 + 0.1})`;
            ctx.lineWidth = Math.random() * 15 + 5;
            ctx.lineCap = 'round';
            
            ctx.beginPath();
            ctx.moveTo(x, startY);
            
            let cy = startY;
            for (let dy = 0; dy < Math.random() * (size * 0.4) + (size * 0.2); dy += 20) {
                const nx = x + (Math.random() - 0.5) * 20;
                cy += 20;
                ctx.lineTo(nx, cy);
            }
            ctx.stroke();
            
            // Rust origin point
            ctx.fillStyle = `rgba(100,50,25,0.4)`;
            ctx.beginPath();
            ctx.arc(x, startY, Math.random() * 15 + 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Helper: Draw debris/particles
    drawDebris(ctx, count, size = 512) {
        for (let i = 0; i < count; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const particleSize = Math.random() * 3 + 0.5;
            const alpha = Math.random() * 0.2;
            
            ctx.fillStyle = Math.random() > 0.6 ? 
                `rgba(0,0,0,${alpha})` : 
                `rgba(255,255,255,${alpha * 0.3})`;
            ctx.fillRect(x, y, particleSize, particleSize);
        }
    }
    
    // Create bump/normal map texture for 3D surface detail
    // IMPORTANT: generateMipMaps=false prevents WebGL errors on DynamicTextures
    createBumpTexture(name, isFloor = false) {
        const texture = new BABYLON.DynamicTexture(name + "BumpTex", { width: 512, height: 512 }, this.scene, false); // false = no mipmaps
        const ctx = texture.getContext();
        
        // Neutral gray base (128 = flat)
        ctx.fillStyle = 'rgb(128,128,128)';
        ctx.fillRect(0, 0, 512, 512);
        
        if (isFloor) {
            // Tile grooves
            const tileSize = 64;
            for (let x = 0; x <= 512; x += tileSize) {
                // Dark edge (indent)
                ctx.fillStyle = 'rgb(90,90,90)';
                ctx.fillRect(x - 2, 0, 4, 512);
                // Light edge (raised)
                ctx.fillStyle = 'rgb(160,160,160)';
                ctx.fillRect(x + 2, 0, 2, 512);
            }
            for (let y = 0; y <= 512; y += tileSize) {
                ctx.fillStyle = 'rgb(90,90,90)';
                ctx.fillRect(0, y - 2, 512, 4);
                ctx.fillStyle = 'rgb(160,160,160)';
                ctx.fillRect(0, y + 2, 512, 2);
            }
            
            // Surface roughness
            for (let i = 0; i < 3000; i++) {
                const x = Math.random() * 512;
                const y = Math.random() * 512;
                const val = 128 + (Math.random() - 0.5) * 40;
                ctx.fillStyle = `rgb(${val},${val},${val})`;
                ctx.fillRect(x, y, Math.random() * 2 + 1, Math.random() * 2 + 1);
            }
        } else {
            // Cinder block bump pattern
            const blockWidth = 128;
            const blockHeight = 64;
            const mortarWidth = 4;
            
            for (let row = 0; row < 512 / blockHeight; row++) {
                const offset = (row % 2) * (blockWidth / 2);
                
                for (let col = -1; col < 512 / blockWidth + 1; col++) {
                    const x = col * blockWidth + offset;
                    const y = row * blockHeight;
                    
                    // Mortar indent (dark = recessed)
                    ctx.fillStyle = 'rgb(70,70,70)';
                    ctx.fillRect(x, y, blockWidth, mortarWidth);
                    ctx.fillRect(x, y, mortarWidth, blockHeight);
                    
                    // Block surface variation
                    for (let i = 0; i < 50; i++) {
                        const bx = x + mortarWidth + Math.random() * (blockWidth - mortarWidth * 2);
                        const by = y + mortarWidth + Math.random() * (blockHeight - mortarWidth * 2);
                        const val = 128 + (Math.random() - 0.5) * 30;
                        ctx.fillStyle = `rgb(${val},${val},${val})`;
                        ctx.beginPath();
                        ctx.arc(bx, by, Math.random() * 3 + 1, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    
                    // Block edge highlights
                    ctx.fillStyle = 'rgb(150,150,150)';
                    ctx.fillRect(x + mortarWidth, y + mortarWidth, blockWidth - mortarWidth * 2, 2);
                    ctx.fillRect(x + mortarWidth, y + mortarWidth, 2, blockHeight - mortarWidth * 2);
                    
                    ctx.fillStyle = 'rgb(100,100,100)';
                    ctx.fillRect(x + mortarWidth, y + blockHeight - mortarWidth - 2, blockWidth - mortarWidth * 2, 2);
                    ctx.fillRect(x + blockWidth - mortarWidth - 2, y + mortarWidth, 2, blockHeight - mortarWidth * 2);
                }
            }
        }
        
        // Random surface imperfections
        for (let i = 0; i < 500; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = Math.random() * 8 + 2;
            const val = Math.random() > 0.5 ? 100 : 160;
            
            ctx.fillStyle = `rgb(${val},${val},${val})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        texture.update();
        return texture;
    }
    
    // Tile bump texture for medical/clean areas
    createTileBumpTexture(name) {
        const texture = new BABYLON.DynamicTexture(name + "TileBumpTex", { width: 512, height: 512 }, this.scene, false);
        const ctx = texture.getContext();
        
        // Neutral base
        ctx.fillStyle = 'rgb(128,128,128)';
        ctx.fillRect(0, 0, 512, 512);
        
        const tileSize = 32;
        
        // Tile grid with beveled edges
        for (let row = 0; row < 512 / tileSize; row++) {
            for (let col = 0; col < 512 / tileSize; col++) {
                const x = col * tileSize;
                const y = row * tileSize;
                
                // Grout (recessed)
                ctx.fillStyle = 'rgb(80,80,80)';
                ctx.fillRect(x, y, tileSize, 2);
                ctx.fillRect(x, y, 2, tileSize);
                
                // Tile bevel - top/left highlight
                ctx.fillStyle = 'rgb(145,145,145)';
                ctx.fillRect(x + 2, y + 2, tileSize - 4, 1);
                ctx.fillRect(x + 2, y + 2, 1, tileSize - 4);
                
                // Tile bevel - bottom/right shadow
                ctx.fillStyle = 'rgb(115,115,115)';
                ctx.fillRect(x + 2, y + tileSize - 3, tileSize - 4, 1);
                ctx.fillRect(x + tileSize - 3, y + 2, 1, tileSize - 4);
                
                // Subtle surface variation
                for (let i = 0; i < 5; i++) {
                    const tx = x + 4 + Math.random() * (tileSize - 8);
                    const ty = y + 4 + Math.random() * (tileSize - 8);
                    const val = 128 + (Math.random() - 0.5) * 10;
                    ctx.fillStyle = `rgb(${val},${val},${val})`;
                    ctx.fillRect(tx, ty, 1, 1);
                }
            }
        }
        
        texture.update();
        return texture;
    }
    
    // Rock bump texture for cave areas
    createRockBumpTexture(name) {
        const texture = new BABYLON.DynamicTexture(name + "RockBumpTex", { width: 512, height: 512 }, this.scene, false); // no mipmaps
        const ctx = texture.getContext();
        
        // Base with lots of noise
        for (let y = 0; y < 512; y++) {
            for (let x = 0; x < 512; x++) {
                const val = 128 + (Math.random() - 0.5) * 60;
                ctx.fillStyle = `rgb(${val},${val},${val})`;
                ctx.fillRect(x, y, 1, 1);
            }
        }
        
        // Large rock protrusions
        for (let i = 0; i < 30; i++) {
            const cx = Math.random() * 512;
            const cy = Math.random() * 512;
            const size = Math.random() * 50 + 20;
            
            const gradient = ctx.createRadialGradient(
                cx - size * 0.3, cy - size * 0.3, 0,
                cx, cy, size
            );
            gradient.addColorStop(0, 'rgb(180,180,180)');
            gradient.addColorStop(0.6, 'rgb(128,128,128)');
            gradient.addColorStop(1, 'rgb(80,80,80)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(cx, cy, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Crevices (dark lines)
        for (let i = 0; i < 15; i++) {
            ctx.strokeStyle = 'rgb(60,60,60)';
            ctx.lineWidth = Math.random() * 4 + 1;
            ctx.beginPath();
            let x = Math.random() * 512;
            let y = Math.random() * 512;
            ctx.moveTo(x, y);
            for (let s = 0; s < 10; s++) {
                x += (Math.random() - 0.5) * 50;
                y += Math.random() * 40;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        
        texture.update();
        return texture;
    }
    
    // Brushed metal bump texture
    createMetalBumpTexture(name) {
        const texture = new BABYLON.DynamicTexture(name + "MetalBumpTex", { width: 512, height: 512 }, this.scene, false); // no mipmaps
        const ctx = texture.getContext();
        
        // Neutral base
        ctx.fillStyle = 'rgb(128,128,128)';
        ctx.fillRect(0, 0, 512, 512);
        
        // Brushed metal lines (horizontal)
        for (let y = 0; y < 512; y++) {
            const val = 128 + (Math.random() - 0.5) * 20;
            ctx.fillStyle = `rgb(${val},${val},${val})`;
            ctx.fillRect(0, y, 512, 1);
        }
        
        // Panel edge grooves
        ctx.fillStyle = 'rgb(90,90,90)';
        ctx.fillRect(10, 10, 492, 3);
        ctx.fillRect(10, 10, 3, 492);
        ctx.fillStyle = 'rgb(160,160,160)';
        ctx.fillRect(10, 499, 492, 3);
        ctx.fillRect(499, 10, 3, 492);
        
        // Rivet bumps
        const rivetPositions = [
            [30, 30], [482, 30], [30, 482], [482, 482],
            [256, 30], [256, 482], [30, 256], [482, 256]
        ];
        rivetPositions.forEach(([x, y]) => {
            const gradient = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, 6);
            gradient.addColorStop(0, 'rgb(180,180,180)');
            gradient.addColorStop(0.5, 'rgb(140,140,140)');
            gradient.addColorStop(1, 'rgb(100,100,100)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Minor dents/scratches
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const length = Math.random() * 40 + 10;
            ctx.strokeStyle = `rgb(${110 + Math.random() * 40},${110 + Math.random() * 40},${110 + Math.random() * 40})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.random() * length, y + (Math.random() - 0.5) * 5);
            ctx.stroke();
        }
        
        texture.update();
        return texture;
    }
    
    createCell() {
        const cellWidth = 8;
        const cellDepth = 6;
        const cellHeight = 4;
        
        // Create textured materials
        const floorMat = new BABYLON.StandardMaterial("floorMat", this.scene);
        floorMat.diffuseTexture = this.createWallTexture("floor", new BABYLON.Color3(0.25, 0.25, 0.28), true);
        floorMat.diffuseTexture.uScale = 2;
        floorMat.diffuseTexture.vScale = 2;
        floorMat.specularColor = new BABYLON.Color3(0.15, 0.15, 0.15);
        floorMat.bumpTexture = this.createWallTexture("floorBump", new BABYLON.Color3(0.5, 0.5, 0.5), true);
        floorMat.bumpTexture.uScale = 2;
        floorMat.bumpTexture.vScale = 2;
        floorMat.bumpTexture.level = 0.3;
        
        const wallMat = new BABYLON.StandardMaterial("wallMat", this.scene);
        wallMat.diffuseTexture = this.createWallTexture("wall", new BABYLON.Color3(0.35, 0.35, 0.38));
        wallMat.diffuseTexture.uScale = 1.5;
        wallMat.diffuseTexture.vScale = 1;
        wallMat.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);
        wallMat.bumpTexture = this.createWallTexture("wallBump", new BABYLON.Color3(0.5, 0.5, 0.5));
        wallMat.bumpTexture.uScale = 1.5;
        wallMat.bumpTexture.vScale = 1;
        wallMat.bumpTexture.level = 0.4;
        
        const ceilingMat = new BABYLON.StandardMaterial("ceilingMat", this.scene);
        ceilingMat.diffuseTexture = this.createWallTexture("ceiling", new BABYLON.Color3(0.32, 0.32, 0.35));
        ceilingMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        
        // Store materials for reuse
        this.wallMat = wallMat;
        this.floorMat = floorMat;
        this.ceilingMat = ceilingMat;
        
        // Floor - extends from back wall to bars
        const floor = BABYLON.MeshBuilder.CreateBox("cellFloor", {
            width: cellWidth,
            height: 0.3,
            depth: cellDepth
        }, this.scene);
        floor.position = new BABYLON.Vector3(0, -0.15, -0.5);
        floor.material = floorMat;
        floor.receiveShadows = true;
        new BABYLON.PhysicsAggregate(floor, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Back wall (at the back of cell, away from bars)
        const backWall = BABYLON.MeshBuilder.CreateBox("backWall", {
            width: cellWidth,
            height: cellHeight,
            depth: 0.4
        }, this.scene);
        backWall.position = new BABYLON.Vector3(0, cellHeight / 2, -3.5);
        backWall.material = wallMat;
        new BABYLON.PhysicsAggregate(backWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Left wall (side wall)
        const leftWall = BABYLON.MeshBuilder.CreateBox("leftWall", {
            width: 0.4,
            height: cellHeight,
            depth: cellDepth + 2
        }, this.scene);
        leftWall.position = new BABYLON.Vector3(-cellWidth / 2, cellHeight / 2, -0.5);
        leftWall.material = wallMat;
        new BABYLON.PhysicsAggregate(leftWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Right wall (SOUTH wall) - WITH DOOR GAP - CLEAN SINGLE SECTIONS
        // Door at Z = -1.0, width 1.2, height 2.5
        const rightWallX = cellWidth / 2;
        // Move door to the flat right wall section away from toilet area
        const doorGapZ = 0.0;        // Centered on wall
        const doorGapWidth = 1.4; // Slightly wider than door for frame
        const doorGapHeight = 2.6;
        
        // SINGLE section ABOVE door (full width from back wall to bars)
        const rightWallTop = BABYLON.MeshBuilder.CreateBox("rightWallTop", {
            width: 0.4,
            height: cellHeight - doorGapHeight,
            depth: cellDepth + 2
        }, this.scene);
        rightWallTop.position = new BABYLON.Vector3(rightWallX, doorGapHeight + (cellHeight - doorGapHeight) / 2, -0.5);
        rightWallTop.material = wallMat;
        new BABYLON.PhysicsAggregate(rightWallTop, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // SINGLE section BELOW door (floor to door bottom) - full depth
        const rightWallBottom = BABYLON.MeshBuilder.CreateBox("rightWallBottom", {
            width: 0.4,
            height: 0.1, // Very thin floor-level section
            depth: cellDepth + 2
        }, this.scene);
        rightWallBottom.position = new BABYLON.Vector3(rightWallX, 0.05, -0.5);
        rightWallBottom.material = wallMat;
        new BABYLON.PhysicsAggregate(rightWallBottom, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // SINGLE section to LEFT of door (toward bars, Z+)
        const leftSectionDepth = 3.0; // From door edge to bars
        const rightWallLeft = BABYLON.MeshBuilder.CreateBox("rightWallLeft", {
            width: 0.4,
            height: doorGapHeight,
            depth: leftSectionDepth
        }, this.scene);
        rightWallLeft.position = new BABYLON.Vector3(rightWallX, doorGapHeight / 2, doorGapZ + doorGapWidth/2 + leftSectionDepth/2);
        rightWallLeft.material = wallMat;
        new BABYLON.PhysicsAggregate(rightWallLeft, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // SINGLE section to RIGHT of door (toward back wall, Z-)
        const rightSectionDepth = 2.3; // From door edge to back wall
        const rightWallRight = BABYLON.MeshBuilder.CreateBox("rightWallRight", {
            width: 0.4,
            height: doorGapHeight,
            depth: rightSectionDepth
        }, this.scene);
        rightWallRight.position = new BABYLON.Vector3(rightWallX, doorGapHeight / 2, doorGapZ - doorGapWidth/2 - rightSectionDepth/2);
        rightWallRight.material = wallMat;
        new BABYLON.PhysicsAggregate(rightWallRight, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Ceiling
        const ceiling = BABYLON.MeshBuilder.CreateBox("ceiling", {
            width: cellWidth,
            height: 0.3,
            depth: cellDepth + 2
        }, this.scene);
        ceiling.position = new BABYLON.Vector3(0, cellHeight, -0.5);
        ceiling.material = ceilingMat;
        new BABYLON.PhysicsAggregate(ceiling, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Add some props
        this.createCellProps();
        
        // Create adjacent cell with secret passage
        this.createAdjacentCell(cellWidth, cellHeight);
    }
    
    createCellProps() {
        // Create realistic toilet
        this.createToilet();
        
        // Sink mounted on wall
        this.createSink();
        
        // Security camera on door wall (back wall), top-left corner
        this.createSecurityCamera();
    }
    
    createSecurityCamera() {
        // Security camera position: front-right corner near bars
        // Right wall is at X = 3.5, bars at Z = 2.5, ceiling at Y = 3.8
        // Mount plate FLUSH against wall
        const wallX = 3.5;  // Right wall position
        const camY = 3.4;   // Near ceiling
        const camZ = 2.0;   // Near bars
        
        // Camera mount bracket
        const bracketMat = new BABYLON.StandardMaterial("bracketMat", this.scene);
        bracketMat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.18);
        bracketMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        
        // Wall mount plate (FLUSH against right wall)
        const mountPlate = BABYLON.MeshBuilder.CreateBox("secCamMount", {
            width: 0.05,
            height: 0.15,
            depth: 0.2
        }, this.scene);
        mountPlate.position = new BABYLON.Vector3(wallX - 0.025, camY, camZ);
        mountPlate.material = bracketMat;
        
        // Arm extending from wall (toward -X into cell)
        const arm = BABYLON.MeshBuilder.CreateCylinder("secCamArm", {
            height: 0.25,
            diameter: 0.04
        }, this.scene);
        arm.rotation.z = Math.PI / 2; // Horizontal, pointing into cell (-X)
        arm.position = new BABYLON.Vector3(wallX - 0.15, camY - 0.05, camZ);
        arm.material = bracketMat;
        
        // Camera body (main housing) - pointing toward back-left of cell
        const camBody = BABYLON.MeshBuilder.CreateCylinder("secCamBody", {
            height: 0.25,
            diameter: 0.12
        }, this.scene);
        camBody.rotation.x = Math.PI / 2 + 0.3; // Tilted down
        camBody.rotation.y = -Math.PI * 0.75; // Aimed toward back-left of cell (Jake on bed)
        camBody.position = new BABYLON.Vector3(wallX - 0.28, camY - 0.1, camZ - 0.1);
        camBody.material = bracketMat;
        
        // Camera lens (front) - pointing into cell
        const lens = BABYLON.MeshBuilder.CreateSphere("secCamLens", {
            diameter: 0.1,
            slice: 0.5
        }, this.scene);
        lens.rotation.x = Math.PI / 2 + 0.3;
        lens.rotation.y = -Math.PI * 0.75;
        lens.position = new BABYLON.Vector3(wallX - 0.38, camY - 0.14, camZ - 0.18);
        
        const lensMat = new BABYLON.StandardMaterial("lensMat", this.scene);
        lensMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.15);
        lensMat.specularColor = new BABYLON.Color3(1, 1, 1);
        lensMat.specularPower = 128;
        lens.material = lensMat;
        
        // Recording indicator light (blinking red LED)
        const led = BABYLON.MeshBuilder.CreateSphere("secCamLED", {
            diameter: 0.03
        }, this.scene);
        led.position = new BABYLON.Vector3(wallX - 0.25, camY - 0.02, camZ - 0.05);
        
        const ledMat = new BABYLON.StandardMaterial("ledMat", this.scene);
        ledMat.diffuseColor = new BABYLON.Color3(1, 0, 0);
        ledMat.emissiveColor = new BABYLON.Color3(1, 0, 0);
        led.material = ledMat;
        
        // Blink animation for LED
        let blinkTime = 0;
        this.scene.registerBeforeRender(() => {
            blinkTime += 0.05;
            const blink = Math.sin(blinkTime * 2) > 0 ? 1 : 0.2;
            ledMat.emissiveColor = new BABYLON.Color3(blink, 0, 0);
        });
        
        console.log('Security camera mounted on wall at X =', wallX, 'Y =', camY, 'Z =', camZ);
    }
    
    createToilet() {
        const toiletX = 3;
        const toiletZ = -2.5;
        
        // Toilet materials
        const porcelainMat = new BABYLON.StandardMaterial("porcelainMat", this.scene);
        porcelainMat.diffuseColor = new BABYLON.Color3(0.95, 0.95, 0.92);
        porcelainMat.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        porcelainMat.specularPower = 64;
        
        const seatMat = new BABYLON.StandardMaterial("seatMat", this.scene);
        seatMat.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.85);
        seatMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        
        const waterMat = new BABYLON.StandardMaterial("waterMat", this.scene);
        waterMat.diffuseColor = new BABYLON.Color3(0.7, 0.85, 0.95);
        waterMat.alpha = 0.8;
        waterMat.specularColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        
        // Toilet base (bowl exterior)
        const base = BABYLON.MeshBuilder.CreateCylinder("toiletBase", {
            height: 0.35,
            diameterTop: 0.45,
            diameterBottom: 0.35,
            tessellation: 24
        }, this.scene);
        base.position = new BABYLON.Vector3(toiletX, 0.175, toiletZ);
        base.material = porcelainMat;
        
        // Bowl interior (darker recess)
        const bowlInterior = BABYLON.MeshBuilder.CreateCylinder("bowlInterior", {
            height: 0.15,
            diameter: 0.35,
            tessellation: 24
        }, this.scene);
        bowlInterior.position = new BABYLON.Vector3(toiletX, 0.28, toiletZ);
        const interiorMat = porcelainMat.clone("interiorMat");
        interiorMat.diffuseColor = new BABYLON.Color3(0.85, 0.85, 0.82);
        bowlInterior.material = interiorMat;
        
        // Water in bowl
        const water = BABYLON.MeshBuilder.CreateDisc("toiletWater", {
            radius: 0.15,
            tessellation: 24
        }, this.scene);
        water.rotation.x = Math.PI / 2;
        water.position = new BABYLON.Vector3(toiletX, 0.22, toiletZ);
        water.material = waterMat;
        this.toiletWater = water;
        
        // Toilet seat (torus-like shape)
        const seat = BABYLON.MeshBuilder.CreateTorus("toiletSeat", {
            diameter: 0.42,
            thickness: 0.06,
            tessellation: 24
        }, this.scene);
        seat.rotation.x = Math.PI / 2;
        seat.position = new BABYLON.Vector3(toiletX, 0.38, toiletZ);
        seat.material = seatMat;
        
        // Toilet lid (can animate open/close)
        const lid = BABYLON.MeshBuilder.CreateDisc("toiletLid", {
            radius: 0.22,
            tessellation: 24
        }, this.scene);
        lid.material = seatMat;
        
        // Lid pivot for animation
        const lidPivot = new BABYLON.TransformNode("lidPivot", this.scene);
        lidPivot.position = new BABYLON.Vector3(toiletX, 0.4, toiletZ - 0.2);
        lid.parent = lidPivot;
        lid.position = new BABYLON.Vector3(0, 0, 0.2);
        lid.rotation.x = Math.PI / 2;
        this.toiletLid = lidPivot;
        this.toiletLidOpen = false;
        
        // Tank (cistern) at back
        const tank = BABYLON.MeshBuilder.CreateBox("toiletTank", {
            width: 0.45,
            height: 0.5,
            depth: 0.2
        }, this.scene);
        tank.position = new BABYLON.Vector3(toiletX, 0.6, toiletZ - 0.25);
        tank.material = porcelainMat;
        
        // Tank lid
        const tankLid = BABYLON.MeshBuilder.CreateBox("tankLid", {
            width: 0.48,
            height: 0.04,
            depth: 0.22
        }, this.scene);
        tankLid.position = new BABYLON.Vector3(toiletX, 0.87, toiletZ - 0.25);
        tankLid.material = porcelainMat;
        
        // Flush handle
        const handle = BABYLON.MeshBuilder.CreateCylinder("flushHandle", {
            height: 0.12,
            diameter: 0.025
        }, this.scene);
        handle.rotation.z = Math.PI / 2;
        handle.position = new BABYLON.Vector3(toiletX + 0.28, 0.75, toiletZ - 0.25);
        const handleMat = new BABYLON.StandardMaterial("handleMat", this.scene);
        handleMat.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.75);
        handleMat.specularColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        handle.material = handleMat;
        
        // Pipe going to wall
        const pipe = BABYLON.MeshBuilder.CreateCylinder("toiletPipe", {
            height: 0.8,
            diameter: 0.06
        }, this.scene);
        pipe.position = new BABYLON.Vector3(toiletX, 0.4, toiletZ - 0.4);
        const pipeMat = new BABYLON.StandardMaterial("pipeMat", this.scene);
        pipeMat.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.65);
        pipeMat.specularColor = new BABYLON.Color3(0.7, 0.7, 0.7);
        pipe.material = pipeMat;
        
        // Create interaction zone
        const toiletInteract = BABYLON.MeshBuilder.CreateBox("toiletInteract", {
            width: 0.8,
            height: 1.2,
            depth: 0.8
        }, this.scene);
        toiletInteract.position = new BABYLON.Vector3(toiletX, 0.6, toiletZ);
        toiletInteract.isVisible = false;
        toiletInteract.metadata = {
            interactable: true,
            type: 'toilet',
            name: 'Toilet',
            canUse: true
        };
        this.toilet = toiletInteract;
        
        // Store toilet state
        this.toiletFlushing = false;
    }
    
    createSink() {
        const sinkX = 3.2;
        const sinkZ = -3.1;
        
        const porcelainMat = new BABYLON.StandardMaterial("sinkPorcelainMat", this.scene);
        porcelainMat.diffuseColor = new BABYLON.Color3(0.95, 0.95, 0.92);
        porcelainMat.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        
        const metalMat = new BABYLON.StandardMaterial("sinkMetalMat", this.scene);
        metalMat.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.75);
        metalMat.specularColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        metalMat.specularPower = 128;
        
        // Sink basin
        const basin = BABYLON.MeshBuilder.CreateBox("sinkBasin", {
            width: 0.5,
            height: 0.15,
            depth: 0.4
        }, this.scene);
        basin.position = new BABYLON.Vector3(sinkX, 1.0, sinkZ);
        basin.material = porcelainMat;
        
        // Sink interior (recess)
        const interior = BABYLON.MeshBuilder.CreateBox("sinkInterior", {
            width: 0.4,
            height: 0.1,
            depth: 0.3
        }, this.scene);
        interior.position = new BABYLON.Vector3(sinkX, 1.02, sinkZ);
        const interiorMat = porcelainMat.clone("sinkInteriorMat");
        interiorMat.diffuseColor = new BABYLON.Color3(0.88, 0.88, 0.85);
        interior.material = interiorMat;
        
        // Faucet
        const faucetBase = BABYLON.MeshBuilder.CreateCylinder("faucetBase", {
            height: 0.08,
            diameter: 0.06
        }, this.scene);
        faucetBase.position = new BABYLON.Vector3(sinkX, 1.15, sinkZ - 0.12);
        faucetBase.material = metalMat;
        
        const faucetNeck = BABYLON.MeshBuilder.CreateCylinder("faucetNeck", {
            height: 0.15,
            diameter: 0.03
        }, this.scene);
        faucetNeck.rotation.x = Math.PI / 3;
        faucetNeck.position = new BABYLON.Vector3(sinkX, 1.22, sinkZ - 0.08);
        faucetNeck.material = metalMat;
        
        // Mirror above sink
        const mirror = BABYLON.MeshBuilder.CreateBox("mirror", {
            width: 0.5,
            height: 0.6,
            depth: 0.03
        }, this.scene);
        mirror.position = new BABYLON.Vector3(sinkX, 1.6, sinkZ - 0.18);
        const mirrorMat = new BABYLON.StandardMaterial("mirrorMat", this.scene);
        mirrorMat.diffuseColor = new BABYLON.Color3(0.6, 0.65, 0.7);
        mirrorMat.specularColor = new BABYLON.Color3(1, 1, 1);
        mirrorMat.specularPower = 256;
        mirror.material = mirrorMat;
        
        // Mirror frame
        const frame = BABYLON.MeshBuilder.CreateBox("mirrorFrame", {
            width: 0.55,
            height: 0.65,
            depth: 0.02
        }, this.scene);
        frame.position = new BABYLON.Vector3(sinkX, 1.6, sinkZ - 0.19);
        const frameMat = new BABYLON.StandardMaterial("frameMat", this.scene);
        frameMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.32);
        frame.material = frameMat;
    }
    
    useToilet() {
        if (this.toiletFlushing) return;
        
        // Open lid if closed
        if (!this.toiletLidOpen) {
            this.openToiletLid();
        }
        
        // Play urination sound (placeholder - would use actual audio)
        this.playToiletSound('urinate');
        
        // After a delay, flush
        setTimeout(() => {
            this.flushToilet();
        }, 3000);
    }
    
    openToiletLid() {
        if (this.toiletLidOpen) return;
        
        const lidAnim = new BABYLON.Animation(
            "openLid", "rotation.x", 30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        lidAnim.setKeys([
            { frame: 0, value: 0 },
            { frame: 15, value: -Math.PI / 2 }
        ]);
        
        this.toiletLid.animations = [lidAnim];
        this.scene.beginAnimation(this.toiletLid, 0, 15, false);
        this.toiletLidOpen = true;
        
        // Play lid sound
        this.playToiletSound('lid');
    }
    
    flushToilet() {
        if (this.toiletFlushing) return;
        this.toiletFlushing = true;
        
        // Play flush sound
        this.playToiletSound('flush');
        
        // Animate water swirling
        if (this.toiletWater) {
            const swirl = new BABYLON.Animation(
                "swirlWater", "rotation.y", 30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            swirl.setKeys([
                { frame: 0, value: 0 },
                { frame: 30, value: Math.PI * 4 },
                { frame: 60, value: Math.PI * 6 }
            ]);
            
            // Also animate scale (water going down)
            const drain = new BABYLON.Animation(
                "drainWater", "scaling", 30,
                BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            drain.setKeys([
                { frame: 0, value: new BABYLON.Vector3(1, 1, 1) },
                { frame: 30, value: new BABYLON.Vector3(0.3, 1, 0.3) },
                { frame: 50, value: new BABYLON.Vector3(0.1, 1, 0.1) },
                { frame: 60, value: new BABYLON.Vector3(1, 1, 1) }
            ]);
            
            this.toiletWater.animations = [swirl, drain];
            this.scene.beginAnimation(this.toiletWater, 0, 60, false, 1, () => {
                this.toiletFlushing = false;
            });
        } else {
            setTimeout(() => {
                this.toiletFlushing = false;
            }, 2000);
        }
    }
    
    playToiletSound(type) {
        // Create audio context if not exists
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        
        switch (type) {
            case 'lid':
                // Lid opening sound - quick thunk
                const lidOsc = ctx.createOscillator();
                const lidGain = ctx.createGain();
                lidOsc.connect(lidGain);
                lidGain.connect(ctx.destination);
                lidOsc.frequency.setValueAtTime(150, now);
                lidOsc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
                lidGain.gain.setValueAtTime(0.3, now);
                lidGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                lidOsc.start(now);
                lidOsc.stop(now + 0.15);
                break;
                
            case 'urinate':
                // Trickling water sound - noise based
                const duration = 3;
                const bufferSize = ctx.sampleRate * duration;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                
                for (let i = 0; i < bufferSize; i++) {
                    // Modulated noise for water sound
                    const t = i / ctx.sampleRate;
                    const mod = Math.sin(t * 30) * 0.5 + 0.5;
                    data[i] = (Math.random() * 2 - 1) * 0.15 * mod;
                }
                
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                
                // Bandpass filter for water-like sound
                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = 2000;
                filter.Q.value = 1;
                
                const gainNode = ctx.createGain();
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(0.4, now + 0.3);
                gainNode.gain.setValueAtTime(0.4, now + duration - 0.5);
                gainNode.gain.linearRampToValueAtTime(0, now + duration);
                
                source.connect(filter);
                filter.connect(gainNode);
                gainNode.connect(ctx.destination);
                source.start(now);
                break;
                
            case 'flush':
                // Flush sound - whoosh + gurgle
                const flushDuration = 2.5;
                const flushBufferSize = ctx.sampleRate * flushDuration;
                const flushBuffer = ctx.createBuffer(1, flushBufferSize, ctx.sampleRate);
                const flushData = flushBuffer.getChannelData(0);
                
                for (let i = 0; i < flushBufferSize; i++) {
                    const t = i / ctx.sampleRate;
                    // Envelope
                    let env = 1;
                    if (t < 0.2) env = t / 0.2;
                    else if (t > flushDuration - 0.5) env = (flushDuration - t) / 0.5;
                    
                    // Swirling modulation
                    const swirl = Math.sin(t * 20 + Math.sin(t * 5) * 3);
                    flushData[i] = (Math.random() * 2 - 1) * 0.25 * env * (0.5 + swirl * 0.3);
                }
                
                const flushSource = ctx.createBufferSource();
                flushSource.buffer = flushBuffer;
                
                const flushFilter = ctx.createBiquadFilter();
                flushFilter.type = 'lowpass';
                flushFilter.frequency.setValueAtTime(3000, now);
                flushFilter.frequency.exponentialRampToValueAtTime(500, now + flushDuration);
                
                flushSource.connect(flushFilter);
                flushFilter.connect(ctx.destination);
                flushSource.start(now);
                break;
        }
    }
    
    createAdjacentCell(cellWidth, cellHeight) {
        // Adjacent abandoned cell to the right - accessible through bars
        const adjCellX = cellWidth / 2 + 3; // Right of main cell
        const adjCellWidth = 5;
        const adjCellDepth = 5;
        
        // Dark wall material for abandoned cell
        const darkWallMat = new BABYLON.StandardMaterial("darkWallMat", this.scene);
        darkWallMat.diffuseTexture = this.createWallTexture("darkWall", new BABYLON.Color3(0.2, 0.2, 0.22));
        darkWallMat.specularColor = new BABYLON.Color3(0.03, 0.03, 0.03);
        
        // Floor
        const adjFloor = BABYLON.MeshBuilder.CreateBox("adjCellFloor", {
            width: adjCellWidth,
            height: 0.3,
            depth: adjCellDepth
        }, this.scene);
        adjFloor.position = new BABYLON.Vector3(adjCellX, -0.15, -0.5);
        adjFloor.material = this.floorMat;
        adjFloor.receiveShadows = true;
        new BABYLON.PhysicsAggregate(adjFloor, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Back wall
        const adjBackWall = BABYLON.MeshBuilder.CreateBox("adjBackWall", {
            width: adjCellWidth,
            height: cellHeight,
            depth: 0.4
        }, this.scene);
        adjBackWall.position = new BABYLON.Vector3(adjCellX, cellHeight / 2, -3);
        adjBackWall.material = darkWallMat;
        new BABYLON.PhysicsAggregate(adjBackWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Right wall WITH secret panel
        // First, create the wall sections around the secret panel
        const panelWidth = 1.8;
        const panelHeight = 2.5;
        const wallRightX = adjCellX + adjCellWidth / 2;
        
        // Top section above panel
        const wallTopSection = BABYLON.MeshBuilder.CreateBox("adjWallTop", {
            width: 0.4,
            height: cellHeight - panelHeight,
            depth: adjCellDepth
        }, this.scene);
        wallTopSection.position = new BABYLON.Vector3(wallRightX, cellHeight - (cellHeight - panelHeight) / 2, -0.5);
        wallTopSection.material = darkWallMat;
        new BABYLON.PhysicsAggregate(wallTopSection, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Section to the left of panel
        const wallLeftSection = BABYLON.MeshBuilder.CreateBox("adjWallLeft", {
            width: 0.4,
            height: panelHeight,
            depth: (adjCellDepth - panelWidth) / 2
        }, this.scene);
        wallLeftSection.position = new BABYLON.Vector3(wallRightX, panelHeight / 2, -3 + (adjCellDepth - panelWidth) / 4);
        wallLeftSection.material = darkWallMat;
        new BABYLON.PhysicsAggregate(wallLeftSection, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Section to the right of panel (toward bars)
        const wallRightSection = BABYLON.MeshBuilder.CreateBox("adjWallRight", {
            width: 0.4,
            height: panelHeight,
            depth: (adjCellDepth - panelWidth) / 2
        }, this.scene);
        wallRightSection.position = new BABYLON.Vector3(wallRightX, panelHeight / 2, 2 - (adjCellDepth - panelWidth) / 4);
        wallRightSection.material = darkWallMat;
        new BABYLON.PhysicsAggregate(wallRightSection, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // THE SECRET PANEL - slides into the wall when activated
        const secretPanelMat = new BABYLON.StandardMaterial("secretPanelMat", this.scene);
        secretPanelMat.diffuseTexture = this.createWallTexture("secretPanel", new BABYLON.Color3(0.22, 0.22, 0.24));
        secretPanelMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        
        this.creepySecretPanel = BABYLON.MeshBuilder.CreateBox("creepySecretPanel", {
            width: 0.35,
            height: panelHeight,
            depth: panelWidth
        }, this.scene);
        this.creepySecretPanel.position = new BABYLON.Vector3(wallRightX - 0.025, panelHeight / 2, -0.5);
        this.creepySecretPanel.material = secretPanelMat;
        new BABYLON.PhysicsAggregate(this.creepySecretPanel, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Subtle crack hints around the panel
        const crackMat = new BABYLON.StandardMaterial("crackMat", this.scene);
        crackMat.diffuseColor = new BABYLON.Color3(0.08, 0.08, 0.1);
        crackMat.alpha = 0.6;
        
        // Top crack
        const topCrack = BABYLON.MeshBuilder.CreateBox("topCrack", {
            width: 0.02,
            height: 0.02,
            depth: panelWidth + 0.05
        }, this.scene);
        topCrack.position = new BABYLON.Vector3(wallRightX - 0.2, panelHeight + 0.01, -0.5);
        topCrack.material = crackMat;
        
        // Make panel interactable
        this.creepySecretPanel.metadata = {
            interactable: true,
            type: 'creepy_secret_panel',
            name: 'Suspicious Wall Section',
            opened: false
        };
        this.creepySecretPanelOpen = false;
        
        // Ceiling for adjacent cell
        const adjCeiling = BABYLON.MeshBuilder.CreateBox("adjCeiling", {
            width: adjCellWidth,
            height: 0.3,
            depth: adjCellDepth
        }, this.scene);
        adjCeiling.position = new BABYLON.Vector3(adjCellX, cellHeight, -0.5);
        adjCeiling.material = this.ceilingMat;
        
        // DISABLED - Too many lights cause WebGL shader overflow
        // const adjLight = new BABYLON.PointLight("adjCellLight", new BABYLON.Vector3(adjCellX, 3, -0.5), this.scene);
        // adjLight.intensity = 0.2;
        // adjLight.diffuse = new BABYLON.Color3(0.5, 0.5, 0.6);
        // adjLight.range = 6;
        
        // Bars between cells (decorative - some broken)
        this.createCellDividerBars(cellWidth / 2, cellHeight);
        
        // Create the dark hall and creepy descending stairway BEHIND the panel
        this.createCreepyPassage(wallRightX, cellHeight);
    }
    
    createCellDividerBars(dividerX, cellHeight) {
        // Bars separating main cell from adjacent abandoned cell
        const barHeight = 3;
        const barRadius = 0.04;
        const numBars = 6;
        const barSpacing = 0.5;
        const startZ = -2;
        
        const barMat = new BABYLON.StandardMaterial("dividerBarMat", this.scene);
        barMat.diffuseColor = new BABYLON.Color3(0.35, 0.3, 0.25); // Rusty
        barMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        
        for (let i = 0; i < numBars; i++) {
            // Some bars are broken/bent
            if (i === 2 || i === 3) {
                // Broken bar - just a stub
                const brokenBar = BABYLON.MeshBuilder.CreateCylinder(`dividerBar_${i}`, {
                    height: 0.5,
                    diameter: barRadius * 2
                }, this.scene);
                brokenBar.position = new BABYLON.Vector3(dividerX + 0.5, 0.25, startZ + i * barSpacing);
                brokenBar.material = barMat;
                continue;
            }
            
            const bar = BABYLON.MeshBuilder.CreateCylinder(`dividerBar_${i}`, {
                height: barHeight,
                diameter: barRadius * 2
            }, this.scene);
            bar.position = new BABYLON.Vector3(dividerX + 0.5, barHeight / 2, startZ + i * barSpacing);
            bar.material = barMat;
        }
        
        // Horizontal bar at top
        const topBar = BABYLON.MeshBuilder.CreateCylinder("dividerTopBar", {
            height: numBars * barSpacing,
            diameter: barRadius * 2
        }, this.scene);
        topBar.rotation.x = Math.PI / 2;
        topBar.position = new BABYLON.Vector3(dividerX + 0.5, barHeight, startZ + (numBars - 1) * barSpacing / 2);
        topBar.material = barMat;
    }
    
    createCreepyPassage(startX, cellHeight) {
        // Dark hallway behind the secret panel
        const hallWidth = 2;
        const hallLength = 4;
        const hallHeight = 2.8;
        
        // Very dark material for creepy passage
        const darkMat = new BABYLON.StandardMaterial("creepyDarkMat", this.scene);
        darkMat.diffuseTexture = this.createWallTexture("creepyWall", new BABYLON.Color3(0.12, 0.1, 0.1));
        darkMat.specularColor = new BABYLON.Color3(0.02, 0.02, 0.02);
        
        const floorMat = new BABYLON.StandardMaterial("creepyFloorMat", this.scene);
        floorMat.diffuseTexture = this.createWallTexture("creepyFloor", new BABYLON.Color3(0.1, 0.08, 0.08), true);
        floorMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        
        // Hall floor
        const hallFloor = BABYLON.MeshBuilder.CreateBox("creepyHallFloor", {
            width: hallLength,
            height: 0.2,
            depth: hallWidth
        }, this.scene);
        hallFloor.position = new BABYLON.Vector3(startX + hallLength / 2 + 0.3, -0.1, -0.5);
        hallFloor.material = floorMat;
        hallFloor.receiveShadows = true;
        new BABYLON.PhysicsAggregate(hallFloor, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Hall ceiling
        const hallCeiling = BABYLON.MeshBuilder.CreateBox("creepyHallCeiling", {
            width: hallLength,
            height: 0.2,
            depth: hallWidth
        }, this.scene);
        hallCeiling.position = new BABYLON.Vector3(startX + hallLength / 2 + 0.3, hallHeight, -0.5);
        hallCeiling.material = darkMat;
        
        // Left wall of hall
        const hallLeftWall = BABYLON.MeshBuilder.CreateBox("creepyHallLeft", {
            width: hallLength,
            height: hallHeight,
            depth: 0.2
        }, this.scene);
        hallLeftWall.position = new BABYLON.Vector3(startX + hallLength / 2 + 0.3, hallHeight / 2, -0.5 - hallWidth / 2);
        hallLeftWall.material = darkMat;
        new BABYLON.PhysicsAggregate(hallLeftWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Right wall of hall
        const hallRightWall = BABYLON.MeshBuilder.CreateBox("creepyHallRight", {
            width: hallLength,
            height: hallHeight,
            depth: 0.2
        }, this.scene);
        hallRightWall.position = new BABYLON.Vector3(startX + hallLength / 2 + 0.3, hallHeight / 2, -0.5 + hallWidth / 2);
        hallRightWall.material = darkMat;
        new BABYLON.PhysicsAggregate(hallRightWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // End wall with stairway entrance
        const hallEndWall = BABYLON.MeshBuilder.CreateBox("creepyHallEnd", {
            width: 0.2,
            height: hallHeight,
            depth: hallWidth
        }, this.scene);
        hallEndWall.position = new BABYLON.Vector3(startX + hallLength + 0.4, hallHeight / 2, -0.5);
        hallEndWall.material = darkMat;
        new BABYLON.PhysicsAggregate(hallEndWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // CREATE THE DESCENDING STAIRWAY
        this.createDescendingStairway(startX + hallLength + 0.3, -0.5, hallHeight);
        
        // DISABLED - Too many lights cause WebGL shader overflow
        // const creepyLight = new BABYLON.PointLight("creepyPassageLight", 
        //     new BABYLON.Vector3(startX + hallLength / 2, hallHeight - 0.5, -0.5), this.scene);
        // creepyLight.intensity = 0.15;
        // creepyLight.diffuse = new BABYLON.Color3(0.6, 0.5, 0.4);
        // creepyLight.range = 5;
        // 
        // // Flicker effect
        // let flickerTimer = 0;
        // this.scene.onBeforeRenderObservable.add(() => {
        //     flickerTimer += this.scene.getEngine().getDeltaTime();
        //     if (Math.random() < 0.03) {
        //         creepyLight.intensity = Math.random() * 0.1 + 0.05;
        //     } else {
        //         creepyLight.intensity = BABYLON.Scalar.Lerp(creepyLight.intensity, 0.15, 0.05);
        //     }
        // });
    }
    
    createDescendingStairway(startX, startZ, hallHeight) {
        // Creepy descending stairway going DOWN (to basement/sub-level)
        const stairWidth = 1.8;
        const stepHeight = 0.25;
        const stepDepth = 0.35;
        const numSteps = 20; // Goes deep underground
        
        const stairMat = new BABYLON.StandardMaterial("stairMat", this.scene);
        stairMat.diffuseTexture = this.createWallTexture("stairTex", new BABYLON.Color3(0.15, 0.12, 0.1));
        stairMat.specularColor = new BABYLON.Color3(0.03, 0.03, 0.03);
        
        const darkWallMat = new BABYLON.StandardMaterial("stairWallMat", this.scene);
        darkWallMat.diffuseTexture = this.createWallTexture("stairWall", new BABYLON.Color3(0.1, 0.08, 0.08));
        darkWallMat.specularColor = new BABYLON.Color3(0.02, 0.02, 0.02);
        
        // Create stair steps going DOWN
        for (let i = 0; i < numSteps; i++) {
            const step = BABYLON.MeshBuilder.CreateBox(`descendStep_${i}`, {
                width: stepDepth,
                height: stepHeight,
                depth: stairWidth
            }, this.scene);
            step.position = new BABYLON.Vector3(
                startX + i * stepDepth,
                -i * stepHeight - stepHeight / 2,
                startZ
            );
            step.material = stairMat;
            new BABYLON.PhysicsAggregate(step, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        }
        
        // Stairway walls
        const stairLength = numSteps * stepDepth;
        const stairDescent = numSteps * stepHeight;
        
        // Calculate wall angle
        const wallAngle = Math.atan2(stairDescent, stairLength);
        const wallLength = Math.sqrt(stairLength * stairLength + stairDescent * stairDescent);
        
        // Left wall of stairway
        const stairLeftWall = BABYLON.MeshBuilder.CreateBox("stairLeftWall", {
            width: wallLength + 1,
            height: 3,
            depth: 0.15
        }, this.scene);
        stairLeftWall.rotation.z = wallAngle;
        stairLeftWall.position = new BABYLON.Vector3(
            startX + stairLength / 2,
            -stairDescent / 2 + 0.5,
            startZ - stairWidth / 2 - 0.1
        );
        stairLeftWall.material = darkWallMat;
        new BABYLON.PhysicsAggregate(stairLeftWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Right wall of stairway
        const stairRightWall = stairLeftWall.clone("stairRightWall");
        stairRightWall.position.z = startZ + stairWidth / 2 + 0.1;
        new BABYLON.PhysicsAggregate(stairRightWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Ceiling following stairs
        const stairCeiling = BABYLON.MeshBuilder.CreateBox("stairCeiling", {
            width: wallLength + 1,
            height: 0.15,
            depth: stairWidth + 0.3
        }, this.scene);
        stairCeiling.rotation.z = wallAngle;
        stairCeiling.position = new BABYLON.Vector3(
            startX + stairLength / 2,
            -stairDescent / 2 + 2.2,
            startZ
        );
        stairCeiling.material = darkWallMat;
        
        // Landing at the bottom
        const bottomY = -numSteps * stepHeight;
        const landingFloor = BABYLON.MeshBuilder.CreateBox("stairLanding", {
            width: 3,
            height: 0.3,
            depth: stairWidth + 1
        }, this.scene);
        landingFloor.position = new BABYLON.Vector3(startX + stairLength + 1.5, bottomY - 0.15, startZ);
        landingFloor.material = stairMat;
        new BABYLON.PhysicsAggregate(landingFloor, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Exit trigger at bottom of stairs (to Level 2 basement area)
        const creepyExitTrigger = BABYLON.MeshBuilder.CreateBox("creepyExitTrigger", {
            width: 2,
            height: 2,
            depth: 2
        }, this.scene);
        creepyExitTrigger.position = new BABYLON.Vector3(startX + stairLength + 2, bottomY + 1, startZ);
        creepyExitTrigger.isVisible = false;
        creepyExitTrigger.metadata = {
            trigger: true,
            type: 'creepyLevelExit'
        };
        
        // DISABLED - Too many lights cause WebGL shader overflow
        // const bottomLight = new BABYLON.PointLight("bottomStairLight",
        //     new BABYLON.Vector3(startX + stairLength + 1.5, bottomY + 1.5, startZ), this.scene);
        // bottomLight.intensity = 0.1;
        // bottomLight.diffuse = new BABYLON.Color3(0.8, 0.2, 0.1);
        // bottomLight.range = 4;
        // 
        // // Pulse the red light for creepy effect
        // const pulseAnim = new BABYLON.Animation(
        //     "bottomLightPulse", "intensity", 30,
        //     BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        //     BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        // );
        // pulseAnim.setKeys([
        //     { frame: 0, value: 0.08 },
        //     { frame: 45, value: 0.15 },
        //     { frame: 90, value: 0.08 }
        // ]);
        // bottomLight.animations.push(pulseAnim);
        // this.scene.beginAnimation(bottomLight, 0, 90, true);
    }
    
    openCreepySecretPanel() {
        if (this.creepySecretPanelOpen) return;
        this.creepySecretPanelOpen = true;
        
        // Slide the panel upward into the wall with a grinding sound effect
        const startY = this.creepySecretPanel.position.y;
        const endY = startY + 3; // Slide up
        
        // Animation
        const slideAnim = new BABYLON.Animation(
            "panelSlide", "position.y", 30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        slideAnim.setKeys([
            { frame: 0, value: startY },
            { frame: 60, value: endY }
        ]);
        
        // Add easing for grinding effect
        const ease = new BABYLON.CubicEase();
        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
        slideAnim.setEasingFunction(ease);
        
        this.creepySecretPanel.animations = [slideAnim];
        this.scene.beginAnimation(this.creepySecretPanel, 0, 60, false, 0.5);
        
        // Disable physics on panel
        if (this.creepySecretPanel.physicsBody) {
            this.creepySecretPanel.physicsBody.dispose();
        }
        
        // Update metadata
        this.creepySecretPanel.metadata.opened = true;
        this.creepySecretPanel.metadata.interactable = false;
        
        // Objective update
        document.getElementById('objectiveDisplay').textContent = 
            "A dark passage... what lies below?";
    }
    
    createBars() {
        const barHeight = 3.5;
        const barRadius = 0.05;
        const cellWidth = 8;
        const numBars = 15;
        const totalBarWidth = cellWidth - 0.8;
        const barSpacing = totalBarWidth / (numBars - 1);
        const startX = -totalBarWidth / 2;
        const barZ = 2.5;
        
        // Metal material for bars
        const barMat = new BABYLON.StandardMaterial("barMat", this.scene);
        barMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.35);
        barMat.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        barMat.specularPower = 64;
        
        // Bendable bars in the middle section
        const bendableStart = 6;
        const bendableEnd = 8;
        
        for (let i = 0; i < numBars; i++) {
            const isBendable = i >= bendableStart && i <= bendableEnd;
            const barX = startX + i * barSpacing;
            
            if (isBendable) {
                // Create a multi-segment bendable bar that curves in the middle
                const barContainer = new BABYLON.TransformNode(`bar_container_${i}`, this.scene);
                barContainer.position = new BABYLON.Vector3(barX, 0, barZ);
                
                // Number of segments for smooth curve - MORE segments = SMOOTHER arc
                const numSegments = 18;
                const segmentHeight = barHeight / numSegments;
                const segments = [];
                const pivots = [];
                
                // Slightly different material for bendable bars
                const bendableMat = barMat.clone(`bendableBarMat_${i}`);
                bendableMat.diffuseColor = new BABYLON.Color3(0.32, 0.32, 0.38);
                bendableMat.emissiveColor = new BABYLON.Color3(0.02, 0.03, 0.02);
                
                // Create segments from bottom to top (chain pivots for continuous bend)
                for (let s = 0; s < numSegments; s++) {
                    // Create pivot for this segment (allows rotation around middle)
                    const pivot = new BABYLON.TransformNode(`bar_${i}_pivot_${s}`, this.scene);
                    // Chain pivots so rotations accumulate (snake effect) but anchor Y at base
                    pivot.parent = s === 0 ? barContainer : pivots[s - 1];
                    pivot.position.y = segmentHeight; // Each pivot sits atop the previous
                    
                    pivots.push(pivot);
                    
                    // Create the bar segment
                    const segment = BABYLON.MeshBuilder.CreateCylinder(`bar_${i}_seg_${s}`, {
                        height: segmentHeight,
                        diameter: barRadius * 2
                    }, this.scene);
                    segment.position.y = segmentHeight / 2;  // Centered on its pivot
                    segment.parent = pivot;
                    segment.material = bendableMat;
                    segments.push(segment);
                }
                
                // Store all segment data for bending animation
                const barData = {
                    interactable: true,
                    type: 'bar',
                    bent: false,
                    index: i,
                    segments: segments,
                    pivots: pivots,
                    container: barContainer,
                    numSegments: numSegments
                };
                
                // Make ALL segments interactable for raycasting (any part can be targeted)
                segments.forEach(seg => {
                    seg.metadata = barData;
                    seg.isPickable = true;  // Ensure raycast can hit it
                    seg.checkCollisions = false; // Prevent physics blocking Jake while bending
                });
                
                // Add physics collider
                const barCollider = BABYLON.MeshBuilder.CreateBox(`bar_collider_${i}`, {
                    width: barRadius * 6,
                    height: barHeight,
                    depth: barRadius * 6
                }, this.scene);
                barCollider.position.y = barHeight / 2;
                barCollider.parent = barContainer;
                barCollider.isVisible = false;
                barData.collider = barCollider;
                new BABYLON.PhysicsAggregate(barCollider, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
                
                this.bars.push(segments[0]);
            } else {
                // Non-bendable solid bar
                const bar = BABYLON.MeshBuilder.CreateCylinder(`bar_${i}`, {
                    height: barHeight,
                    diameter: barRadius * 2
                }, this.scene);
                
                bar.position = new BABYLON.Vector3(barX, barHeight / 2, barZ);
                bar.material = barMat;
                
                new BABYLON.PhysicsAggregate(bar, BABYLON.PhysicsShapeType.CYLINDER, { mass: 0 }, this.scene);
                
                bar.metadata = {
                    interactable: false,
                    type: 'bar',
                    bent: false,
                    index: i
                };
                
                this.bars.push(bar);
            }
        }
        
        // Horizontal bar at top - spans full width
        const topBar = BABYLON.MeshBuilder.CreateCylinder("topBar", {
            height: totalBarWidth + 0.5,
            diameter: barRadius * 2
        }, this.scene);
        topBar.rotation.z = Math.PI / 2;
        topBar.position = new BABYLON.Vector3(0, barHeight, barZ);
        topBar.material = barMat;
        new BABYLON.PhysicsAggregate(topBar, BABYLON.PhysicsShapeType.CYLINDER, { mass: 0 }, this.scene);
        
        // Horizontal bar at bottom
        const bottomBar = topBar.clone("bottomBar");
        bottomBar.position.y = 0.1;
        new BABYLON.PhysicsAggregate(bottomBar, BABYLON.PhysicsShapeType.CYLINDER, { mass: 0 }, this.scene);
        
        // Bar frame posts on each side
        const postMat = new BABYLON.StandardMaterial("postMat", this.scene);
        postMat.diffuseColor = new BABYLON.Color3(0.25, 0.25, 0.28);
        
        [-totalBarWidth / 2 - 0.15, totalBarWidth / 2 + 0.15].forEach((x, idx) => {
            const post = BABYLON.MeshBuilder.CreateBox(`barPost_${idx}`, {
                width: 0.2,
                height: barHeight + 0.2,
                depth: 0.2
            }, this.scene);
            post.position = new BABYLON.Vector3(x, barHeight / 2, barZ);
            post.material = postMat;
            new BABYLON.PhysicsAggregate(post, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        });
    }
    
    createMetalDoor() {
        // Metal security door on SOUTH WALL (right wall at X+)
        const doorWidth = 1.2;
        const doorHeight = 2.5;
        const doorDepth = 0.15;
        const doorX = 3.8;   // On SOUTH/right wall
        const doorZ = -1.0;  // Center of wall depth
        
        // Door frame
        const frameMat = new BABYLON.StandardMaterial("doorFrameMat", this.scene);
        frameMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.22);
        frameMat.specularColor = new BABYLON.Color3(0.4, 0.4, 0.4);
        
        // Top frame - rotated 90° for wall on X axis
        const topFrame = BABYLON.MeshBuilder.CreateBox("doorFrameTop", {
            width: 0.3,
            height: 0.15,
            depth: doorWidth + 0.3
        }, this.scene);
        topFrame.position = new BABYLON.Vector3(doorX, doorHeight + 0.1, doorZ);
        topFrame.material = frameMat;
        
        // Side frames - on Z axis for door on X+ wall
        [-doorWidth/2 - 0.1, doorWidth/2 + 0.1].forEach((offset, i) => {
            const sideFrame = BABYLON.MeshBuilder.CreateBox(`doorFrameSide_${i}`, {
                width: 0.3,
                height: doorHeight + 0.2,
                depth: 0.15
            }, this.scene);
            sideFrame.position = new BABYLON.Vector3(doorX, doorHeight / 2, doorZ + offset);
            sideFrame.material = frameMat;
        });
        
        // ═══════════════════════════════════════════════════════════════════
        // HIGH SECURITY SLIDING DOOR - Thick industrial metal with glowing center strip
        // ═══════════════════════════════════════════════════════════════════
        
        // Create door as two THICK sliding panels
        const panelWidth = doorWidth / 2 - 0.05; // Gap in middle for light strip
        const panelThickness = 0.15; // THICK industrial door
        
        // Main door material - SILVERY SHINY METAL (brushed steel)
        const doorMat = new BABYLON.StandardMaterial("doorMat", this.scene);
        doorMat.diffuseColor = new BABYLON.Color3(0.75, 0.78, 0.82); // Bright silvery metal
        doorMat.specularColor = new BABYLON.Color3(0.9, 0.92, 0.95); // High shine
        doorMat.specularPower = 64; // Very shiny/reflective
        doorMat.metallic = 1.0;
        doorMat.roughness = 0.3; // Slightly brushed finish
        
        // LEFT door panel - rotated for X+ wall (slides on Z axis)
        this.doorLeft = BABYLON.MeshBuilder.CreateBox("securityDoorLeft", {
            width: panelThickness,
            height: doorHeight - 0.1,
            depth: panelWidth
        }, this.scene);
        this.doorLeft.position = new BABYLON.Vector3(doorX, doorHeight / 2, doorZ - panelWidth/2 - 0.03);
        this.doorLeft.material = doorMat;
        
        // RIGHT door panel
        this.doorRight = BABYLON.MeshBuilder.CreateBox("securityDoorRight", {
            width: panelThickness,
            height: doorHeight - 0.1,
            depth: panelWidth
        }, this.scene);
        this.doorRight.position = new BABYLON.Vector3(doorX, doorHeight / 2, doorZ + panelWidth/2 + 0.03);
        this.doorRight.material = doorMat;
        
        // Door edge trim - lighter metal borders
        const trimMat = new BABYLON.StandardMaterial("trimMat", this.scene);
        trimMat.diffuseColor = new BABYLON.Color3(0.5, 0.52, 0.55);
        trimMat.specularColor = new BABYLON.Color3(0.7, 0.7, 0.7);
        
        // Add trim/border to each door panel
        [this.doorLeft, this.doorRight].forEach((doorPanel, idx) => {
            // Inner trim frame
            const isLeft = idx === 0;
            const trimThickness = 0.03;
            
            // Top trim
            const topTrim = BABYLON.MeshBuilder.CreateBox(`doorTopTrim_${idx}`, {
                width: panelWidth - 0.1,
                height: trimThickness,
                depth: panelThickness + 0.02
            }, this.scene);
            topTrim.position = new BABYLON.Vector3(0, (doorHeight - 0.1) / 2 - 0.08, 0);
            topTrim.material = trimMat;
            topTrim.parent = doorPanel;
            
            // Bottom trim
            const bottomTrim = BABYLON.MeshBuilder.CreateBox(`doorBottomTrim_${idx}`, {
                width: panelWidth - 0.1,
                height: trimThickness,
                depth: panelThickness + 0.02
            }, this.scene);
            bottomTrim.position = new BABYLON.Vector3(0, -(doorHeight - 0.1) / 2 + 0.08, 0);
            bottomTrim.material = trimMat;
            bottomTrim.parent = doorPanel;
            
            // Vertical warning stripe (yellow/black hazard)
            const hazardMat = new BABYLON.StandardMaterial(`hazardMat_${idx}`, this.scene);
            hazardMat.diffuseColor = new BABYLON.Color3(0.9, 0.7, 0.1); // Warning yellow
            
            const hazardStripe = BABYLON.MeshBuilder.CreateBox(`hazardStripe_${idx}`, {
                width: 0.08,
                height: doorHeight - 0.3,
                depth: 0.01
            }, this.scene);
            hazardStripe.position = new BABYLON.Vector3(isLeft ? panelWidth/2 - 0.1 : -panelWidth/2 + 0.1, 0, panelThickness/2 + 0.01);
            hazardStripe.material = hazardMat;
            hazardStripe.parent = doorPanel;
        });
        
        // ═══ GLOWING CENTER LIGHT STRIP - BLUE glowing seams ═══
        const glowStripeMat = new BABYLON.StandardMaterial("glowStripeMat", this.scene);
        glowStripeMat.diffuseColor = new BABYLON.Color3(0.2, 0.5, 1); // Bright blue
        glowStripeMat.emissiveColor = new BABYLON.Color3(0, 0.3, 1); // Strong blue glow
        glowStripeMat.specularColor = new BABYLON.Color3(0.5, 0.7, 1);
        this.doorGlowMat = glowStripeMat;
        
        // Glow layer for bloom - ONLY affects door stripes, explicitly excludes Jake!
        if (!this.scene.glowLayer) {
            this.scene.glowLayer = new BABYLON.GlowLayer("doorGlow", this.scene);
            this.scene.glowLayer.intensity = 1.2;
        }
        // WHITELIST approach: Only specific door/LED meshes glow - everything else is excluded
        this.scene.glowLayer.customEmissiveColorSelector = (mesh, subMesh, material, result) => {
            // EXPLICITLY exclude Jake and any player-related meshes
            const meshName = mesh.name ? mesh.name.toLowerCase() : '';
            if (meshName.includes('jake') || meshName.includes('player') || 
                meshName.includes('wolf3d') || meshName.includes('avatar') ||
                meshName.includes('mixamo') || meshName.includes('body') ||
                meshName.includes('head') || meshName.includes('teeth') ||
                meshName.includes('eye') || meshName.includes('skin') ||
                meshName.includes('hair') || meshName.includes('outfit')) {
                result.set(0, 0, 0, 0); // NO glow for character meshes
                return;
            }
            
            // WHITELIST: Only these specific meshes should glow
            if (mesh.name && (mesh.name.includes('Glow') || mesh.name.includes('glow') ||
                mesh.name.includes('LED') || mesh.name.includes('led') ||
                mesh.name === 'centerGlowStrip' || mesh.name === 'glowStripeL' || 
                mesh.name === 'glowStripeR' || mesh.name === 'keycard')) {
                result.set(material.emissiveColor.r, material.emissiveColor.g, material.emissiveColor.b, 1);
            } else {
                result.set(0, 0, 0, 0); // No glow for everything else
            }
        };
        
        this.doorGlowStripes = [];
        
        // CENTER VERTICAL LIGHT STRIP - between the two doors (rotated for X+ wall)
        const centerStrip = BABYLON.MeshBuilder.CreateBox("centerGlowStrip", {
            width: panelThickness + 0.05,
            height: doorHeight - 0.1,
            depth: 0.1
        }, this.scene);
        centerStrip.position = new BABYLON.Vector3(doorX, doorHeight / 2, doorZ);
        centerStrip.material = glowStripeMat;
        this.doorGlowStripes.push(centerStrip);
        
        // Inner edge strips on each door (rotated for X+ wall)
        const stripeL = BABYLON.MeshBuilder.CreateBox("glowStripeL", {
            width: panelThickness + 0.02,
            height: doorHeight - 0.15,
            depth: 0.04
        }, this.scene);
        stripeL.position = new BABYLON.Vector3(0, 0, panelWidth/2 - 0.02);
        stripeL.material = glowStripeMat;
        stripeL.parent = this.doorLeft;
        this.doorGlowStripes.push(stripeL);
        
        const stripeR = BABYLON.MeshBuilder.CreateBox("glowStripeR", {
            width: panelThickness + 0.02,
            height: doorHeight - 0.15,
            depth: 0.04
        }, this.scene);
        stripeR.position = new BABYLON.Vector3(0, 0, -panelWidth/2 + 0.02);
        stripeR.material = glowStripeMat;
        stripeR.parent = this.doorRight;
        this.doorGlowStripes.push(stripeR);
        
        // Add point light at door center for blue glow effect
        const doorGlowLight = new BABYLON.PointLight("doorGlowLight", 
            new BABYLON.Vector3(doorX - 0.3, doorHeight / 2, doorZ), this.scene);
        doorGlowLight.diffuse = new BABYLON.Color3(0.2, 0.5, 1); // Blue light
        doorGlowLight.intensity = 0.6;
        doorGlowLight.range = 4;
        
        // Store original door Z positions for sliding animation (door now slides on Z axis)
        this.doorLeftClosedZ = this.doorLeft.position.z;
        this.doorRightClosedZ = this.doorRight.position.z;
        
        // Store door X positions (used for proximity checking)
        this.doorLeftClosedX = this.doorLeft.position.x;
        this.doorRightClosedX = this.doorRight.position.x;
        
        // Lock status indicator panel (shows red when locked, green when unlocked)
        const lockPanel = BABYLON.MeshBuilder.CreateBox("lockPanel", {
            width: 0.15,
            height: 0.25,
            depth: 0.03
        }, this.scene);
        lockPanel.position = new BABYLON.Vector3(doorX + doorWidth/2 + 0.2, doorHeight - 0.5, doorZ + 0.05);
        
        const lockPanelMat = new BABYLON.StandardMaterial("lockPanelMat", this.scene);
        lockPanelMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.12);
        lockPanel.material = lockPanelMat;
        
        // Lock indicator light
        const lockLight = BABYLON.MeshBuilder.CreateSphere("lockLight", {
            diameter: 0.08
        }, this.scene);
        lockLight.position = new BABYLON.Vector3(doorX + doorWidth/2 + 0.2, doorHeight - 0.45, doorZ + 0.08);
        
        const lockLightMat = new BABYLON.StandardMaterial("lockLightMat", this.scene);
        lockLightMat.diffuseColor = new BABYLON.Color3(1, 0, 0);
        lockLightMat.emissiveColor = new BABYLON.Color3(0.9, 0, 0);
        lockLight.material = lockLightMat;
        
        // ═══════════════════════════════════════════════════════════
        // HIGH-TECH NUMERIC KEYPAD with DISPLAY
        // ═══════════════════════════════════════════════════════════
        
        // Keypad housing - sleek black panel
        const keypadPanel = BABYLON.MeshBuilder.CreateBox("keypadPanel", {
            width: 0.05,
            height: 0.6,
            depth: 0.35
        }, this.scene);
        keypadPanel.position = new BABYLON.Vector3(doorX - 0.15, 1.3, doorZ - doorWidth/2 - 0.3);
        
        const keypadMat = new BABYLON.StandardMaterial("keypadMat", this.scene);
        keypadMat.diffuseColor = new BABYLON.Color3(0.08, 0.08, 0.1); // Dark matte black
        keypadMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.12);
        keypadMat.specularPower = 8;
        keypadPanel.material = keypadMat;
        
        // Digital display screen at top
        const displayScreen = BABYLON.MeshBuilder.CreateBox("keypadDisplay", {
            width: 0.06,
            height: 0.12,
            depth: 0.28
        }, this.scene);
        displayScreen.position = new BABYLON.Vector3(doorX - 0.13, 1.52, doorZ - doorWidth/2 - 0.3);
        
        const displayMat = new BABYLON.StandardMaterial("displayMat", this.scene);
        displayMat.diffuseColor = new BABYLON.Color3(0.05, 0.15, 0.2); // Dark blue-ish screen
        displayMat.emissiveColor = new BABYLON.Color3(0, 0.1, 0.3); // Faint blue glow
        displayMat.specularColor = new BABYLON.Color3(0.2, 0.3, 0.5);
        displayScreen.material = displayMat;
        
        // Display text - "LOCKED"
        const displayText = BABYLON.MeshBuilder.CreatePlane("keypadText", {
            width: 0.25,
            height: 0.1
        }, this.scene);
        displayText.position = new BABYLON.Vector3(doorX - 0.12, 1.52, doorZ - doorWidth/2 - 0.3);
        displayText.rotation.y = Math.PI / 2;
        
        const textMat = new BABYLON.StandardMaterial("keypadTextMat", this.scene);
        textMat.diffuseColor = new BABYLON.Color3(0.2, 0.6, 1); // Bright blue text
        textMat.emissiveColor = new BABYLON.Color3(0.1, 0.4, 0.8); // Glowing text
        textMat.alpha = 0.9;
        displayText.material = textMat;
        
        // Create numeric buttons (3x4 grid: 1-9, 0, *, #)
        const buttonRows = 4;
        const buttonCols = 3;
        const buttonSize = 0.06;
        const buttonSpacing = 0.08;
        const startY = 1.35;
        const startZ = doorZ - doorWidth/2 - 0.42;
        
        const buttonMat = new BABYLON.StandardMaterial("buttonMat", this.scene);
        buttonMat.diffuseColor = new BABYLON.Color3(0.2, 0.22, 0.25); // Dark gray buttons
        buttonMat.specularColor = new BABYLON.Color3(0.4, 0.42, 0.45);
        buttonMat.specularPower = 32;
        
        for (let row = 0; row < buttonRows; row++) {
            for (let col = 0; col < buttonCols; col++) {
                const button = BABYLON.MeshBuilder.CreateBox(`keypadButton_${row}_${col}`, {
                    width: 0.04,
                    height: buttonSize,
                    depth: buttonSize
                }, this.scene);
                
                const yPos = startY - (row * buttonSpacing);
                const zPos = startZ + (col * buttonSpacing);
                button.position = new BABYLON.Vector3(doorX - 0.14, yPos, zPos);
                button.material = buttonMat;
            }
        }
        
        // Add blue accent lights around keypad
        const accentLight1 = BABYLON.MeshBuilder.CreateBox("keypadAccent1", {
            width: 0.02,
            height: 0.58,
            depth: 0.01
        }, this.scene);
        accentLight1.position = new BABYLON.Vector3(doorX - 0.13, 1.3, startZ - 0.01);
        accentLight1.material = glowStripeMat; // Blue glow
        
        const accentLight2 = BABYLON.MeshBuilder.CreateBox("keypadAccent2", {
            width: 0.02,
            height: 0.58,
            depth: 0.01
        }, this.scene);
        accentLight2.position = new BABYLON.Vector3(doorX - 0.13, 1.3, startZ + buttonSpacing * 2 + 0.01);
        accentLight2.material = glowStripeMat; // Blue glow
        
        // Store keypad reference
        this.doorKeypadDisplay = displayText;
        this.doorKeypadDisplayMat = textMat;
        
        // Store door references
        this.doorLockLight = lockLight;
        this.doorLockLightMat = lockLightMat;
        this.doorUnlocked = false;
        this.doorOpened = false;
        
        // Door physics (blocks passage when closed)
        this.doorCollider = BABYLON.MeshBuilder.CreateBox("doorCollider", {
            width: doorWidth + 0.1,
            height: doorHeight,
            depth: 0.5
        }, this.scene);
        this.doorCollider.position = new BABYLON.Vector3(doorX, doorHeight / 2, doorZ);
        this.doorCollider.isVisible = false;
        new BABYLON.PhysicsAggregate(this.doorCollider, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Create hallway beyond door
        this.createDoorHallway(doorX, doorZ);
    }
    
    createDoorHallway(doorX, doorZ) {
        // Hallway leading BEHIND the back wall (negative Z direction)
        const hallWidth = 2;
        const hallLength = 8;
        const hallHeight = 3;
        
        const hallMat = new BABYLON.StandardMaterial("hallMat", this.scene);
        hallMat.diffuseTexture = this.createWallTexture("hallWall", new BABYLON.Color3(0.28, 0.28, 0.30));
        hallMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        
        // Hallway floor (extends back from door)
        const hallFloor = BABYLON.MeshBuilder.CreateBox("hallFloor", {
            width: hallWidth,
            height: 0.2,
            depth: hallLength
        }, this.scene);
        hallFloor.position = new BABYLON.Vector3(doorX, -0.1, doorZ - hallLength/2 - 0.3);
        hallFloor.material = hallMat;
        new BABYLON.PhysicsAggregate(hallFloor, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Hallway ceiling
        const hallCeiling = BABYLON.MeshBuilder.CreateBox("hallCeiling", {
            width: hallWidth,
            height: 0.2,
            depth: hallLength
        }, this.scene);
        hallCeiling.position = new BABYLON.Vector3(doorX, hallHeight, doorZ - hallLength/2 - 0.3);
        hallCeiling.material = hallMat;
        
        // Hallway left wall
        const hallLeftWall = BABYLON.MeshBuilder.CreateBox("hallLeftWall", {
            width: 0.2,
            height: hallHeight,
            depth: hallLength
        }, this.scene);
        hallLeftWall.position = new BABYLON.Vector3(doorX - hallWidth/2 - 0.1, hallHeight/2, doorZ - hallLength/2 - 0.3);
        hallLeftWall.material = hallMat;
        new BABYLON.PhysicsAggregate(hallLeftWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Hallway right wall
        const hallRightWall = BABYLON.MeshBuilder.CreateBox("hallRightWall", {
            width: 0.2,
            height: hallHeight,
            depth: hallLength
        }, this.scene);
        hallRightWall.position = new BABYLON.Vector3(doorX + hallWidth/2 + 0.1, hallHeight/2, doorZ - hallLength/2 - 0.3);
        hallRightWall.material = hallMat;
        new BABYLON.PhysicsAggregate(hallRightWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // End wall
        const hallEndWall = BABYLON.MeshBuilder.CreateBox("hallEndWall", {
            width: hallWidth + 0.4,
            height: hallHeight,
            depth: 0.2
        }, this.scene);
        hallEndWall.position = new BABYLON.Vector3(doorX, hallHeight/2, doorZ - hallLength - 0.3);
        hallEndWall.material = hallMat;
        new BABYLON.PhysicsAggregate(hallEndWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Create elevator at end of hallway
        this.createElevator(doorX, doorZ - hallLength + 1);
        
        // Create hidden stairway (secret panel in armory)
        this.createHiddenStairway();
        
        // Exit marker at end of hallway
        this.doorExitPosition = new BABYLON.Vector3(doorX, 1, doorZ - hallLength + 2);
    }
    
    createElevator(elevX, elevZ) {
        const elevWidth = 2;
        const elevDepth = 2;
        const elevHeight = 3.5;
        
        // Elevator shaft housing
        const shaftMat = new BABYLON.StandardMaterial("shaftMat", this.scene);
        shaftMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.22);
        
        // Back wall of elevator area
        const elevBackWall = BABYLON.MeshBuilder.CreateBox("elevBackWall", {
            width: elevWidth + 0.4,
            height: elevHeight,
            depth: 0.2
        }, this.scene);
        elevBackWall.position = new BABYLON.Vector3(elevX, elevHeight/2, elevZ - elevDepth - 0.5);
        elevBackWall.material = shaftMat;
        new BABYLON.PhysicsAggregate(elevBackWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Side walls
        [-1, 1].forEach((side, i) => {
            const sideWall = BABYLON.MeshBuilder.CreateBox(`elevSideWall_${i}`, {
                width: 0.2,
                height: elevHeight,
                depth: elevDepth + 0.5
            }, this.scene);
            sideWall.position = new BABYLON.Vector3(elevX + side * (elevWidth/2 + 0.1), elevHeight/2, elevZ - elevDepth/2 - 0.25);
            sideWall.material = shaftMat;
            new BABYLON.PhysicsAggregate(sideWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        });
        
        // Elevator floor (platform)
        const elevFloor = BABYLON.MeshBuilder.CreateBox("elevatorFloor", {
            width: elevWidth,
            height: 0.15,
            depth: elevDepth
        }, this.scene);
        elevFloor.position = new BABYLON.Vector3(elevX, 0.075, elevZ - elevDepth/2 - 0.25);
        
        const floorMat = new BABYLON.StandardMaterial("elevFloorMat", this.scene);
        floorMat.diffuseColor = new BABYLON.Color3(0.35, 0.35, 0.38);
        elevFloor.material = floorMat;
        new BABYLON.PhysicsAggregate(elevFloor, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        this.elevatorFloor = elevFloor;
        this.elevatorBaseY = 0.075;
        
        // Elevator doors (double sliding doors)
        const doorMat = new BABYLON.StandardMaterial("elevDoorMat", this.scene);
        doorMat.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.42);
        doorMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        
        const leftDoor = BABYLON.MeshBuilder.CreateBox("elevLeftDoor", {
            width: elevWidth/2 - 0.05,
            height: 2.5,
            depth: 0.08
        }, this.scene);
        leftDoor.position = new BABYLON.Vector3(elevX - elevWidth/4, 1.25, elevZ + 0.2);
        leftDoor.material = doorMat;
        
        const rightDoor = BABYLON.MeshBuilder.CreateBox("elevRightDoor", {
            width: elevWidth/2 - 0.05,
            height: 2.5,
            depth: 0.08
        }, this.scene);
        rightDoor.position = new BABYLON.Vector3(elevX + elevWidth/4, 1.25, elevZ + 0.2);
        rightDoor.material = doorMat;
        
        this.elevatorLeftDoor = leftDoor;
        this.elevatorRightDoor = rightDoor;
        this.elevatorDoorsOpen = false;
        
        // Call button panel
        const buttonPanel = BABYLON.MeshBuilder.CreateBox("elevButtonPanel", {
            width: 0.15,
            height: 0.3,
            depth: 0.05
        }, this.scene);
        buttonPanel.position = new BABYLON.Vector3(elevX + elevWidth/2 + 0.2, 1.2, elevZ + 0.1);
        
        const panelMat = new BABYLON.StandardMaterial("panelMat", this.scene);
        panelMat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.18);
        buttonPanel.material = panelMat;
        
        // Call button (glowing)
        const callButton = BABYLON.MeshBuilder.CreateCylinder("elevCallButton", {
            diameter: 0.06,
            height: 0.02
        }, this.scene);
        callButton.rotation.x = Math.PI/2;
        callButton.position = new BABYLON.Vector3(elevX + elevWidth/2 + 0.23, 1.2, elevZ + 0.1);
        
        const buttonMat = new BABYLON.StandardMaterial("callButtonMat", this.scene);
        buttonMat.diffuseColor = new BABYLON.Color3(0.8, 0.6, 0);
        buttonMat.emissiveColor = new BABYLON.Color3(0.4, 0.3, 0);
        callButton.material = buttonMat;
        
        callButton.metadata = {
            interactable: true,
            type: 'elevator_call',
            name: 'Elevator Call Button'
        };
        
        this.elevatorCallButton = callButton;
        
        // Floor indicator above doors
        const indicator = BABYLON.MeshBuilder.CreatePlane("floorIndicator", {
            width: 0.4,
            height: 0.2
        }, this.scene);
        indicator.position = new BABYLON.Vector3(elevX, 2.9, elevZ + 0.15);
        
        const indicatorTexture = new BABYLON.DynamicTexture("indicatorTex", {width: 128, height: 64}, this.scene, false);
        const indicatorMat = new BABYLON.StandardMaterial("indicatorMat", this.scene);
        indicatorMat.diffuseTexture = indicatorTexture;
        indicatorMat.emissiveTexture = indicatorTexture;
        indicatorMat.emissiveColor = new BABYLON.Color3(0.5, 0.3, 0);
        indicator.material = indicatorMat;
        
        // Draw "1" on indicator
        const ctx = indicatorTexture.getContext();
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 128, 64);
        ctx.fillStyle = '#ffaa00';
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('1', 64, 50);
        indicatorTexture.update();
        
        this.elevatorIndicator = indicatorTexture;
        
        // "ELEVATOR" sign
        const signMat = new BABYLON.StandardMaterial("elevSignMat", this.scene);
        signMat.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.1);
        
        const sign = BABYLON.MeshBuilder.CreatePlane("elevatorSign", {
            width: 1.2,
            height: 0.25
        }, this.scene);
        sign.position = new BABYLON.Vector3(elevX, 3.2, elevZ + 0.12);
        sign.material = signMat;
    }
    
    createHiddenStairway() {
        // Hidden stairway behind a secret panel in the armory (back right corner)
        const stairX = 3;
        const stairZ = 7; // In the armory area
        
        // Secret panel (looks like normal wall but can be opened)
        const panelMat = new BABYLON.StandardMaterial("secretPanelMat", this.scene);
        panelMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.33); // Match armory walls
        
        const secretPanel = BABYLON.MeshBuilder.CreateBox("secretPanel", {
            width: 1.5,
            height: 2.5,
            depth: 0.15
        }, this.scene);
        secretPanel.position = new BABYLON.Vector3(stairX, 1.25, stairZ + 0.5);
        secretPanel.material = panelMat;
        
        // Subtle hint - slightly different seam color
        const seamMat = new BABYLON.StandardMaterial("seamMat", this.scene);
        seamMat.diffuseColor = new BABYLON.Color3(0.25, 0.25, 0.28);
        
        // Vertical seam lines
        [-0.73, 0.73].forEach((offset, i) => {
            const seam = BABYLON.MeshBuilder.CreateBox(`panelSeam_${i}`, {
                width: 0.02,
                height: 2.4,
                depth: 0.16
            }, this.scene);
            seam.position = new BABYLON.Vector3(stairX + offset, 1.25, stairZ + 0.5);
            seam.material = seamMat;
        });
        
        secretPanel.metadata = {
            interactable: true,
            type: 'secret_panel',
            name: 'Wall Panel',
            opened: false
        };
        
        this.secretPanel = secretPanel;
        this.secretPanelOpen = false;
        
        // Stairway behind panel (initially hidden/blocked)
        const stairMat = new BABYLON.StandardMaterial("stairMat", this.scene);
        stairMat.diffuseColor = new BABYLON.Color3(0.35, 0.35, 0.38);
        
        // Create stair steps going up
        const numSteps = 12;
        const stepHeight = 0.25;
        const stepDepth = 0.35;
        
        for (let i = 0; i < numSteps; i++) {
            const step = BABYLON.MeshBuilder.CreateBox(`stair_step_${i}`, {
                width: 1.3,
                height: stepHeight,
                depth: stepDepth
            }, this.scene);
            step.position = new BABYLON.Vector3(
                stairX,
                stepHeight/2 + i * stepHeight,
                stairZ + 1 + i * stepDepth
            );
            step.material = stairMat;
            step.isVisible = false; // Hidden until panel opens
            
            // Add physics only when visible
            step.metadata = { stairStep: true, index: i };
        }
        
        this.stairSteps = this.scene.meshes.filter(m => m.metadata && m.metadata.stairStep);
        
        // Stairway walls
        const stairWallMat = new BABYLON.StandardMaterial("stairWallMat", this.scene);
        stairWallMat.diffuseColor = new BABYLON.Color3(0.28, 0.28, 0.3);
        
        // Left stair wall
        const leftStairWall = BABYLON.MeshBuilder.CreateBox("leftStairWall", {
            width: 0.15,
            height: 4,
            depth: numSteps * stepDepth + 1
        }, this.scene);
        leftStairWall.position = new BABYLON.Vector3(stairX - 0.8, 2, stairZ + 1 + (numSteps * stepDepth)/2);
        leftStairWall.material = stairWallMat;
        leftStairWall.isVisible = false;
        
        // Right stair wall
        const rightStairWall = leftStairWall.clone("rightStairWall");
        rightStairWall.position.x = stairX + 0.8;
        
        this.stairWalls = [leftStairWall, rightStairWall];
        
        // Level 2 marker at top of stairs
        this.level2StairEntry = new BABYLON.Vector3(stairX, numSteps * stepHeight + 0.5, stairZ + 1 + numSteps * stepDepth);
    }
    
    openSecretPanel() {
        if (this.secretPanelOpen) return;
        this.secretPanelOpen = true;
        
        // Animate panel sliding to the side
        const slideAnim = new BABYLON.Animation(
            "panelSlide", "position.x", 30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        const startX = this.secretPanel.position.x;
        slideAnim.setKeys([
            { frame: 0, value: startX },
            { frame: 45, value: startX + 1.6 }
        ]);
        
        const easing = new BABYLON.QuadraticEase();
        easing.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEOUT);
        slideAnim.setEasingFunction(easing);
        
        this.secretPanel.animations = [slideAnim];
        this.scene.beginAnimation(this.secretPanel, 0, 45, false);
        
        // Show stairway
        setTimeout(() => {
            this.stairSteps.forEach(step => {
                step.isVisible = true;
                new BABYLON.PhysicsAggregate(step, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
            });
            this.stairWalls.forEach(wall => wall.isVisible = true);
        }, 500);
        
        // Jake notices
        this.speak("A hidden stairway! This must be an emergency exit.");
    }
    
    // Open Cell 4's secret panel (underground passage)
    openCell4SecretPanel() {
        if (this.cell4SecretPanelOpen) return;
        this.cell4SecretPanelOpen = true;
        
        // Animate panel sliding down into floor
        const slideAnim = new BABYLON.Animation(
            "cell4PanelSlide", "position.y", 30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        const startY = this.cell4SecretPanel.position.y;
        slideAnim.setKeys([
            { frame: 0, value: startY },
            { frame: 60, value: startY - 2.5 }
        ]);
        
        const easing = new BABYLON.QuadraticEase();
        easing.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEOUT);
        slideAnim.setEasingFunction(easing);
        
        this.cell4SecretPanel.animations = [slideAnim];
        this.scene.beginAnimation(this.cell4SecretPanel, 0, 60, false);
        
        // Rumble sound effect
        this.playRumbleSound();
        
        // Show underground passage elements
        setTimeout(() => {
            // Show secret stairs
            if (this.secretStairSteps) {
                this.secretStairSteps.forEach(step => {
                    step.isVisible = true;
                    new BABYLON.PhysicsAggregate(step, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
                });
            }
            if (this.secretStairWalls) {
                this.secretStairWalls.forEach(wall => wall.isVisible = true);
            }
            
            // Show passage meshes
            if (this.passageMeshes) {
                this.passageMeshes.forEach(mesh => mesh.isVisible = true);
            }
            
            // Show cave-in rocks
            if (this.caveInRocks) {
                this.caveInRocks.forEach(rock => rock.isVisible = true);
            }
        }, 1000);
        
        // Jake reacts
        this.speak("There's a hidden passage here! Looks like it goes underground...");
    }
    
    playRumbleSound() {
        if (!this.audioContext) return;
        
        // Deep rumble
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(40, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(20, this.audioContext.currentTime + 1.5);
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 2);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 2);
    }
    
    // Keycard pickup
    pickupKeycard() {
        if (this.hasKeycard) return;
        this.hasKeycard = true;
        
        // Hide keycard
        if (this.keycardPickup) {
            this.keycardPickup.isVisible = false;
            this.keycardPickup.setEnabled(false);
        }
        
        // Play pickup sound
        this.playPickupSound();
        
        // UI notification
        this.showNotification("Acquired: Security Keycard");
        
        // Jake comment
        this.speak("Got it! This should open the elevator.");
    }
    
    playPickupSound() {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }
    
    showNotification(text) {
        let notif = document.getElementById('gameNotification');
        if (!notif) {
            notif = document.createElement('div');
            notif.id = 'gameNotification';
            notif.style.cssText = `
                position: fixed;
                top: 20%;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 50, 100, 0.9);
                color: #4af;
                padding: 15px 30px;
                border-radius: 8px;
                font-family: Arial, sans-serif;
                font-size: 18px;
                z-index: 150;
                border: 1px solid #4af;
                transition: opacity 0.3s;
            `;
            document.body.appendChild(notif);
        }
        
        notif.textContent = text;
        notif.style.opacity = '1';
        notif.style.display = 'block';
        
        setTimeout(() => {
            notif.style.opacity = '0';
            setTimeout(() => notif.style.display = 'none', 300);
        }, 2500);
    }
    
    // Use keycard reader to unlock elevator
    useKeycardReader() {
        if (!this.hasKeycard) {
            this.speak("I need a keycard to use this.");
            return;
        }
        
        if (!this.elevatorLocked) return; // Already unlocked
        
        this.elevatorLocked = false;
        
        // Change light to green
        if (this.keycardReaderLightMat) {
            this.keycardReaderLightMat.emissiveColor = new BABYLON.Color3(0.1, 0.8, 0.1);
        }
        
        // Beep sound
        this.playKeycardBeep();
        
        // Open elevator doors
        this.openNewElevatorDoors();
        
        // Jake comment
        this.speak("Access granted. The elevator is ready.");
    }
    
    playKeycardBeep() {
        if (!this.audioContext) return;
        
        // Two-tone beep
        [0, 0.15].forEach((delay, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'square';
            osc.frequency.value = i === 0 ? 800 : 1000;
            
            gain.gain.setValueAtTime(0.15, this.audioContext.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + delay + 0.1);
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.start(this.audioContext.currentTime + delay);
            osc.stop(this.audioContext.currentTime + delay + 0.1);
        });
    }
    
    openNewElevatorDoors() {
        if (!this.elevatorDoorLeft || !this.elevatorDoorRight) return;
        
        // Slide doors open
        const leftAnim = new BABYLON.Animation(
            "newLeftDoorOpen", "position.x", 30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        leftAnim.setKeys([
            { frame: 0, value: this.elevatorDoorLeft.position.x },
            { frame: 30, value: this.elevatorDoorLeft.position.x - 1.1 }
        ]);
        
        const rightAnim = new BABYLON.Animation(
            "newRightDoorOpen", "position.x", 30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        rightAnim.setKeys([
            { frame: 0, value: this.elevatorDoorRight.position.x },
            { frame: 30, value: this.elevatorDoorRight.position.x + 1.1 }
        ]);
        
        this.elevatorDoorLeft.animations = [leftAnim];
        this.elevatorDoorRight.animations = [rightAnim];
        
        this.scene.beginAnimation(this.elevatorDoorLeft, 0, 30, false);
        this.scene.beginAnimation(this.elevatorDoorRight, 0, 30, false);
        
        // Play door sound
        this.playDoorSound();
    }
    
    playDoorSound() {
        if (!this.audioContext) return;
        
        // Mechanical door sound
        const noise = this.audioContext.createOscillator();
        const filter = this.audioContext.createBiquadFilter();
        const gain = this.audioContext.createGain();
        
        noise.type = 'sawtooth';
        noise.frequency.value = 80;
        
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        
        gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioContext.destination);
        
        noise.start();
        noise.stop(this.audioContext.currentTime + 1);
    }
    
    callElevator() {
        if (this.elevatorMoving) return;
        
        // Open elevator doors
        this.openElevatorDoors();
    }
    
    openElevatorDoors() {
        if (this.elevatorDoorsOpen) return;
        this.elevatorDoorsOpen = true;
        
        // Slide doors open
        const leftAnim = new BABYLON.Animation(
            "leftDoorOpen", "position.x", 30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        leftAnim.setKeys([
            { frame: 0, value: this.elevatorLeftDoor.position.x },
            { frame: 30, value: this.elevatorLeftDoor.position.x - 0.5 }
        ]);
        
        const rightAnim = new BABYLON.Animation(
            "rightDoorOpen", "position.x", 30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        rightAnim.setKeys([
            { frame: 0, value: this.elevatorRightDoor.position.x },
            { frame: 30, value: this.elevatorRightDoor.position.x + 0.5 }
        ]);
        
        this.elevatorLeftDoor.animations = [leftAnim];
        this.elevatorRightDoor.animations = [rightAnim];
        
        this.scene.beginAnimation(this.elevatorLeftDoor, 0, 30, false);
        this.scene.beginAnimation(this.elevatorRightDoor, 0, 30, false);
    }
    
    useElevator() {
        // Called when player steps into elevator and presses up
        if (this.elevatorMoving) return;
        this.elevatorMoving = true;
        
        // Close doors first
        this.closeElevatorDoors();
        
        setTimeout(() => {
            // Update indicator to "2"
            const ctx = this.elevatorIndicator.getContext();
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 128, 64);
            ctx.fillStyle = '#ffaa00';
            ctx.font = 'bold 48px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('2', 64, 50);
            this.elevatorIndicator.update();
            
            // Trigger level transition
            setTimeout(() => {
                this.game.loadLevel(2);
            }, 2000);
        }, 1500);
    }
    
    closeElevatorDoors() {
        if (!this.elevatorDoorsOpen) return;
        
        const leftAnim = new BABYLON.Animation(
            "leftDoorClose", "position.x", 30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        leftAnim.setKeys([
            { frame: 0, value: this.elevatorLeftDoor.position.x },
            { frame: 30, value: this.elevatorLeftDoor.position.x + 0.5 }
        ]);
        
        const rightAnim = new BABYLON.Animation(
            "rightDoorClose", "position.x", 30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        rightAnim.setKeys([
            { frame: 0, value: this.elevatorRightDoor.position.x },
            { frame: 30, value: this.elevatorRightDoor.position.x - 0.5 }
        ]);
        
        this.elevatorLeftDoor.animations = [leftAnim];
        this.elevatorRightDoor.animations = [rightAnim];
        
        this.scene.beginAnimation(this.elevatorLeftDoor, 0, 30, false);
        this.scene.beginAnimation(this.elevatorRightDoor, 0, 30, false);
        
        this.elevatorDoorsOpen = false;
    }
    
    unlockDoor() {
        if (this.doorUnlocked) return;
        
        this.doorUnlocked = true;
        this.doorOpen = false; // Track if door is actually open
        
        // Change lock light to green
        this.doorLockLightMat.diffuseColor = new BABYLON.Color3(0, 1, 0);
        this.doorLockLightMat.emissiveColor = new BABYLON.Color3(0, 0.8, 0);
        
        // Door will open when player approaches - enable proximity trigger
        this.doorProximityEnabled = true;
        
        // Update objective to indicate door is ready
        document.getElementById('objectiveDisplay').textContent = 
            "Door unlocked! Approach to open.";
            
        console.log('Door unlocked - approach to open');
    }
    
    openDoor() {
        if (this.doorOpened || !this.doorUnlocked) return;
        this.doorOpened = true;
        
        console.log('Opening security door...');
        
        // Play door sound
        if (this.game.soundSystem) {
            this.game.soundSystem.play('door');
        }
        
        // Change glow stripes to green (door opening)
        if (this.doorGlowMat) {
            this.doorGlowMat.diffuseColor = new BABYLON.Color3(0, 1, 0.3);
            this.doorGlowMat.emissiveColor = new BABYLON.Color3(0, 0.8, 0.2);
        }
        
        // Animate LEFT door sliding on Z axis (toward -Z)
        if (this.doorLeft) {
            const leftAnim = new BABYLON.Animation(
                "doorLeftOpen", "position.z", 30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            
            const startZ = this.doorLeftClosedZ;
            leftAnim.setKeys([
                { frame: 0, value: startZ },
                { frame: 45, value: startZ - 0.7 } // Slide into wall
            ]);
            
            const easing = new BABYLON.QuadraticEase();
            easing.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEOUT);
            leftAnim.setEasingFunction(easing);
            
            this.doorLeft.animations = [leftAnim];
            this.scene.beginAnimation(this.doorLeft, 0, 45, false);
        }
        
        // Animate RIGHT door sliding on Z axis (toward +Z)
        if (this.doorRight) {
            const rightAnim = new BABYLON.Animation(
                "doorRightOpen", "position.z", 30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            
            const startZ = this.doorRightClosedZ;
            rightAnim.setKeys([
                { frame: 0, value: startZ },
                { frame: 45, value: startZ + 0.7 } // Slide into wall
            ]);
            
            const easing = new BABYLON.QuadraticEase();
            easing.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEOUT);
            rightAnim.setEasingFunction(easing);
            
            this.doorRight.animations = [rightAnim];
            this.scene.beginAnimation(this.doorRight, 0, 45, false);
        }
        
        // Disable door collider after animation starts
        setTimeout(() => {
            if (this.doorCollider) {
                this.doorCollider.setEnabled(false);
            }
        }, 300);
        
        // Unlock the exit (show arrow, update objective)
        this.unlockExit();
    }
    
    createCellBlock() {
        // Create the ARMORY beyond the bars - guns and powerups!
        const roomWidth = 8;
        const roomLength = 6;
        const roomHeight = 3.5;
        const roomZ = 2.5 + roomLength / 2;
        
        // Armory floor
        const armoryFloor = BABYLON.MeshBuilder.CreateBox("armoryFloor", {
            width: roomWidth,
            height: 0.3,
            depth: roomLength
        }, this.scene);
        armoryFloor.position = new BABYLON.Vector3(0, -0.15, roomZ);
        
        // Use textured floor material
        const armoryFloorMat = new BABYLON.StandardMaterial("armoryFloorMat", this.scene);
        armoryFloorMat.diffuseTexture = this.createWallTexture("armoryFloor", new BABYLON.Color3(0.18, 0.18, 0.2), true);
        armoryFloorMat.diffuseTexture.uScale = 2;
        armoryFloorMat.diffuseTexture.vScale = 2;
        armoryFloorMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        armoryFloor.material = armoryFloorMat;
        armoryFloor.receiveShadows = true;
        new BABYLON.PhysicsAggregate(armoryFloor, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Armory walls - use textured material
        const armoryWallMat = new BABYLON.StandardMaterial("armoryWallMat", this.scene);
        armoryWallMat.diffuseTexture = this.createWallTexture("armoryWall", new BABYLON.Color3(0.28, 0.28, 0.30));
        armoryWallMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        
        // Back wall
        const backWall = BABYLON.MeshBuilder.CreateBox("armoryBackWall", {
            width: roomWidth,
            height: roomHeight,
            depth: 0.3
        }, this.scene);
        backWall.position = new BABYLON.Vector3(0, roomHeight / 2, 2.5 + roomLength);
        backWall.material = armoryWallMat;
        new BABYLON.PhysicsAggregate(backWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Left wall
        const leftWall = BABYLON.MeshBuilder.CreateBox("armoryLeftWall", {
            width: 0.3,
            height: roomHeight,
            depth: roomLength
        }, this.scene);
        leftWall.position = new BABYLON.Vector3(-roomWidth / 2, roomHeight / 2, roomZ);
        leftWall.material = armoryWallMat;
        new BABYLON.PhysicsAggregate(leftWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Right wall
        const rightWall = BABYLON.MeshBuilder.CreateBox("armoryRightWall", {
            width: 0.3,
            height: roomHeight,
            depth: roomLength
        }, this.scene);
        rightWall.position = new BABYLON.Vector3(roomWidth / 2, roomHeight / 2, roomZ);
        rightWall.material = armoryWallMat;
        new BABYLON.PhysicsAggregate(rightWall, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Ceiling
        const ceiling = BABYLON.MeshBuilder.CreateBox("armoryCeiling", {
            width: roomWidth,
            height: 0.2,
            depth: roomLength
        }, this.scene);
        ceiling.position = new BABYLON.Vector3(0, roomHeight, roomZ);
        ceiling.material = armoryWallMat;
        
        // Create weapon racks and powerups
        this.createArmoryContents(roomZ);
        
        // Invisible boundary walls
        this.createBoundaries();
    }
    
    createArmoryContents(roomZ) {
        // Weapon rack on back wall
        const rackMat = new BABYLON.StandardMaterial("rackMat", this.scene);
        rackMat.diffuseColor = new BABYLON.Color3(0.25, 0.25, 0.28);
        
        const weaponRack = BABYLON.MeshBuilder.CreateBox("weaponRack", {
            width: 3,
            height: 2,
            depth: 0.15
        }, this.scene);
        weaponRack.position = new BABYLON.Vector3(0, 1.5, roomZ + 2.7);
        weaponRack.material = rackMat;
        
        // Pistol on rack (glowing pickup)
        const pistol = this.createWeaponPickup('pistol', new BABYLON.Vector3(-0.8, 1.5, roomZ + 2.5));
        
        // Rifle on rack
        const rifle = this.createWeaponPickup('rifle', new BABYLON.Vector3(0.8, 1.5, roomZ + 2.5));
        
        // Ammo crates
        const crateMat = new BABYLON.StandardMaterial("crateMat", this.scene);
        crateMat.diffuseColor = new BABYLON.Color3(0.3, 0.25, 0.15);
        
        [-2, 2].forEach((x, i) => {
            const crate = BABYLON.MeshBuilder.CreateBox(`ammoCrate_${i}`, {
                width: 0.8,
                height: 0.5,
                depth: 0.6
            }, this.scene);
            crate.position = new BABYLON.Vector3(x, 0.25, roomZ + 1);
            crate.material = crateMat;
            
            // Ammo pickup on top
            this.createPowerupPickup('ammo', new BABYLON.Vector3(x, 0.7, roomZ + 1));
        });
        
        // Health kit on shelf
        const shelf = BABYLON.MeshBuilder.CreateBox("shelf", {
            width: 1.5,
            height: 0.08,
            depth: 0.4
        }, this.scene);
        shelf.position = new BABYLON.Vector3(-3, 1.2, roomZ + 2.5);
        shelf.material = rackMat;
        
        this.createPowerupPickup('health', new BABYLON.Vector3(-3, 1.4, roomZ + 2.5));
        
        // Armor vest on stand
        this.createPowerupPickup('armor', new BABYLON.Vector3(3, 0.8, roomZ + 2));
        
        // "ARMORY" sign above entrance (visible from cell)
        const signMat = new BABYLON.StandardMaterial("signMat", this.scene);
        signMat.diffuseColor = new BABYLON.Color3(0.8, 0.1, 0.1);
        signMat.emissiveColor = new BABYLON.Color3(0.4, 0.05, 0.05);
        
        const sign = BABYLON.MeshBuilder.CreateBox("armorySign", {
            width: 2,
            height: 0.4,
            depth: 0.05
        }, this.scene);
        sign.position = new BABYLON.Vector3(0, 3.2, 2.6);
        sign.material = signMat;
    }
    
    createWeaponPickup(type, position) {
        let mesh;
        const glowColor = new BABYLON.Color3(0.2, 0.5, 1); // Blue glow for weapons
        
        if (type === 'pistol') {
            // Simple pistol shape
            mesh = BABYLON.MeshBuilder.CreateBox("pistol_pickup", {
                width: 0.25,
                height: 0.18,
                depth: 0.08
            }, this.scene);
            
            const barrel = BABYLON.MeshBuilder.CreateBox("pistol_barrel", {
                width: 0.15,
                height: 0.06,
                depth: 0.06
            }, this.scene);
            barrel.position = new BABYLON.Vector3(0.15, 0.02, 0);
            barrel.parent = mesh;
        } else if (type === 'rifle') {
            // Simple rifle shape
            mesh = BABYLON.MeshBuilder.CreateBox("rifle_pickup", {
                width: 0.8,
                height: 0.12,
                depth: 0.08
            }, this.scene);
            
            const stock = BABYLON.MeshBuilder.CreateBox("rifle_stock", {
                width: 0.25,
                height: 0.15,
                depth: 0.06
            }, this.scene);
            stock.position = new BABYLON.Vector3(-0.4, -0.05, 0);
            stock.parent = mesh;
        }
        
        mesh.position = position;
        
        const weaponMat = new BABYLON.StandardMaterial(`${type}Mat`, this.scene);
        weaponMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.22);
        weaponMat.emissiveColor = glowColor.scale(0.3);
        mesh.material = weaponMat;
        
        // Make it interactable
        mesh.metadata = {
            interactable: true,
            type: 'weapon',
            weaponType: type,
            name: type === 'pistol' ? 'Pistol' : 'Assault Rifle'
        };
        
        // Floating/rotating animation
        this.addPickupAnimation(mesh);
        
        return mesh;
    }
    
    createPowerupPickup(type, position) {
        let mesh;
        let glowColor;
        let name;
        
        switch (type) {
            case 'health':
                mesh = BABYLON.MeshBuilder.CreateBox("health_pickup", {
                    width: 0.3,
                    height: 0.25,
                    depth: 0.15
                }, this.scene);
                glowColor = new BABYLON.Color3(0, 1, 0); // Green
                name = 'Health Kit';
                break;
                
            case 'armor':
                mesh = BABYLON.MeshBuilder.CreateCylinder("armor_pickup", {
                    height: 0.5,
                    diameter: 0.4
                }, this.scene);
                glowColor = new BABYLON.Color3(0.2, 0.4, 1); // Blue
                name = 'Body Armor';
                break;
                
            case 'ammo':
                mesh = BABYLON.MeshBuilder.CreateBox("ammo_pickup", {
                    width: 0.2,
                    height: 0.15,
                    depth: 0.12
                }, this.scene);
                glowColor = new BABYLON.Color3(1, 0.8, 0); // Yellow/orange
                name = 'Ammo Box';
                break;
        }
        
        mesh.position = position;
        
        const powerupMat = new BABYLON.StandardMaterial(`${type}Mat`, this.scene);
        powerupMat.diffuseColor = glowColor.scale(0.5);
        powerupMat.emissiveColor = glowColor.scale(0.4);
        mesh.material = powerupMat;
        
        mesh.metadata = {
            interactable: true,
            type: 'powerup',
            powerupType: type,
            name: name
        };
        
        this.addPickupAnimation(mesh);
        
        return mesh;
    }
    
    addPickupAnimation(mesh) {
        // Gentle floating animation
        const floatAnim = new BABYLON.Animation(
            "float", "position.y", 30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const baseY = mesh.position.y;
        floatAnim.setKeys([
            { frame: 0, value: baseY },
            { frame: 30, value: baseY + 0.1 },
            { frame: 60, value: baseY }
        ]);
        
        // Slow rotation
        const rotateAnim = new BABYLON.Animation(
            "rotate", "rotation.y", 30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        rotateAnim.setKeys([
            { frame: 0, value: 0 },
            { frame: 120, value: Math.PI * 2 }
        ]);
        
        mesh.animations = [floatAnim, rotateAnim];
        this.scene.beginAnimation(mesh, 0, 120, true);
    }
    
    createBoundaries() {
        // Invisible walls around the entire play area
        const boundaryHeight = 10;
        
        // Left boundary
        const leftBound = BABYLON.MeshBuilder.CreateBox("leftBoundary", {
            width: 0.5,
            height: boundaryHeight,
            depth: 30
        }, this.scene);
        leftBound.position = new BABYLON.Vector3(-6, boundaryHeight / 2, 5);
        leftBound.isVisible = false;
        new BABYLON.PhysicsAggregate(leftBound, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Right boundary
        const rightBound = BABYLON.MeshBuilder.CreateBox("rightBoundary", {
            width: 0.5,
            height: boundaryHeight,
            depth: 30
        }, this.scene);
        rightBound.position = new BABYLON.Vector3(6, boundaryHeight / 2, 5);
        rightBound.isVisible = false;
        new BABYLON.PhysicsAggregate(rightBound, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Back boundary (behind cell)
        const backBound = BABYLON.MeshBuilder.CreateBox("backBoundary", {
            width: 14,
            height: boundaryHeight,
            depth: 0.5
        }, this.scene);
        backBound.position = new BABYLON.Vector3(0, boundaryHeight / 2, -5);
        backBound.isVisible = false;
        new BABYLON.PhysicsAggregate(backBound, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        
        // Floor extension to catch falls
        const floorExtend = BABYLON.MeshBuilder.CreateBox("floorExtend", {
            width: 20,
            height: 0.5,
            depth: 30
        }, this.scene);
        floorExtend.position = new BABYLON.Vector3(0, -1, 5);
        floorExtend.isVisible = false;
        new BABYLON.PhysicsAggregate(floorExtend, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, this.scene);
    }
    
    createLighting() {
        // ========================================================
        // OPTIMIZED LIGHTING - HemisphericLight + 4 strategic PointLights
        // WebGL limit is ~8 lights, we use 5 total for safety
        // ========================================================
        
        // GLOBAL AMBIENT - HemisphericLight provides base illumination everywhere
        // This replaces many individual room lights!
        const ambient = new BABYLON.HemisphericLight("levelAmbient", new BABYLON.Vector3(0, 1, 0), this.scene);
        ambient.intensity = 0.6;
        ambient.diffuse = new BABYLON.Color3(0.8, 0.8, 0.9);     // Slight blue tint (cool fluorescent)
        ambient.groundColor = new BABYLON.Color3(0.3, 0.25, 0.2); // Warm floor bounce
        ambient.specular = new BABYLON.Color3(0.2, 0.2, 0.2);
        
        // POINT LIGHT 1: Jake's cell - warm dim light
        const cellLight = new BABYLON.PointLight("cellLight", new BABYLON.Vector3(0, 3, 0), this.scene);
        cellLight.intensity = 0.6;
        cellLight.diffuse = new BABYLON.Color3(0.9, 0.8, 0.6);
        cellLight.range = 12;
        
        // POINT LIGHT 2: Emergency red light with pulse
        const redLight = new BABYLON.PointLight("redLight", new BABYLON.Vector3(2, 3.5, 2), this.scene);
        redLight.intensity = 0.4;
        redLight.diffuse = new BABYLON.Color3(1, 0.1, 0.1);
        redLight.range = 8;
        
        // Animate red light pulsing
        const pulseAnim = new BABYLON.Animation(
            "pulse",
            "intensity",
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        pulseAnim.setKeys([
            { frame: 0, value: 0.3 },
            { frame: 30, value: 0.6 },
            { frame: 60, value: 0.3 }
        ]);
        redLight.animations.push(pulseAnim);
        this.scene.beginAnimation(redLight, 0, 60, true);
    }
    
    createCorridorLights() {
        // Flickering fluorescent light
        const corridorLight = new BABYLON.PointLight(
            "corridorLight",
            new BABYLON.Vector3(0, 3.5, 4.5),
            this.scene
        );
        corridorLight.intensity = 0.8;
        corridorLight.diffuse = new BABYLON.Color3(0.9, 0.95, 1);
        corridorLight.range = 10;
        
        // Flicker effect
        let flickerTimer = 0;
        this.scene.onBeforeRenderObservable.add(() => {
            flickerTimer += this.scene.getEngine().getDeltaTime();
            if (Math.random() < 0.02) {
                corridorLight.intensity = Math.random() * 0.5 + 0.3;
            } else {
                corridorLight.intensity = BABYLON.Scalar.Lerp(corridorLight.intensity, 0.8, 0.1);
            }
        });
    }
    
    createExitTrigger() {
        // Invisible trigger at the END of the door hallway (not through bars)
        const exitTrigger = BABYLON.MeshBuilder.CreateBox("exitTrigger", {
            width: 2,
            height: 3,
            depth: 1
        }, this.scene);
        // Position at end of door hallway
        exitTrigger.position = new BABYLON.Vector3(-5.3, 1.5, -5);
        exitTrigger.isVisible = false;
        
        exitTrigger.metadata = {
            trigger: true,
            type: 'levelExit'
        };
        
        // Arrow indicator pointing to door (shown after door unlocked)
        const arrow = BABYLON.MeshBuilder.CreateBox("exitArrow", {
            width: 0.8,
            height: 0.15,
            depth: 0.4
        }, this.scene);
        arrow.position = new BABYLON.Vector3(-3.8, 2.2, 0.5);
        arrow.rotation.y = -Math.PI / 2; // Point toward door
        
        const arrowMat = new BABYLON.StandardMaterial("arrowMat", this.scene);
        arrowMat.diffuseColor = new BABYLON.Color3(0, 1, 0);
        arrowMat.emissiveColor = new BABYLON.Color3(0, 0.5, 0);
        arrow.material = arrowMat;
        arrow.isVisible = false;
        
        this.exitArrow = arrow;
    }
    
    checkBarsComplete() {
        // Bars no longer unlock exit - just visual feedback
        let bentCount = 0;
        
        for (const bar of this.bars) {
            if (bar.metadata && bar.metadata.bent) {
                bentCount++;
            }
        }
        
        this.barsBent = bentCount;
        
        // Update objective - but bars don't unlock door
        if (bentCount >= 3) {
            document.getElementById('objectiveDisplay').textContent = 
                "Bars bent! Use the terminal to unlock the door.";
        }
        document.getElementById('objectiveDisplay').textContent = 
            "Use the terminal to unlock the door.";
    }
    
    unlockExit() {
        // Called when door is unlocked via terminal code
        if (this.exitUnlocked) return;
        
        this.exitUnlocked = true;
        
        // Show exit arrow pointing to door
        if (this.exitArrow) {
            this.exitArrow.isVisible = true;
            
            // Animate arrow bobbing
            const bobAnim = new BABYLON.Animation(
                "bob",
                "position.y",
                30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );
            bobAnim.setKeys([
                { frame: 0, value: 2.2 },
                { frame: 30, value: 2.5 },
                { frame: 60, value: 2.2 }
            ]);
            this.exitArrow.animations.push(bobAnim);
            this.scene.beginAnimation(this.exitArrow, 0, 60, true);
        }
        
        // Update objective
        document.getElementById('objectiveDisplay').textContent = 
            "Objective: Escape through the door!";
    }
    
    update(deltaTime) {
        const player = this.game.player;
        if (!player) return;
        
        // Check death plane (fell too far)
        if (player.mesh.position.y < -10) {
            this.respawnPlayer();
        }
        
        // Check door proximity - open when player approaches unlocked door
        if (this.doorProximityEnabled && !this.doorOpened && this.doorLeft) {
            // Door center position (between left and right panels)
            const doorPos = new BABYLON.Vector3(
                (this.doorLeftClosedX + this.doorRightClosedX) / 2,
                0,
                this.doorLeft.position.z
            );
            const playerPos = player.mesh.position;
            const distToDoor = Math.sqrt(
                Math.pow(playerPos.x - doorPos.x, 2) +
                Math.pow(playerPos.z - doorPos.z, 2)
            );
            
            // Open door when player is within 2.5 units
            if (distToDoor < 2.5) {
                this.openDoor();
            }
        }
        
        // Check if player reached exit
        if (this.exitUnlocked) {
            if (player.mesh.position.z > 10) {
                // Load Level 2
                this.game.loadLevel(2);
            }
        }
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
        // Clean up level-specific meshes if needed
    }
}
