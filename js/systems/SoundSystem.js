/* ============================================================================
   ESCAPE LAB 48 - BABYLON.JS EDITION
   Sound System - Web Audio API based sound effects and music
   ============================================================================ */

class SoundSystem {
    constructor(scene) {
        this.scene = scene;
        this.audioContext = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        
        this.sounds = new Map();
        this.audioBuffers = new Map(); // For loaded WAV/MP3 files
        this.currentMusic = null;
        this.musicEnabled = true;
        this.sfxEnabled = true;
        
        this.initialized = false;
    }
    
    async init() {
        try {
            // Create audio context on user interaction
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create gain nodes
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = 0.7;
            
            this.musicGain = this.audioContext.createGain();
            this.musicGain.connect(this.masterGain);
            this.musicGain.gain.value = 0.4;
            
            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.connect(this.masterGain);
            this.sfxGain.gain.value = 0.8;
            
            // Generate procedural sounds (no audio files needed!)
            this.generateProceduralSounds();
            
            // Load door sound from WAV file
            await this.loadSound('door', 'assets/sounds/door_open.wav');
            
            this.initialized = true;
            console.log('🔊 Sound system initialized');
            
        } catch (e) {
            console.warn('Sound system init failed:', e);
        }
    }
    
    generateProceduralSounds() {
        // Generate all sounds procedurally using Web Audio API
        
        // Punch sound - short noise burst
        this.sounds.set('punch', () => this.createPunchSound());
        
        // Pistol shot - sharp attack with decay
        this.sounds.set('pistol', () => this.createGunSound(0.1, 800, 0.3));
        
        // Rifle shot - deeper, longer
        this.sounds.set('rifle', () => this.createGunSound(0.15, 400, 0.4));
        
        // Shotgun - heavy blast
        this.sounds.set('shotgun', () => this.createGunSound(0.25, 200, 0.6));
        
        // Laser
        this.sounds.set('laser', () => this.createLaserSound());
        
        // Explosion
        this.sounds.set('explosion', () => this.createExplosionSound());
        
        // Footstep
        this.sounds.set('footstep', () => this.createFootstepSound());
        
        // Metal clang (bar bending)
        this.sounds.set('metal', () => this.createMetalSound());
        
        // Metal creaking (bar bend organic sound)
        this.sounds.set('metalCreak', () => this.createMetalCreakSound());
        
        // Door sound loaded from WAV file in init()
        
        // Click (empty weapon)
        this.sounds.set('click', () => this.createClickSound());
        
        // Voice/speech effects
        
        // Pickup item
        this.sounds.set('pickup', () => this.createPickupSound());
        
        // Health pickup
        this.sounds.set('health', () => this.createHealthSound());
        
        // Hurt
        this.sounds.set('hurt', () => this.createHurtSound());
        
        // Enemy alert
        this.sounds.set('alert', () => this.createAlertSound());
        
        // Enemy death
        this.sounds.set('death', () => this.createDeathSound());
        
        // Reload
        this.sounds.set('reload', () => this.createReloadSound());
        
        // Jump
        this.sounds.set('jump', () => this.createJumpSound());
        
        // Land
        this.sounds.set('land', () => this.createLandSound());
        
        // UI click
        this.sounds.set('click', () => this.createClickSound());
        
        // Ambient hum
        this.sounds.set('ambient', () => this.createAmbientHum());
    }
    
    // ═══════════════════════════════════════════════════════
    // PROCEDURAL SOUND GENERATORS
    // ═══════════════════════════════════════════════════════
    
    createPunchSound() {
        const ctx = this.audioContext;
        const duration = 0.15;
        
        // Noise burst
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            const t = i / ctx.sampleRate;
            const envelope = Math.exp(-t * 30);
            data[i] = (Math.random() * 2 - 1) * envelope;
        }
        
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        
        // Low pass filter for thud
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;
        
        source.connect(filter);
        filter.connect(this.sfxGain);
        source.start();
    }
    
    createGunSound(duration, freq, volume) {
        const ctx = this.audioContext;
        
        // Noise for gunshot
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            const t = i / ctx.sampleRate;
            const envelope = Math.exp(-t * 20);
            data[i] = (Math.random() * 2 - 1) * envelope * volume;
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        
        // Add low frequency thump
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + duration);
        
        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(volume, ctx.currentTime);
        oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        
        // High pass for crack
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 1000;
        
        noise.connect(highpass);
        highpass.connect(this.sfxGain);
        
        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        
        noise.start();
        osc.start();
        osc.stop(ctx.currentTime + duration);
    }
    
    createLaserSound() {
        const ctx = this.audioContext;
        const duration = 0.3;
        
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + duration);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start();
        osc.stop(ctx.currentTime + duration);
    }
    
    createExplosionSound() {
        const ctx = this.audioContext;
        const duration = 1.0;
        
        // Heavy noise
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            const t = i / ctx.sampleRate;
            const envelope = Math.exp(-t * 3);
            data[i] = (Math.random() * 2 - 1) * envelope;
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        
        // Low pass for rumble
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + duration);
        
        // Sub bass
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + duration);
        
        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.8, ctx.currentTime);
        oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        
        noise.connect(filter);
        filter.connect(this.sfxGain);
        
        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        
        noise.start();
        osc.start();
        osc.stop(ctx.currentTime + duration);
    }
    
    createFootstepSound() {
        const ctx = this.audioContext;
        const duration = 0.1;
        
        // Short thump
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100 + Math.random() * 50, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + duration);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start();
        osc.stop(ctx.currentTime + duration);
    }
    
    createMetalSound() {
        const ctx = this.audioContext;
        const duration = 0.8;
        
        // Metallic ring - multiple harmonics
        const frequencies = [800, 1600, 2400, 3200];
        
        frequencies.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq + Math.random() * 100;
            
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.15 / (i + 1), ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start();
            osc.stop(ctx.currentTime + duration);
        });
        
        // Impact noise
        const bufferSize = ctx.sampleRate * 0.05;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            const t = i / ctx.sampleRate;
            data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 100);
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.connect(this.sfxGain);
        noise.start();
    }
    
    createMetalCreakSound() {
        const ctx = this.audioContext;
        const duration = 1.5;
        
        // Multiple creaking tones - staggered and random for organic feel
        const creakTimes = [0, 0.15, 0.4, 0.7, 1.0];
        
        creakTimes.forEach((startTime, i) => {
            // Low grinding creak
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            
            // Wavering frequency for "straining metal" effect
            const baseFreq = 80 + Math.random() * 40;
            osc.frequency.setValueAtTime(baseFreq, ctx.currentTime + startTime);
            osc.frequency.linearRampToValueAtTime(baseFreq * 0.7, ctx.currentTime + startTime + 0.1);
            osc.frequency.linearRampToValueAtTime(baseFreq * 1.2, ctx.currentTime + startTime + 0.2);
            osc.frequency.linearRampToValueAtTime(baseFreq * 0.5, ctx.currentTime + startTime + 0.3);
            
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
            gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + 0.35);
            
            // Distortion for gritty metal sound
            const distortion = ctx.createWaveShaper();
            const curve = new Float32Array(256);
            for (let j = 0; j < 256; j++) {
                const x = (j / 128) - 1;
                curve[j] = Math.tanh(x * 3);
            }
            distortion.curve = curve;
            
            osc.connect(distortion);
            distortion.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start(ctx.currentTime + startTime);
            osc.stop(ctx.currentTime + startTime + 0.4);
            
            // High pitched stress squeal
            if (Math.random() > 0.5) {
                const squeal = ctx.createOscillator();
                squeal.type = 'sine';
                squeal.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime + startTime);
                squeal.frequency.linearRampToValueAtTime(400 + Math.random() * 200, ctx.currentTime + startTime + 0.2);
                
                const squealGain = ctx.createGain();
                squealGain.gain.setValueAtTime(0, ctx.currentTime + startTime + 0.02);
                squealGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + startTime + 0.05);
                squealGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + 0.25);
                
                squeal.connect(squealGain);
                squealGain.connect(this.sfxGain);
                
                squeal.start(ctx.currentTime + startTime);
                squeal.stop(ctx.currentTime + startTime + 0.3);
            }
        });
        
        // Final metallic snap
        setTimeout(() => {
            const snapOsc = ctx.createOscillator();
            snapOsc.type = 'square';
            snapOsc.frequency.value = 200;
            
            const snapGain = ctx.createGain();
            snapGain.gain.setValueAtTime(0.2, ctx.currentTime);
            snapGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
            
            snapOsc.connect(snapGain);
            snapGain.connect(this.sfxGain);
            
            snapOsc.start();
            snapOsc.stop(ctx.currentTime + 0.15);
        }, duration * 900);
    }
    
    async loadSound(soundName, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.audioBuffers.set(soundName, audioBuffer);
            console.log(`🔊 Loaded sound: ${soundName} from ${url}`);
        } catch (e) {
            console.warn(`Failed to load sound ${soundName}:`, e);
        }
    }
    
    playBuffer(soundName, volume = 1.0) {
        const buffer = this.audioBuffers.get(soundName);
        if (!buffer) return;
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        const gain = this.audioContext.createGain();
        gain.gain.value = volume;
        
        source.connect(gain);
        gain.connect(this.sfxGain);
        
        source.start();
    }
    
    createClickSound() {
        const ctx = this.audioContext;
        
        // Sharp click for empty weapon
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = 1500;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.03);
    }
    
    createPickupSound() {
        const ctx = this.audioContext;
        
        // Rising tone
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    }
    
    createHealthSound() {
        const ctx = this.audioContext;
        
        // Pleasant rising chord
        const freqs = [523, 659, 784]; // C E G
        freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.05);
            gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.05 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start(ctx.currentTime + i * 0.05);
            osc.stop(ctx.currentTime + 0.5);
        });
    }
    
    createHurtSound() {
        const ctx = this.audioContext;
        
        // Low grunt + noise
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    }
    
    createAlertSound() {
        const ctx = this.audioContext;
        
        // Warning tone
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.setValueAtTime(400, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(600, ctx.currentTime + 0.2);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    }
    
    createDeathSound() {
        const ctx = this.audioContext;
        const duration = 0.6;
        
        // Falling tone
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + duration);
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start();
        osc.stop(ctx.currentTime + duration);
    }
    
    createReloadSound() {
        const ctx = this.audioContext;
        
        // Click + slide
        const click = () => {
            const osc = ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.value = 2000;
            
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.02);
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.02);
        };
        
        click();
        setTimeout(() => click(), 200);
        setTimeout(() => click(), 400);
    }
    
    createJumpSound() {
        const ctx = this.audioContext;
        
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
    }
    
    createLandSound() {
        const ctx = this.audioContext;
        
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
    }
    
    createClickSound() {
        const ctx = this.audioContext;
        
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 1000;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    }
    
    createAmbientHum() {
        const ctx = this.audioContext;
        
        // Low drone
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = 60;
        
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = 120;
        
        const gain = ctx.createGain();
        gain.gain.value = 0.05;
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.musicGain);
        
        osc1.start();
        osc2.start();
        
        // Return stop function
        return {
            stop: () => {
                osc1.stop();
                osc2.stop();
            }
        };
    }
    
    // ═══════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════
    
    play(soundName, volume = 1.0) {
        if (!this.initialized || !this.sfxEnabled) return;
        
        // Resume audio context if suspended (browser autoplay policy)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        // Check for loaded audio buffer first
        if (this.audioBuffers.has(soundName)) {
            this.playBuffer(soundName, volume);
            return;
        }
        
        // Fall back to procedural sound
        const soundGenerator = this.sounds.get(soundName);
        if (soundGenerator) {
            soundGenerator();
        } else {
            console.warn(`Sound not found: ${soundName}`);
        }
    }
    
    playAt(soundName, position) {
        // Could add 3D audio positioning here
        this.play(soundName);
    }
    
    setMasterVolume(vol) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, vol));
        }
    }
    
    setMusicVolume(vol) {
        if (this.musicGain) {
            this.musicGain.gain.value = Math.max(0, Math.min(1, vol));
        }
    }
    
    setSFXVolume(vol) {
        if (this.sfxGain) {
            this.sfxGain.gain.value = Math.max(0, Math.min(1, vol));
        }
    }
    
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicGain) {
            this.musicGain.gain.value = this.musicEnabled ? 0.4 : 0;
        }
    }
    
    toggleSFX() {
        this.sfxEnabled = !this.sfxEnabled;
    }
    
    // ═══════════════════════════════════════════════════════
    // MUSIC SYSTEM (Procedural Background Music)
    // ═══════════════════════════════════════════════════════
    
    startAmbientMusic(type = 'tense') {
        if (!this.initialized || !this.musicEnabled) return;
        
        this.stopMusic();
        
        const ctx = this.audioContext;
        
        if (type === 'tense') {
            // Dark, ominous ambient
            this.currentMusic = this.createTenseMusic();
        } else if (type === 'action') {
            // Faster, more intense
            this.currentMusic = this.createActionMusic();
        } else if (type === 'calm') {
            // Peaceful
            this.currentMusic = this.createCalmMusic();
        }
    }
    
    createTenseMusic() {
        const ctx = this.audioContext;
        const nodes = [];
        
        // Low drone
        const drone = ctx.createOscillator();
        drone.type = 'sine';
        drone.frequency.value = 55; // A1
        
        const droneGain = ctx.createGain();
        droneGain.gain.value = 0.1;
        
        drone.connect(droneGain);
        droneGain.connect(this.musicGain);
        drone.start();
        nodes.push(drone);
        
        // Pulsing sub
        const sub = ctx.createOscillator();
        sub.type = 'sine';
        sub.frequency.value = 27.5; // A0
        
        const subGain = ctx.createGain();
        
        // LFO for pulsing
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1;
        
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.05;
        
        lfo.connect(lfoGain);
        lfoGain.connect(subGain.gain);
        subGain.gain.value = 0.08;
        
        sub.connect(subGain);
        subGain.connect(this.musicGain);
        
        sub.start();
        lfo.start();
        nodes.push(sub, lfo);
        
        return {
            stop: () => {
                nodes.forEach(n => {
                    try { n.stop(); } catch(e) {}
                });
            }
        };
    }
    
    createActionMusic() {
        const ctx = this.audioContext;
        const nodes = [];
        
        // Kick drum pattern
        const scheduleKick = (time) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, time);
            osc.frequency.exponentialRampToValueAtTime(50, time + 0.1);
            
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.3, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
            
            osc.connect(gain);
            gain.connect(this.musicGain);
            
            osc.start(time);
            osc.stop(time + 0.2);
        };
        
        // Bass line
        const bass = ctx.createOscillator();
        bass.type = 'sawtooth';
        bass.frequency.value = 55;
        
        const bassFilter = ctx.createBiquadFilter();
        bassFilter.type = 'lowpass';
        bassFilter.frequency.value = 200;
        
        const bassGain = ctx.createGain();
        bassGain.gain.value = 0.15;
        
        bass.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(this.musicGain);
        bass.start();
        nodes.push(bass);
        
        // Schedule beats
        const bpm = 140;
        const beatTime = 60 / bpm;
        let nextBeat = ctx.currentTime;
        
        const beatInterval = setInterval(() => {
            if (!this.currentMusic) {
                clearInterval(beatInterval);
                return;
            }
            scheduleKick(ctx.currentTime);
        }, beatTime * 1000);
        
        return {
            stop: () => {
                clearInterval(beatInterval);
                nodes.forEach(n => {
                    try { n.stop(); } catch(e) {}
                });
            }
        };
    }
    
    createCalmMusic() {
        const ctx = this.audioContext;
        const nodes = [];
        
        // Soft pad
        const pad = ctx.createOscillator();
        pad.type = 'sine';
        pad.frequency.value = 220;
        
        const padGain = ctx.createGain();
        padGain.gain.value = 0.05;
        
        // Slow vibrato
        const vibrato = ctx.createOscillator();
        vibrato.type = 'sine';
        vibrato.frequency.value = 0.5;
        
        const vibratoGain = ctx.createGain();
        vibratoGain.gain.value = 2;
        
        vibrato.connect(vibratoGain);
        vibratoGain.connect(pad.frequency);
        
        pad.connect(padGain);
        padGain.connect(this.musicGain);
        
        pad.start();
        vibrato.start();
        nodes.push(pad, vibrato);
        
        return {
            stop: () => {
                nodes.forEach(n => {
                    try { n.stop(); } catch(e) {}
                });
            }
        };
    }
    
    stopMusic() {
        if (this.currentMusic) {
            this.currentMusic.stop();
            this.currentMusic = null;
        }
    }
}
