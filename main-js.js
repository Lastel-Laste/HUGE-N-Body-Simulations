import { Simulation } from './simulation.js';
import { Renderer } from './renderer.js';
import { Body } from './body.js';
import { Vec2 } from './vector.js';

// Initialize canvas
const canvas = document.getElementById('canvas');
const renderer = new Renderer(canvas);

// Create simulation
const simulation = new Simulation();
simulation.reset({
    particleCount: 10000,
    theta: 0.8,
    epsilon: 1.0,
    timeStep: 0.05
});

// Track simulation state
let isPaused = false;
let lastTimestamp = 0;
let spawnedBody = null;

// Add UI event handlers
setupUIHandlers();

// Start animation loop
requestAnimationFrame(animate);

// Main animation loop
function animate(timestamp) {
    // Calculate delta time for physics if needed
    const deltaTime = lastTimestamp ? (timestamp - lastTimestamp) / 1000 : 0;
    lastTimestamp = timestamp;
    
    // Run simulation steps if not paused
    if (!isPaused) {
        // Run multiple steps per frame for more stable simulation
        // but limit to avoid freezing with large delta time
        const maxSteps = 5; 
        const targetDt = simulation.dt;
        let accumulator = Math.min(deltaTime, 0.1); // Cap at 100ms to prevent spiral of death
        
        let steps = 0;
        while (accumulator >= targetDt && steps < maxSteps) {
            simulation.step();
            accumulator -= targetDt;
            steps++;
        }
    }
    
    // Add spawned body if needed
    if (spawnedBody) {
        simulation.bodies.push(new Body(
            spawnedBody.pos,
            spawnedBody.vel,
            spawnedBody.mass,
            spawnedBody.radius
        ));
        spawnedBody = null;
    }
    
    // Render the current state
    renderer.render(simulation, timestamp);
    
    // Continue the animation loop
    requestAnimationFrame(animate);
}

// Set up UI event handlers
function setupUIHandlers() {
    // Pause/resume button
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
    });
    
    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settings');
    
    settingsBtn.addEventListener('click', () => {
        settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
    });
    
    // Close settings
    document.getElementById('closeSettings').addEventListener('click', () => {
        settingsPanel.style.display = 'none';
    });
    
    // Apply settings
    document.getElementById('applySettings').addEventListener('click', () => {
        const particleCount = parseInt(document.getElementById('particleCount').value);
        const theta = parseFloat(document.getElementById('theta').value);
        const epsilon = parseFloat(document.getElementById('epsilon').value);
        const timeStep = parseFloat(document.getElementById('timeStep').value);
        const showQuadtree = document.getElementById('showQuadtree').checked;
        
        // Update renderer settings
        renderer.showQuadtree = showQuadtree;
        
        // Reset simulation with new parameters
        simulation.reset({
            particleCount,
            theta,
            epsilon,
            timeStep
        });
        
        // Update displayed values
        document.getElementById('particleCountValue').textContent = particleCount;
        document.getElementById('thetaValue').textContent = theta.toFixed(1);
        document.getElementById('epsilonValue').textContent = epsilon.toFixed(1);
        document.getElementById('timeStepValue').textContent = timeStep.toFixed(2);
        
        // Hide settings panel
        settingsPanel.style.display = 'none';
    });
    
    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => {
        // Reset simulation with current settings
        const particleCount = parseInt(document.getElementById('particleCount').value);
        const theta = parseFloat(document.getElementById('theta').value);
        const epsilon = parseFloat(document.getElementById('epsilon').value);
        const timeStep = parseFloat(document.getElementById('timeStep').value);
        
        simulation.reset({
            particleCount,
            theta,
            epsilon,
            timeStep
        });
    });
    
    // Update display values when sliders change
    document.getElementById('particleCount').addEventListener('input', (e) => {
        document.getElementById('particleCountValue').textContent = e.target.value;
    });
    
    document.getElementById('theta').addEventListener('input', (e) => {
        document.getElementById('thetaValue').textContent = parseFloat(e.target.value).toFixed(1);
    });
    
    document.getElementById('epsilon').addEventListener('input', (e) => {
        document.getElementById('epsilonValue').textContent = parseFloat(e.target.value).toFixed(1);
    });
    
    document.getElementById('timeStep').addEventListener('input', (e) => {
        document.getElementById('timeStepValue').textContent = parseFloat(e.target.value).toFixed(2);
    });
    
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            // Toggle pause
            isPaused = !isPaused;
            pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
        } else if (e.code === 'KeyE') {
            // Toggle settings
            settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
        }
    });
    
    // Handle body spawn from renderer
    canvas.addEventListener('mouseup', (e) => {
        if (e.button === 2 && renderer.spawnBody) { // Right button release
            spawnedBody = renderer.endBodySpawn();
        }
    });
}
