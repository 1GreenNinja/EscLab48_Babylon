/* ============================================================================
   ESCAPE LAB 48 - BABYLON.JS EDITION
   Game Constants
   ============================================================================ */

const GAME = {
    // Player Stats
    PLAYER: {
        HEALTH: 2500,
        SPEED: 8,
        SPRINT_MULTIPLIER: 1.8,
        JUMP_FORCE: 12,
        HEIGHT: 1.8,        // meters
        RADIUS: 0.4,        // collision capsule radius
        STRENGTH: 400,      // 400% strength!
        STRENGTH_MAX: 400
    },
    
    // Physics
    PHYSICS: {
        GRAVITY: -20,
        FRICTION: 0.8,
        RESTITUTION: 0.1
    },
    
    // Camera
    CAMERA: {
        SENSITIVITY: 0.002,
        MIN_PITCH: -1.2,
        MAX_PITCH: 1.2,
        FOV: 75,
        NEAR: 0.1,
        FAR: 1000,
        SHOULDER_OFFSET: 0.5,
        DISTANCE: 3
    },
    
    // Combat
    COMBAT: {
        PUNCH_DAMAGE: 80,
        PUNCH_RANGE: 2.5,
        KICK_DAMAGE: 120,
        KICK_RANGE: 3
    },
    
    // Levels
    LEVELS: {
        1: {
            name: "Security Cell",
            description: "Break out by bending the bars",
            theme: "prison",
            objectives: ["Bend the cell bars", "Escape the cell block"]
        },
        2: {
            name: "Rescue Mission", 
            description: "Find and rescue the three women",
            theme: "facility",
            objectives: ["Find Sarah", "Find Dr. Chen", "Find Emma", "Reach the exit"]
        }
    },
    
    // NPCs to rescue
    RESCUE_NPCS: {
        sarah: {
            name: "Sarah",
            color: "#ff69b4",
            dialogue: "Jake! I knew you'd come for me!"
        },
        chen: {
            name: "Dr. Chen", 
            color: "#00bfff",
            dialogue: "Thank goodness! We need to get out of here!"
        },
        emma: {
            name: "Emma",
            color: "#9370db", 
            dialogue: "You're a hero! Let's go!"
        }
    },
    
    // Bar bending mechanics
    BAR_BENDING: {
        REQUIRED_HOLDS: 3,        // Number of E presses to bend
        HOLD_DURATION: 1.5,       // Seconds per hold
        BEND_ANGLE: Math.PI / 3,  // 60 degrees
        STRENGTH_COST: 25         // Strength used per bar
    }
};
