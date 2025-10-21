const TIME_STEP_MIN = 0.25;
const TIME_STEP_MAX = 4;
const TIME_STEP_INCREMENT = 0.25;

let particle;
let rings = [];
let isPaused = false;
let showRings = true;
let isRainbowMode = false;
let rainbowHue = 0;
let pendingStep = false;
let timeStepMultiplier = 1;
let timeStepDisplay = null;
let timeline = [];
let scrubberElement = null;
let frameDisplay = null;
let currentFrameIndex = 0;
let isScrubbing = false;
let ringButtonEl = null;
let rainbowButtonEl = null;
let motionButtonEl = null;
let stepButtonEl = null;

function setup() {
    const canvasParent = document.getElementById('canvas-container');
    const canvas = createCanvas(canvasParent.offsetWidth, canvasParent.offsetHeight);
    canvas.parent(canvasParent); // attach to parent div
    colorMode(HSB, 360, 100, 100, 255);
    resetParticleState();
    rings = [];
    initializeToolbarControls();
    initializeTimelineState();
}

function draw() {
    background(210, 80, 10); // dark background
    noFill();
    strokeWeight(2);

    const shouldAdvance = (!isPaused || pendingStep) && !isScrubbing;

    if (shouldAdvance) {
        if (currentFrameIndex < timeline.length - 1) {
            timeline = timeline.slice(0, currentFrameIndex + 1);
        }

        // Move particle
        particle.x += particle.speed * timeStepMultiplier;
        particle.y = height / 2 + sin(particle.x * 0.05) * 50;

        if (isRainbowMode) {
            rainbowHue = (rainbowHue + timeStepMultiplier) % 360;
            setParticleColorHSB(rainbowHue, 80, 100, 255);
        }

        // Emit ring at current position
        rings.push(new Ring(particle.x, particle.y, particle.colorHSB));
        pendingStep = false;
    }

    // Draw and update rings
    for (let i = rings.length - 1; i >= 0; i--) {
        if (shouldAdvance) rings[i].update(timeStepMultiplier);
        if (showRings) rings[i].show();
        if (rings[i].alpha <= 0) rings.splice(i, 1);
    }

    if (shouldAdvance) {
        timeline.push(captureFrameSnapshot());
        currentFrameIndex = timeline.length - 1;
        updateScrubberUI();
    }

    // Draw main particle
    noStroke();
    fill(particle.colorHSB.h, particle.colorHSB.s, particle.colorHSB.b, particle.colorHSB.a);
    ellipse(particle.x, particle.y, 10);

    // Reset if off screen
    if (particle.x > width + 50) particle.x = -50;
}

// Ring class
class Ring {
    constructor(x, y, colorHSB) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.alpha = 255;
        this.colorHSB = normalizeColorHSB(colorHSB);
    }

    update(delta = 1) {
        this.radius += 3 * delta;
        this.alpha = Math.max(0, this.alpha - 2 * delta);
    }

    show() {
        stroke(this.colorHSB.h, this.colorHSB.s, this.colorHSB.b, this.alpha);
        ellipse(this.x, this.y, this.radius * 2);
    }

    serialize() {
        return {
            x: this.x,
            y: this.y,
            radius: this.radius,
            alpha: this.alpha,
            colorHSB: { ...this.colorHSB }
        };
    }

    static fromData(data) {
        const ring = new Ring(data.x, data.y, data.colorHSB);
        ring.radius = data.radius;
        ring.alpha = data.alpha;
        return ring;
    }
}

function windowResized() {
    const canvasParent = document.getElementById('canvas-container');
    resizeCanvas(canvasParent.offsetWidth, canvasParent.offsetHeight);
}

function resetParticleState() {
    particle = { x: 0, y: height / 2, speed: 2 };
    rainbowHue = 0;
    setParticleColorHSB(0, 0, 100, 255);
}

function normalizeColorHSB(data) {
    const defaults = { h: 0, s: 0, b: 100, a: 255 };
    if (!data) return { ...defaults };
    return {
        h: data.h ?? defaults.h,
        s: data.s ?? defaults.s,
        b: data.b ?? defaults.b,
        a: data.a ?? defaults.a
    };
}

function setParticleColorHSB(h, s, b, a = 255) {
    setParticleColorFromData({ h, s, b, a });
}

function setParticleColorFromData(colorData) {
    const normalized = normalizeColorHSB(colorData);
    particle.colorHSB = { ...normalized };
    particle.color = color(normalized.h, normalized.s, normalized.b, normalized.a);
}

function setTimeStepMultiplier(value) {
    const quantized = Math.round(value / TIME_STEP_INCREMENT) * TIME_STEP_INCREMENT;
    timeStepMultiplier = clampTimeStep(parseFloat(quantized.toFixed(2)));
    refreshTimeStepDisplay();
}

function captureFrameSnapshot() {
    return {
        particle: {
            x: particle.x,
            y: particle.y,
            speed: particle.speed,
            colorHSB: { ...particle.colorHSB }
        },
        rings: rings.map(ring => ring.serialize()),
        rainbowHue,
        isRainbowMode
    };
}

function applyFrameSnapshot(snapshot) {
    if (!snapshot) return;
    particle.x = snapshot.particle.x;
    particle.y = snapshot.particle.y;
    particle.speed = snapshot.particle.speed;
    setParticleColorFromData(snapshot.particle.colorHSB);
    rainbowHue = snapshot.rainbowHue;
    isRainbowMode = snapshot.isRainbowMode;
    rings = snapshot.rings.map(Ring.fromData);
    updateRainbowButtonState();
}

function initializeTimelineState() {
    timeline = [captureFrameSnapshot()];
    currentFrameIndex = 0;
    updateScrubberUI(true);
}

function goToFrame(index) {
    if (!timeline.length) return;
    const clamped = Math.round(Math.min(Math.max(index, 0), timeline.length - 1));
    currentFrameIndex = clamped;
    applyFrameSnapshot(timeline[clamped]);
    updateScrubberUI(true);
    pendingStep = false;
}

function updateScrubberUI(forceValue = false) {
    if (!scrubberElement || !frameDisplay) return;
    const maxIndex = Math.max(0, timeline.length - 1);
    scrubberElement.max = String(maxIndex);
    if (forceValue || !isScrubbing) {
        scrubberElement.value = String(currentFrameIndex);
    }
    frameDisplay.textContent = currentFrameIndex.toString();
}

function updateMotionControls() {
    if (motionButtonEl) {
        motionButtonEl.textContent = isPaused ? 'Resume' : 'Pause';
    }
    if (stepButtonEl) {
        stepButtonEl.hidden = !isPaused;
    }
}

function updateRingButtonState() {
    if (ringButtonEl) {
        ringButtonEl.textContent = showRings ? 'Hide Rings' : 'Show Rings';
    }
}

function updateRainbowButtonState() {
    if (rainbowButtonEl) {
        rainbowButtonEl.textContent = isRainbowMode ? 'Disable Rainbow' : 'Enable Rainbow';
    }
}

function handleScrubInput() {
    if (!scrubberElement) return;
    if (!isScrubbing) {
        isScrubbing = true;
        if (!isPaused) {
            isPaused = true;
            updateMotionControls();
        }
    }
    goToFrame(Number(scrubberElement.value));
}

function handleScrubChange() {
    isScrubbing = false;
    if (scrubberElement) {
        goToFrame(Number(scrubberElement.value));
    }
}

function clampTimeStep(value) {
    return Math.min(TIME_STEP_MAX, Math.max(TIME_STEP_MIN, value));
}

function refreshTimeStepDisplay() {
    if (timeStepDisplay) {
        timeStepDisplay.textContent = formatTimeStepLabel(timeStepMultiplier);
    }
}

function formatTimeStepLabel(value) {
    return value.toFixed(2).replace(/\.?0+$/, '') + 'x';
}

function initializeToolbarControls() {
    ringButtonEl = document.getElementById('toggle-rings');
    rainbowButtonEl = document.getElementById('toggle-rainbow');
    motionButtonEl = document.getElementById('toggle-motion');
    stepButtonEl = document.getElementById('step-forward');
    const resetButton = document.getElementById('reset');
    const decreaseTimeStepButton = document.getElementById('decrease-timestep');
    const increaseTimeStepButton = document.getElementById('increase-timestep');
    scrubberElement = document.getElementById('timeline-scrubber');
    frameDisplay = document.getElementById('frame-display');
    timeStepDisplay = document.getElementById('timestep-display');
    refreshTimeStepDisplay();

    updateRingButtonState();
    updateRainbowButtonState();
    updateMotionControls();

    if (ringButtonEl) {
        ringButtonEl.addEventListener('click', () => {
            showRings = !showRings;
            updateRingButtonState();
        });
    }

    if (rainbowButtonEl) {
        rainbowButtonEl.addEventListener('click', () => {
            isRainbowMode = !isRainbowMode;
            if (isRainbowMode) {
                rainbowHue = 0;
                setParticleColorHSB(rainbowHue, 80, 100, 255);
            } else {
                rainbowHue = 0;
                setParticleColorHSB(0, 0, 100, 255);
            }
            updateRainbowButtonState();
            if (timeline.length) {
                timeline[currentFrameIndex] = captureFrameSnapshot();
                updateScrubberUI(true);
            }
        });
    }

    if (motionButtonEl) {
        motionButtonEl.addEventListener('click', () => {
            isPaused = !isPaused;
            isScrubbing = false;
            updateMotionControls();
        });
    }

    if (stepButtonEl) {
        stepButtonEl.addEventListener('click', () => {
            if (isPaused) {
                pendingStep = true;
                isScrubbing = false;
            }
        });
    }

    if (resetButton) {
        resetButton.addEventListener('click', () => {
            resetParticleState();
            rings = [];
            isPaused = false;
            showRings = true;
            isRainbowMode = false;
            pendingStep = false;
            setTimeStepMultiplier(1);
            initializeTimelineState();
            updateMotionControls();
            updateRingButtonState();
            updateRainbowButtonState();
            isScrubbing = false;
        });
    }

    if (decreaseTimeStepButton) {
        decreaseTimeStepButton.addEventListener('click', () => {
            setTimeStepMultiplier(timeStepMultiplier - TIME_STEP_INCREMENT);
        });
    }

    if (increaseTimeStepButton) {
        increaseTimeStepButton.addEventListener('click', () => {
            setTimeStepMultiplier(timeStepMultiplier + TIME_STEP_INCREMENT);
        });
    }

    if (scrubberElement) {
        scrubberElement.addEventListener('input', handleScrubInput);
        scrubberElement.addEventListener('change', handleScrubChange);
    }
}
