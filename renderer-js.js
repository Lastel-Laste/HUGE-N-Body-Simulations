import { Vec2 } from './vector.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        
        // Camera/view settings
        this.position = Vec2.zero(); // Center position
        this.scale = 1; // Zoom level
        
        // Visualization settings
        this.showBodies = true;
        this.showQuadtree = false;
        this.quadtreeDepthRange = { min: 0, max: 0 };
        
        // Mouse interaction state
        this.isPanning = false;
        this.lastMousePos = null;
        this.mousePos = Vec2.zero();
        
        // For spawning new bodies
        this.spawnBody = null;
        this.spawnAngle = null;
        this.spawnTotal = null;
        
        // Performance metrics
        this.frameTime = 0;
        this.lastFrameTime = 0;
        this.fps = 0;
        this.fpsUpdateInterval = 500; // ms
        this.lastFpsUpdate = 0;
        
        // Resize canvas to match window
        this.resize();
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    // Initialize event listeners for user interaction
    setupEventListeners() {
        window.addEventListener('resize', () => this.resize());
        
        // Mouse wheel for zooming
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.handleZoom(e);
        });
        
        // Mouse for panning and body creation
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 1) { // Middle mouse button
                this.isPanning = true;
                this.canvas.style.cursor = 'grabbing';
            } else if (e.button === 2) { // Right mouse button
                this.startBodySpawn(e);
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            this.updateMousePos(e);
            
            if (this.isPanning) {
                this.handlePan(e);
            } else if (this.spawnBody) {
                this.updateBodySpawn(e);
            }
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 1) { // Middle mouse button
                this.isPanning = false;
                this.canvas.style.cursor = 'default';
            } else if (e.button === 2 && this.spawnBody) { // Right mouse button
                this.endBodySpawn();
            }
        });
        
        // Prevent context menu on right-click
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
    
    // Resize canvas to fill window
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    // Convert screen coordinates to world coordinates
    screenToWorld(screenPos) {
        const aspectRatio = this.canvas.width / this.canvas.height;
        return {
            x: (screenPos.x / this.canvas.height) * 2 * this.scale * aspectRatio - 
                this.position.x - this.scale * aspectRatio,
            y: -(screenPos.y / this.canvas.height) * 2 * this.scale + 
                this.position.y + this.scale
        };
    }
    
    // Convert world coordinates to screen coordinates
    worldToScreen(worldPos) {
        const aspectRatio = this.canvas.width / this.canvas.height;
        return {
            x: ((worldPos.x + this.position.x + this.scale * aspectRatio) / 
                (2 * this.scale * aspectRatio)) * this.canvas.height,
            y: ((this.position.y + this.scale - worldPos.y) / 
                (2 * this.scale)) * this.canvas.height
        };
    }
    
    // Handle mouse wheel zoom
    handleZoom(e) {
        // Get mouse position before zoom
        const beforeZoom = this.screenToWorld(this.mousePos);
        
        // Apply zoom (scale)
        const zoomAmount = 1.2;
        if (e.deltaY < 0) {
            // Zoom in
            this.scale /= zoomAmount;
        } else {
            // Zoom out
            this.scale *= zoomAmount;
        }
        
        // Get mouse position after zoom
        const afterZoom = this.screenToWorld(this.mousePos);
        
        // Adjust position to keep mouse over same world coordinates
        this.position.x += (afterZoom.x - beforeZoom.x);
        this.position.y += (afterZoom.y - beforeZoom.y);
    }
    
    // Handle mouse pan
    handlePan(e) {
        if (this.lastMousePos) {
            // Calculate mouse movement in screen space
            const dx = this.mousePos.x - this.lastMousePos.x;
            const dy = this.mousePos.y - this.lastMousePos.y;
            
            // Convert to world space movement
            this.position.x -= dx * (2 * this.scale) / this.canvas.height;
            this.position.y += dy * (2 * this.scale) / this.canvas.height;
        }
        
        this.lastMousePos = { ...this.mousePos };
    }
    
    // Update mouse position
    updateMousePos(e) {
        this.mousePos = {
            x: e.clientX,
            y: e.clientY
        };
    }
    
    // Start spawning a new body
    startBodySpawn(e) {
        const worldPos = this.screenToWorld(this.mousePos);
        
        this.spawnBody = {
            pos: { ...worldPos },
            vel: { x: 0, y: 0 },
            mass: 1.0,
            radius: 1.0
        };
        
        this.spawnAngle = null;
        this.spawnTotal = 0;
    }
    
    // Update body being spawned
    updateBodySpawn(e) {
        if (!this.spawnBody) return;
        
        const worldPos = this.screenToWorld(this.mousePos);
        
        // Calculate velocity based on mouse position
        this.spawnBody.vel = {
            x: worldPos.x - this.spawnBody.pos.x,
            y: worldPos.y - this.spawnBody.pos.y
        };
        
        // Update mass based on circular motion
        const dx = worldPos.x - this.spawnBody.pos.x;
        const dy = worldPos.y - this.spawnBody.pos.y;
        const angle = Math.atan2(dy, dx);
        
        if (this.spawnAngle !== null) {
            let angleDiff = angle - this.spawnAngle;
            // Normalize to [-PI, PI]
            angleDiff = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;
            
            this.spawnTotal -= angleDiff;
            this.spawnBody.mass = Math.pow(2, this.spawnTotal / (2 * Math.PI));
            this.spawnBody.radius = Math.cbrt(this.spawnBody.mass);
        }
        
        this.spawnAngle = angle;
    }
    
    // Finish spawning a body and return it
    endBodySpawn() {
        const body = { ...this.spawnBody };
        this.spawnBody = null;
        this.spawnAngle = null;
        this.spawnTotal = null;
        return body;
    }
    
    // Clear the canvas
    clear() {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    // Update FPS counter
    updateFps(timestamp) {
        if (!this.lastFrameTime) {
            this.lastFrameTime = timestamp;
            return;
        }
        
        const deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;
        this.frameTime = deltaTime;
        
        // Update FPS display every interval
        if (timestamp - this.lastFpsUpdate > this.fpsUpdateInterval) {
            this.fps = Math.round(1000 / this.frameTime);
            this.lastFpsUpdate = timestamp;
            
            // Update the FPS counter in the DOM
            const fpsElement = document.getElementById('fps');
            if (fpsElement) {
                fpsElement.textContent = this.fps;
            }
        }
    }
    
    // Render the simulation
    render(simulation, timestamp) {
        this.updateFps(timestamp);
        
        // Clear canvas
        this.clear();
        
        // Update stats
        document.getElementById('bodyCount').textContent = simulation.bodies.length;
        document.getElementById('nodeCount').textContent = simulation.quadtree.nodes.length;
        
        // Render quadtree if enabled
        if (this.showQuadtree) {
            this.renderQuadtree(simulation.quadtree);
        }
        
        // Render bodies
        if (this.showBodies) {
            this.renderBodies(simulation.bodies);
        }
        
        // Render spawn preview if active
        if (this.spawnBody) {
            this.renderSpawnPreview();
        }
    }
    
    // Render all bodies
    renderBodies(bodies) {
        for (const body of bodies) {
            // Scale radius for visibility
            const radius = Math.max(1, body.radius);
            
            // Convert world to screen coordinates
            const screenPos = this.worldToScreen(body.pos);
            
            // Scale radius to screen space
            const screenRadius = radius * this.canvas.height / (2 * this.scale);
            
            // Draw the body
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, 2 * Math.PI);
            
            // Color based on mass
            const intensity = Math.min(255, Math.max(100, Math.log2(body.mass) * 20 + 128));
            this.ctx.fillStyle = `rgb(${intensity}, ${intensity}, ${intensity})`;
            this.ctx.fill();
        }
    }
    
    // Render the quadtree for visualization
    renderQuadtree(quadtree) {
        if (!quadtree.nodes.length) return;
        
        // Calculate depth range if needed
        let minDepth = Infinity;
        let maxDepth = 0;
        
        // Traverse the quadtree to find min/max depths
        const stack = [{ node: quadtree.nodes[0], depth: 0 }];
        while (stack.length > 0) {
            const { node, depth } = stack.pop();
            
            if (node.isLeaf()) {
                minDepth = Math.min(minDepth, depth);
                maxDepth = Math.max(maxDepth, depth);
            } else if (node.children) {
                for (const child of node.children) {
                    stack.push({ node: child, depth: depth + 1 });
                }
            }
        }
        
        this.quadtreeDepthRange = { min: minDepth, max: maxDepth };
        
        // Draw quadtree nodes
        const stack2 = [{ node: quadtree.nodes[0], depth: 0 }];
        while (stack2.length > 0) {
            const { node, depth } = stack2.pop();
            
            // Draw node
            const quad = node.quad;
            
            // Convert to screen coordinates
            const topLeft = this.worldToScreen({
                x: quad.center.x - quad.size/2,
                y: quad.center.y + quad.size/2
            });
            
            const bottomRight = this.worldToScreen({
                x: quad.center.x + quad.size/2,
                y: quad.center.y - quad.size/2
            });
            
            const width = bottomRight.x - topLeft.x;
            const height = bottomRight.y - topLeft.y;
            
            // Color based on depth and if the node has mass
            const t = (depth - this.quadtreeDepthRange.min) / 
                      (this.quadtreeDepthRange.max - this.quadtreeDepthRange.min + 1);
            
            // Use hue to represent depth
            const h = 240 - t * 240; // From blue to red
            const s = node.isEmpty() ? 20 : 80; // Less saturated if empty
            const l = 20 + t * 40; // Brightness increases with depth
            
            this.ctx.strokeStyle = `hsl(${h}, ${s}%, ${l}%)`;
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(topLeft.x, topLeft.y, width, height);
            
            // If it's not a leaf, add children to the stack
            if (node.isBranch() && node.children) {
                for (const child of node.children) {
                    stack2.push({ node: child, depth: depth + 1 });
                }
            }
        }
    }
    
    // Render the spawn preview
    renderSpawnPreview() {
        if (!this.spawnBody) return;
        
        const screenPos = this.worldToScreen(this.spawnBody.pos);
        const screenRadius = this.spawnBody.radius * this.canvas.height / (2 * this.scale);
        
        // Draw body
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fill();
        
        // Draw velocity vector
        const endPos = this.worldToScreen({
            x: this.spawnBody.pos.x + this.spawnBody.vel.x,
            y: this.spawnBody.pos.y + this.spawnBody.vel.y
        });
        
        this.ctx.beginPath();
        this.ctx.moveTo(screenPos.x, screenPos.y);
        this.ctx.lineTo(endPos.x, endPos.y);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }