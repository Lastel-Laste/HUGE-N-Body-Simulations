// Simulation class handles the physics calculations and state updates
class Simulation {
    constructor(options = {}) {
        // Default simulation parameters
        this.dt = options.dt || 0.01;                      // Time step
        this.numBodies = options.numBodies || 1000;        // Number of bodies
        this.theta = options.theta || 0.5;                 // Barnes-Hut approximation threshold
        this.epsilon = options.epsilon || 1.0;             // Softening parameter
        this.gravitationalConstant = options.g || 1.0;     // Gravitational constant
        
        // Initialize collections
        this.bodies = [];
        this.quadtree = new Quadtree(this.theta, this.epsilon);
        
        // Performance optimization: Use a spatial hash grid for collision detection
        this.gridSize = 10; // Approximate size of cells for spatial hashing
        this.spatialGrid = new Map();
        
        // Initialize simulation
        this.reset();
    }
    
    // Reset the simulation with new bodies
    reset() {
        this.bodies = this.generateBodies(this.numBodies);
    }
    
    // Create a spiral galaxy formation
    generateBodies(numBodies) {
        const bodies = [];
        
        // Create a central massive body
        const centralMass = 5000;
        const centralBody = new Body(
            Vec2.zero(),
            Vec2.zero(),
            centralMass,
            Math.cbrt(centralMass) * 2  // Radius
        );
        bodies.push(centralBody);
        
        // Create spiral galaxy formation
        const innerRadius = 10;
        const outerRadius = Math.sqrt(numBodies) * 5;
        
        // For better performance, create an array upfront instead of multiple push operations
        bodies.length = numBodies;
        bodies[0] = centralBody;
        
        for (let i = 1; i < numBodies; i++) {
            // Spiral distribution
            const angle = i * 0.5;
            const t = innerRadius / outerRadius;
            const r = Math.random() * (1 - t * t) + t * t;
            const radius = outerRadius * Math.sqrt(r);
            
            // Spiral position
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const pos = new Vec2(x, y);
            
            // Stable orbital velocity (perpendicular to radial direction)
            const orbitSpeed = Math.sqrt((centralMass + i) / radius) * 0.3;
            const vx = -y / radius * orbitSpeed;
            const vy = x / radius * orbitSpeed;
            const vel = new Vec2(vx, vy);
            
            // Create body with mass between 0.1 and 2
            const mass = 0.1 + Math.random() * 1.9;
            const bodyRadius = Math.cbrt(mass);
            
            bodies[i] = new Body(pos, vel, mass, bodyRadius);
        }
        
        return bodies;
    }
    
    // Add a body to the simulation
    addBody(body) {
        this.bodies.push(body);
    }
    
    // Simulation step
    step() {
        this.calculateForces();
        this.integrate();
        
        // Use spatial grid for collision detection only when there are many bodies
        if (this.bodies.length > 500) {
            this.handleCollisionsWithSpatialHash();
        } else {
            this.handleCollisions();
        }
    }
    
    // Calculate gravitational forces (Barnes-Hut algorithm)
    calculateForces() {
        // Create quadtree containing all bodies
        const quad = Quad.newContaining(this.bodies);
        this.quadtree.clear(quad);
        
        // Insert bodies into quadtree
        for (const body of this.bodies) {
            this.quadtree.insert(body);
        }
        
        // Calculate acceleration for each body
        // Use parallel processing if available
        if (typeof Worker !== 'undefined' && this.bodies.length > 5000) {
            // Web Worker approach could be implemented here for large simulations
            // For now, fallback to sequential processing
            for (const body of this.bodies) {
                body.acc = this.quadtree.calculateAcceleration(body);
            }
        } else {
            // Standard sequential processing
            for (const body of this.bodies) {
                body.acc = this.quadtree.calculateAcceleration(body);
            }
        }
    }
    
    // Update positions and velocities
    integrate() {
        for (const body of this.bodies) {
            body.update(this.dt);
        }
    }
    
    // Handle collisions (traditional O(n²) approach)
    handleCollisions() {
        const len = this.bodies.length;
        
        for (let i = 0; i < len; i++) {
            const bodyA = this.bodies[i];
            
            for (let j = i + 1; j < len; j++) {
                const bodyB = this.bodies[j];
                
                // Quick distance check to avoid unnecessary calculations
                const dx = bodyB.pos.x - bodyA.pos.x;
                const dy = bodyB.pos.y - bodyA.pos.y;
                const minDistance = bodyA.radius + bodyB.radius;
                
                // Square comparison to avoid square root calculation
                if (dx * dx + dy * dy < minDistance * minDistance) {
                    this.resolveCollision(bodyA, bodyB, dx, dy);
                }
            }
        }
    }
    
    // Handle collisions using spatial hashing (more efficient for many bodies)
    handleCollisionsWithSpatialHash() {
        // Clear previous grid
        this.spatialGrid.clear();
        
        // Add bodies to grid
        for (let i = 0; i < this.bodies.length; i++) {
            const body = this.bodies[i];
            const gridX = Math.floor(body.pos.x / this.gridSize);
            const gridY = Math.floor(body.pos.y / this.gridSize);
            
            // Check 9 neighboring cells
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const key = `${gridX + dx},${gridY + dy}`;
                    
                    // Check for collisions with bodies in this cell
                    if (this.spatialGrid.has(key)) {
                        const cellBodies = this.spatialGrid.get(key);
                        
                        for (const otherBody of cellBodies) {
                            // Avoid checking the same pair twice
                            if (body === otherBody) continue;
                            
                            // Calculate distance
                            const dx = otherBody.pos.x - body.pos.x;
                            const dy = otherBody.pos.y - body.pos.y;
                            const minDistance = body.radius + otherBody.radius;
                            
                            // Square comparison to avoid square root calculation
                            if (dx * dx + dy * dy < minDistance * minDistance) {
                                this.resolveCollision(body, otherBody, dx, dy);
                            }
                        }
                    }
                }
            }
            
            // Add this body to the grid
            const key = `${gridX},${gridY}`;
            if (!this.spatialGrid.has(key)) {
                this.spatialGrid.set(key, []);
            }
            this.spatialGrid.get(key).push(body);
        }
    }
    
    // Resolve a collision between two bodies
    resolveCollision(bodyA, bodyB, dx, dy) {
        // Calculate distance
        const distSq = dx * dx + dy * dy;
        const distance = Math.sqrt(distSq);
        const minDistance = bodyA.radius + bodyB.radius;
        
        // Calculate normalized direction vector
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Calculate relative velocity
        const dvx = bodyB.vel.x - bodyA.vel.x;
        const dvy = bodyB.vel.y - bodyA.vel.y;
        
        // Calculate velocity along normal
        const velAlongNormal = dvx * nx + dvy * ny;
        
        // Only process if bodies are moving toward each other
        if (velAlongNormal < 0) {
            // Coefficient of restitution (elasticity)
            const restitution = 0.5;
            
            // Calculate impulse scalar
            const totalMass = bodyA.mass + bodyB.mass;
            const impulse = -(1 + restitution) * velAlongNormal / totalMass;
            
            // Apply impulse
            const impulseX = impulse * nx;
            const impulseY = impulse * ny;
            
            bodyA.vel.x -= impulseX * bodyB.mass;
            bodyA.vel.y -= impulseY * bodyB.mass;
            bodyB.vel.x += impulseX * bodyA.mass;
            bodyB.vel.y += impulseY * bodyA.mass;
            
            // Separate bodies
            const percent = 0.2; // Penetration resolution percentage (0-1)
            const correction = percent * (minDistance - distance) / totalMass;
            const correctionX = nx * correction;
            const correctionY = ny * correction;
            
            bodyA.pos.x -= correctionX * bodyB.mass;
            bodyA.pos.y -= correctionY * bodyB.mass;
            bodyB.pos.x += correctionX * bodyA.mass;
            bodyB.pos.y += correctionY * bodyA.mass;
        }
    }
    
    // Update simulation parameters
    updateParameters(params) {
        if (params.numBodies !== undefined && params.numBodies !== this.numBodies) {
            this.numBodies = params.numBodies;
            this.reset();
        }
        if (params.dt !== undefined) this.dt = params.dt;
        if (params.theta !== undefined) {
            this.theta = params.theta;
            this.quadtree.theta = params.theta;
            this.quadtree.thetaSquared = params.theta * params.theta;
        }
        if (params.epsilon !== undefined) {
            this.epsilon = params.epsilon;
            this.quadtree.epsilon = params.epsilon;
            this.quadtree.epsilonSquared = params.epsilon * params.epsilon;
        }
        if (params.g !== undefined) this.gravitationalConstant = params.g;
    }
}
