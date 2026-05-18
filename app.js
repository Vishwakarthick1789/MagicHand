// ==========================================
// NEXUS AR - Futuristic Hand Tracking Engine
// ==========================================

// --- AUDIO SYNTHESIZER ---
class AudioSynth {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.humOscillators = [];
        this.humGain = this.ctx.createGain();
        this.humGain.gain.value = 0; // start muted
        this.humGain.connect(this.ctx.destination);
        this.isHumming = false;
        
        this.setupHum();
    }

    setupHum() {
        // Create a rich, sci-fi hum using multiple oscillators
        const freqs = [55, 110, 165]; // Base freq and harmonics
        freqs.forEach(f => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = f;
            
            // Add a lowpass filter for a deeper sound
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 400;
            
            osc.connect(filter);
            filter.connect(this.humGain);
            osc.start();
            this.humOscillators.push({ osc, filter });
        });
    }

    setHumIntensity(intensity) {
        // Smoothly adjust gain based on hand presence/movement
        const targetGain = Math.min(Math.max(intensity, 0), 0.3);
        this.humGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
        
        // Modulate filter frequency based on intensity
        const filterFreq = 200 + (intensity * 1000);
        this.humOscillators.forEach(h => {
            h.filter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.1);
        });
    }

    playZap() {
        // Generate a quick sci-fi "zap" sound
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.2);
        
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }
    
    resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
}

// --- BACKGROUND EFFECTS ---
class MatrixBackground {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        
        this.characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+~`|}{[]:;?><,./-='
        this.fontSize = 14;
        this.columns = 0;
        this.drops = [];
        
        this.initDrops();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.columns = Math.floor(this.canvas.width / this.fontSize);
        this.initDrops();
    }

    initDrops() {
        this.drops = [];
        for (let x = 0; x < this.columns; x++) {
            this.drops[x] = 1;
        }
    }

    draw(themeColor) {
        // Darken background slightly to leave trails
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = themeColor; 
        this.ctx.font = this.fontSize + 'px monospace';

        for (let i = 0; i < this.drops.length; i++) {
            const text = this.characters.charAt(Math.floor(Math.random() * this.characters.length));
            
            // Randomly make some characters brighter
            if (Math.random() > 0.95) {
                this.ctx.fillStyle = '#fff';
            } else {
                this.ctx.fillStyle = themeColor;
            }

            this.ctx.fillText(text, i * this.fontSize, this.drops[i] * this.fontSize);

            // Reset drop to top randomly
            if (this.drops[i] * this.fontSize > this.canvas.height && Math.random() > 0.975) {
                this.drops[i] = 0;
            }
            this.drops[i]++;
        }
    }
}

// --- AR ENGINE ---
class AREngine {
    constructor() {
        this.video = document.getElementById('inputVideo');
        this.outCanvas = document.getElementById('outputCanvas');
        this.outCtx = this.outCanvas.getContext('2d');
        
        this.fxCanvas = document.getElementById('fxCanvas');
        this.fxCtx = this.fxCanvas.getContext('2d');
        
        this.bgCanvas = document.getElementById('backgroundCanvas');
        
        this.audio = null; // initialized on user click
        this.matrix = new MatrixBackground(this.bgCanvas);
        
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.fpsEl = document.getElementById('fpsCounter');
        this.handsEl = document.getElementById('handCounter');
        this.gestureEl = document.getElementById('gestureDetect');
        this.statusEl = document.getElementById('systemStatus');
        
        this.lastTime = 0;
        this.frames = 0;
        
        // Effects state
        this.trails = [];
        this.particles = [];
        this.shockwaves = [];
        this.shieldRotation = 0;
        
        this.themeColors = {
            primary: '#0ff',
            secondary: '#f0f',
            tertiary: '#0f0'
        };
        
        this.pinchCooldown = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupThemeSwitcher();
        this.updateThemeColors();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.outCanvas.width = this.width;
        this.outCanvas.height = this.height;
        this.fxCanvas.width = this.width;
        this.fxCanvas.height = this.height;
    }

    setupThemeSwitcher() {
        const btns = document.querySelectorAll('.theme-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                btns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const theme = e.target.getAttribute('data-theme');
                document.body.setAttribute('data-theme', theme);
                this.updateThemeColors();
            });
        });
    }

    updateThemeColors() {
        const styles = getComputedStyle(document.body);
        this.themeColors.primary = styles.getPropertyValue('--primary-color').trim() || '#0ff';
        this.themeColors.secondary = styles.getPropertyValue('--secondary-color').trim() || '#f0f';
        this.themeColors.tertiary = styles.getPropertyValue('--tertiary-color').trim() || '#0f0';
    }

    async init() {
        try {
            this.audio = new AudioSynth();
            
            this.hands = new Hands({locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }});
            
            this.hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.7
            });
            
            this.hands.onResults((results) => this.onResults(results));
            
            this.camera = new Camera(this.video, {
                onFrame: async () => {
                    await this.hands.send({image: this.video});
                },
                width: 1280,
                height: 720,
                facingMode: 'user'
            });
            
            this.camera.start();
            
            // Start render loop
            requestAnimationFrame((t) => this.renderLoop(t));
            
            this.statusEl.innerText = "SYSTEM ACTIVE";
            this.statusEl.style.color = "var(--tertiary-color)";
        } catch (error) {
            console.error("Initialization Error:", error);
            this.statusEl.innerText = "SYSTEM FAILURE";
            this.statusEl.style.color = "red";
        }
    }

    onResults(results) {
        this.latestResults = results;
    }

    // Mathematical utility for distance
    getDist(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx*dx + dy*dy);
    }

    // Check if hand is open (shield gesture)
    isOpenPalm(landmarks) {
        // Tips: 4(thumb), 8(index), 12(middle), 16(ring), 20(pinky)
        // MCPs: 2, 5, 9, 13, 17
        const isExtended = (tip, mcp) => landmarks[tip].y < landmarks[mcp].y;
        return isExtended(8, 5) && isExtended(12, 9) && isExtended(16, 13) && isExtended(20, 17);
    }

    // Check for pinch
    isPinching(landmarks) {
        const dist = this.getDist(landmarks[4], landmarks[8]);
        return dist < 0.05; // Threshold
    }

    createShockwave(x, y) {
        this.shockwaves.push({
            x: x, y: y, radius: 10, maxRadius: 300, alpha: 1, age: 0
        });
        
        // Spawn particles
        for(let i=0; i<30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 5;
            this.particles.push({
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1, decay: Math.random() * 0.03 + 0.02,
                color: this.themeColors.secondary
            });
        }
        
        if (this.audio) this.audio.playZap();
    }

    drawShield(ctx, x, y, radius) {
        ctx.save();
        ctx.translate(x, y);
        this.shieldRotation += 0.05;
        ctx.rotate(this.shieldRotation);
        
        ctx.strokeStyle = this.themeColors.primary;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.themeColors.primary;
        
        // Outer ring
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner polygons
        for(let i=0; i<2; i++) {
            ctx.rotate(Math.PI / 4);
            ctx.beginPath();
            for(let j=0; j<8; j++) {
                const angle = (j / 8) * Math.PI * 2;
                const px = Math.cos(angle) * (radius * 0.8);
                const py = Math.sin(angle) * (radius * 0.8);
                if (j===0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        }
        
        // Runes/Dots
        ctx.fillStyle = this.themeColors.secondary;
        for(let j=0; j<8; j++) {
            const angle = (j / 8) * Math.PI * 2 + this.shieldRotation * 0.5;
            const px = Math.cos(angle) * (radius * 1.1);
            const py = Math.sin(angle) * (radius * 1.1);
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI*2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    drawLightning(ctx, p1, p2) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        
        const dist = this.getDist(p1, p2);
        const steps = 10;
        let currX = p1.x;
        let currY = p1.y;
        
        for(let i=1; i<=steps; i++) {
            const t = i / steps;
            const targetX = p1.x + (p2.x - p1.x) * t;
            const targetY = p1.y + (p2.y - p1.y) * t;
            
            // Random offset perpendicular to line
            const offset = (Math.random() - 0.5) * (dist * 0.2);
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) + Math.PI/2;
            
            currX = targetX + Math.cos(angle) * offset;
            currY = targetY + Math.sin(angle) * offset;
            
            ctx.lineTo(currX, currY);
        }
        ctx.lineTo(p2.x, p2.y);
        
        ctx.strokeStyle = this.themeColors.primary;
        ctx.lineWidth = 3 + Math.random() * 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.themeColors.secondary;
        ctx.stroke();
        
        // Add core bright line
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.stroke();
    }

    renderEffects(ctx, landmarksList) {
        // Render neon trails
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        for(let i=0; i<this.trails.length; i++) {
            const trail = this.trails[i];
            if (trail.points.length < 2) continue;
            
            ctx.beginPath();
            ctx.moveTo(trail.points[0].x, trail.points[0].y);
            for(let j=1; j<trail.points.length; j++) {
                ctx.lineTo(trail.points[j].x, trail.points[j].y);
            }
            
            const alpha = trail.life;
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 2 + (alpha * 4);
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.themeColors.primary;
            ctx.stroke();
            
            trail.life -= 0.05;
        }
        this.trails = this.trails.filter(t => t.life > 0);
        
        // Render Shockwaves
        for(let i=0; i<this.shockwaves.length; i++) {
            const sw = this.shockwaves[i];
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI*2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${sw.alpha})`;
            ctx.lineWidth = 5 * sw.alpha;
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.themeColors.secondary;
            ctx.stroke();
            
            sw.radius += 15;
            sw.alpha -= 0.03;
        }
        this.shockwaves = this.shockwaves.filter(sw => sw.alpha > 0);
        
        // Render Particles
        for(let i=0; i<this.particles.length; i++) {
            const p = this.particles[i];
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.life * 4, 0, Math.PI*2);
            ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            ctx.fill();
            
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
        }
        this.particles = this.particles.filter(p => p.life > 0);
    }

    renderLoop(timestamp) {
        // Calculate FPS
        if (timestamp - this.lastTime >= 1000) {
            this.fpsEl.innerText = this.frames;
            this.frames = 0;
            this.lastTime = timestamp;
        }
        this.frames++;

        // Matrix background loop
        this.matrix.draw(this.themeColors.tertiary);

        // Clear canvases
        this.outCtx.clearRect(0, 0, this.width, this.height);
        
        // Apply motion blur effect to FX canvas
        this.fxCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.fxCtx.fillRect(0, 0, this.width, this.height);
        this.fxCtx.save();
        this.fxCtx.globalCompositeOperation = 'lighter';

        let gestureText = "NONE";
        let handCount = 0;
        let activeIntensity = 0;

        if (this.latestResults && this.latestResults.multiHandLandmarks) {
            handCount = this.latestResults.multiHandLandmarks.length;
            this.handsEl.innerText = handCount;
            
            activeIntensity = handCount * 0.5;

            // Optional: Draw video frame as faint background (Mirror mode)
            this.outCtx.save();
            this.outCtx.scale(-1, 1);
            this.outCtx.translate(-this.width, 0);
            this.outCtx.globalAlpha = 0.3;
            this.outCtx.drawImage(this.latestResults.image, 0, 0, this.width, this.height);
            this.outCtx.restore();

            const centers = []; // Store palm centers for lightning

            this.latestResults.multiHandLandmarks.forEach((landmarks, index) => {
                // Convert normalized coordinates to canvas coords (Mirror horizontally)
                const scaledLandmarks = landmarks.map(lm => ({
                    x: (1 - lm.x) * this.width,
                    y: lm.y * this.height,
                    z: lm.z
                }));

                // Palm center approx (landmark 9)
                centers.push(scaledLandmarks[9]);

                // Update Trails (Index fingertip is 8)
                const tip = scaledLandmarks[8];
                let activeTrail = this.trails.find(t => t.id === index);
                if (!activeTrail) {
                    activeTrail = { id: index, points: [], life: 1 };
                    this.trails.push(activeTrail);
                } else {
                    activeTrail.life = 1; // Reset life
                }
                activeTrail.points.push(tip);
                if (activeTrail.points.length > 20) activeTrail.points.shift();

                // Detect Gestures
                if (this.isOpenPalm(landmarks)) {
                    gestureText = "SHIELD";
                    this.drawShield(this.fxCtx, scaledLandmarks[9].x, scaledLandmarks[9].y, 100 + Math.abs(scaledLandmarks[9].z)*500);
                } else if (this.isPinching(landmarks)) {
                    gestureText = "PINCH";
                    if (this.pinchCooldown <= 0) {
                        this.createShockwave(tip.x, tip.y);
                        this.pinchCooldown = 20; // frames
                    }
                }

                // Draw skeleton (MediaPipe default but styled)
                this.outCtx.save();
                this.outCtx.globalCompositeOperation = 'lighter';
                drawConnectors(this.outCtx, scaledLandmarks, HAND_CONNECTIONS, {
                    color: this.themeColors.tertiary,
                    lineWidth: 2
                });
                drawLandmarks(this.outCtx, scaledLandmarks, {
                    color: this.themeColors.primary,
                    lineWidth: 1,
                    radius: 3
                });
                this.outCtx.restore();
            });

            // Draw Lightning if two hands detected
            if (centers.length === 2) {
                gestureText = "LIGHTNING";
                this.drawLightning(this.fxCtx, centers[0], centers[1]);
                activeIntensity = 1.0;
            }
        } else {
            this.handsEl.innerText = "0";
        }
        
        if (this.pinchCooldown > 0) this.pinchCooldown--;

        this.gestureEl.innerText = gestureText;
        if (gestureText !== "NONE") {
            this.gestureEl.classList.add('highlight');
        } else {
            this.gestureEl.classList.remove('highlight');
        }

        // Update Audio
        if (this.audio) {
            this.audio.setHumIntensity(activeIntensity);
        }

        // Render particles and transient effects
        this.renderEffects(this.fxCtx);
        this.fxCtx.restore();

        requestAnimationFrame((t) => this.renderLoop(t));
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    const overlay = document.getElementById('startOverlay');
    
    startBtn.addEventListener('click', () => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 500);
        
        const engine = new AREngine();
        engine.init();
    });
});
