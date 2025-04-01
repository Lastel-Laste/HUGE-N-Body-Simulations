// Main entry point for the application
document.addEventListener('DOMContentLoaded', () => {
    // Get canvas element
    const canvas = document.getElementById('simulation');
    
    // Create simulation with initial settings
    const simulation = new Simulation({
        numBodies: 1000,
        dt: 0.01,
        theta: 0.5,
        epsilon: 1.0
    });
    
    // Create renderer
    const renderer = new Renderer(canvas, simulation);
    
    // Flag to track if simulation is paused
    let isPaused = false;
    
    // Set up event listeners
    setupEventListeners(simulation, renderer);
    
    // Main animation loop
    function animate(currentTime) {
        // Run simulation step if not paused
        if (!isPaused) {
            simulation.step();
        }
        
        // Render current state
        renderer.render(currentTime);
        
        // Schedule next frame
        requestAnimationFrame(animate);
    }
    
    // Start animation loop
    requestAnimationFrame(animate);
    
    // Set up event listeners for user interaction
    function setupEventListeners(simulation, renderer) {
        // Canvas event listeners
        canvas.addEventListener('mousedown', e => renderer.onMouseDown(e));
        canvas.addEventListener('mousemove', e => renderer.onMouseMove(e));
        canvas.addEventListener('mouseup', e => renderer.onMouseUp(e));
        canvas.addEventListener('wheel', e => renderer.onWheel(e));
        
        // Prevent context menu on right click
        canvas.addEventListener('contextmenu', e => e.preventDefault());
        
        // Window resize
        window.addEventListener('resize', () => renderer.resizeCanvas());
        
        // Control panel buttons
        const pauseBtn = document.getElementById('pauseBtn');
        const resetBtn = document.getElementById('resetBtn');
        const settingsBtn = document.getElementById('settingsBtn');
        const showBodiesCheckbox = document.getElementById('showBodies');
        const showQuadtreeCheckbox = document.getElementById('showQuadtree');
        const settingsPanel = document.getElementById('settings-panel');
        
        // Pause/Resume button
        pauseBtn.addEventListener('click', () => {
            isPaused = !isPaused;
            pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
        });
        
        // Reset button
        resetBtn.addEventListener('click', () => {
            simulation.reset();
        });
        
        // Settings button
        settingsBtn.addEventListener('click', () => {
            settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
        });
        
        // Visualization checkboxes
        showBodiesCheckbox.addEventListener('change', () => {
            renderer.showBodies = showBodiesCheckbox.checked;
        });
        
        showQuadtreeCheckbox.addEventListener('change', () => {
            renderer.showQuadtree = showQuadtreeCheckbox.checked;
        });
        
        // Settings sliders
        const particleSlider = document.getElementById('particleSlider');
        const particleValue = document.getElementById('particleValue');
        const thetaSlider = document.getElementById('thetaSlider');
        const thetaValue = document.getElementById('thetaValue');
        const dtSlider = document.getElementById('dtSlider');
        const dtValue = document.getElementById('dtValue');
        const applySettingsBtn = document.getElementById('applySettings');
        
        // Update displayed values when sliders change
        particleSlider.addEventListener('input', () => {
            particleValue.textContent = particleSlider.value;
        });
        
        thetaSlider.addEventListener('input', () => {
            thetaValue.textContent = thetaSlider.value;
        });
        
        dtSlider.addEventListener('input', () => {
            dtValue.textContent = dtSlider.value;
        });
        
        // Apply settings button
        applySettingsBtn.addEventListener('click', () => {
            simulation.updateParameters({
                numBodies: parseInt(particleSlider.value),
                theta: parseFloat(thetaSlider.value),
                dt: parseFloat(dtSlider.value)
            });
            
            settingsPanel.style.display = 'none';
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', e => {
            // Space key toggles pause
            if (e.code === 'Space') {
                isPaused = !isPaused;
                pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
            }
            
            // E key toggles settings panel
            if (e.code === 'KeyE') {
                settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
            }
        });
    }
});
