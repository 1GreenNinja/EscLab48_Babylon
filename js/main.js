/* ============================================================================
   ESCAPE LAB 48 - BABYLON.JS EDITION
   Main Entry Point
   ============================================================================ */

// Wait for DOM and all scripts to load
window.addEventListener('DOMContentLoaded', async () => {
    console.log('=================================');
    console.log('  ESCAPE LAB 48 - Babylon.js Edition');
    console.log('  Starting up...');
    console.log('=================================');
    
    // Check for WebGL support
    if (!BABYLON.Engine.isSupported()) {
        alert('WebGL is not supported in your browser. Please use a modern browser like Chrome, Firefox, or Edge.');
        return;
    }
    
    // Create and initialize game
    game = new GameEngine();
    
    try {
        await game.init();
        
        // Initialize Quake-style console (press ` to open)
        gameConsole = new GameConsole(game);
        game.console = gameConsole;
        
        console.log('Game initialized successfully!');
    } catch (error) {
        console.error('Failed to initialize game:', error);
        document.getElementById('loadingText').textContent = 'Error: ' + error.message;
    }
});

// Handle visibility change (tab switching)
document.addEventListener('visibilitychange', () => {
    if (game) {
        if (document.hidden) {
            game.pause();
        }
    }
});

// Prevent right-click context menu
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});
