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

function setup() {
    const canvasParent = document.getElementById('canvas-container');
    const canvas = createCanvas(canvasParent.offsetWidth, canvasParent.offsetHeight);
    canvas.parent(canvasParent); // attach to parent div
    colorMode(HSB, 360, 100, 100, 255);
    resetParticleState();
    initializeToolbarControls();
}

function draw() {
    background(210, 80, 10); // dark background
    noFill();
    strokeWeight(2);

    const shouldAdvance = !isPaused || pendingStep;

    if (shouldAdvance) {
        // Move particle
        particle.x += particle.speed * timeStepMultiplier;
        particle.y = height / 2 + sin(particle.x * 0.05) * 50;

        if (isRainbowMode) {
            rainbowHue = (rainbowHue + 1) % 360;
            particle.color = color(rainbowHue, 80, 100, 255);
        }

        // Emit ring at current position
        rings.push(new Ring(particle.x, particle.y, particle.color));
        pendingStep = false;
    }

    // Draw and update rings
    for (let i = rings.length - 1; i >= 0; i--) {
        if (shouldAdvance) rings[i].update(timeStepMultiplier);
        if (showRings) rings[i].show();
        if (rings[i].alpha <= 0) rings.splice(i, 1);
    }

    // Draw main particle
    noStroke();
    fill(particle.color);
    ellipse(particle.x, particle.y, 10);

    // Reset if off screen
    if (particle.x > width + 50) particle.x = -50;
}

// Ring class
class Ring {
    constructor(x, y, colorValue) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.alpha = 255;
        this.baseColor = colorValue ? color(colorValue) : color(0, 0, 100, 255);
    }

    update(delta = 1) {
        this.radius += 3 * delta;
        this.alpha = Math.max(0, this.alpha - 2 * delta);
    }

    show() {
        const ringColor = color(this.baseColor);
        ringColor.setAlpha(this.alpha);
        stroke(ringColor);
        ellipse(this.x, this.y, this.radius * 2);
    }
}

function windowResized() {
    const canvasParent = document.getElementById('canvas-container');
    resizeCanvas(canvasParent.offsetWidth, canvasParent.offsetHeight);
}

function resetParticleState() {
    particle = { x: 0, y: height / 2, speed: 2, color: color(0, 0, 100, 255) };
    rainbowHue = 0;
}

function setTimeStepMultiplier(value) {
    const quantized = Math.round(value / TIME_STEP_INCREMENT) * TIME_STEP_INCREMENT;
    timeStepMultiplier = clampTimeStep(parseFloat(quantized.toFixed(2)));
    refreshTimeStepDisplay();
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
    const ringButton = document.getElementById('toggle-rings');
    const rainbowButton = document.getElementById('toggle-rainbow');
    const resetButton = document.getElementById('reset');
    const motionButton = document.getElementById('toggle-motion');
    const stepButton = document.getElementById('step-forward');
    const decreaseTimeStepButton = document.getElementById('decrease-timestep');
    const increaseTimeStepButton = document.getElementById('increase-timestep');
    timeStepDisplay = document.getElementById('timestep-display');
    refreshTimeStepDisplay();

    if (ringButton) {
        ringButton.addEventListener('click', () => {
            showRings = !showRings;
            ringButton.textContent = showRings ? 'Hide Rings' : 'Show Rings';
        });
    }

    if (rainbowButton) {
        rainbowButton.addEventListener('click', () => {
            isRainbowMode = !isRainbowMode;
            if (isRainbowMode) {
                rainbowHue = 0;
                particle.color = color(rainbowHue, 80, 100, 255);
            } else {
                particle.color = color(0, 0, 100, 255);
                rainbowHue = 0;
            }
            rainbowButton.textContent = isRainbowMode ? 'Disable Rainbow' : 'Enable Rainbow';
        });
    }

    if (motionButton) {
        motionButton.addEventListener('click', () => {
            isPaused = !isPaused;
            motionButton.textContent = isPaused ? 'Resume' : 'Pause';
            if (stepButton) stepButton.hidden = !isPaused;
        });
    }

    if (stepButton) {
        stepButton.addEventListener('click', () => {
            if (isPaused) {
                pendingStep = true;
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
            if (motionButton) motionButton.textContent = 'Pause';
            if (ringButton) ringButton.textContent = 'Hide Rings';
            if (rainbowButton) rainbowButton.textContent = 'Enable Rainbow';
            if (stepButton) stepButton.hidden = true;
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
}
