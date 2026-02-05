/* ============================================================================
   ESCAPE LAB 48 - BABYLON.JS EDITION
   Dialogue System - Story dialogues and conversations
   ============================================================================ */

class DialogueSystem {
    constructor(gameEngine) {
        this.game = gameEngine;
        
        this.dialogueBox = document.getElementById('dialogue');
        this.speakerEl = this.dialogueBox.querySelector('.speaker');
        this.textEl = this.dialogueBox.querySelector('.text');
        
        this.queue = [];
        this.isShowing = false;
        this.currentIndex = 0;
        this.typingSpeed = 30; // ms per character
        this.isTyping = false;
        this.fullText = '';
        
        // Click to advance
        document.addEventListener('click', () => {
            if (this.isShowing) {
                if (this.isTyping) {
                    // Show full text immediately
                    this.textEl.textContent = this.fullText;
                    this.isTyping = false;
                } else {
                    // Advance to next dialogue
                    this.nextDialogue();
                }
            }
        });
        
        // Space/Enter to advance
        document.addEventListener('keydown', (e) => {
            if (this.isShowing && (e.key === ' ' || e.key === 'Enter')) {
                if (this.isTyping) {
                    this.textEl.textContent = this.fullText;
                    this.isTyping = false;
                } else {
                    this.nextDialogue();
                }
            }
        });
    }
    
    show(dialogues) {
        if (!dialogues || dialogues.length === 0) return;
        
        this.queue = dialogues;
        this.currentIndex = 0;
        this.isShowing = true;
        
        // Pause game during dialogue
        this.game.isPaused = true;
        document.exitPointerLock();
        
        // Show dialogue box
        this.dialogueBox.style.display = 'block';
        
        // Display first line
        this.displayDialogue(this.queue[0]);
    }
    
    displayDialogue(dialogue) {
        // Set speaker name and color
        this.speakerEl.textContent = dialogue.speaker;
        
        // Color code by speaker
        switch(dialogue.speaker.toLowerCase()) {
            case 'jake':
                this.speakerEl.style.color = '#ff6b35';
                break;
            case 'sarah':
                this.speakerEl.style.color = '#ff69b4';
                break;
            case 'dr. chen':
                this.speakerEl.style.color = '#00bfff';
                break;
            case 'emma':
                this.speakerEl.style.color = '#9370db';
                break;
            case 'radio':
                this.speakerEl.style.color = '#888';
                break;
            case 'system':
                this.speakerEl.style.color = '#00ff00';
                break;
            default:
                this.speakerEl.style.color = '#ff6b35';
        }
        
        // Typewriter effect
        this.fullText = dialogue.text;
        this.textEl.textContent = '';
        this.isTyping = true;
        
        let charIndex = 0;
        const typeInterval = setInterval(() => {
            if (!this.isTyping) {
                clearInterval(typeInterval);
                return;
            }
            
            if (charIndex < this.fullText.length) {
                this.textEl.textContent += this.fullText[charIndex];
                charIndex++;
            } else {
                this.isTyping = false;
                clearInterval(typeInterval);
            }
        }, this.typingSpeed);
    }
    
    nextDialogue() {
        this.currentIndex++;
        
        if (this.currentIndex < this.queue.length) {
            this.displayDialogue(this.queue[this.currentIndex]);
        } else {
            // End of dialogue
            this.hide();
        }
    }
    
    hide() {
        this.isShowing = false;
        this.dialogueBox.style.display = 'none';
        this.queue = [];
        this.currentIndex = 0;
        
        // Resume game
        this.game.isPaused = false;
    }
}
