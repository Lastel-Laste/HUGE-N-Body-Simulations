import { Body } from './body.js';
import { Quadtree } from './quadtree.js';
import { Vec2 } from './vector.js';

export class Simulation {
    constructor() {
        this.bodies = [];
        this.quadtree = new Quadtree(0.8, 1.0); // theta = 0.8, epsilon = 1.0
        this.dt = 0.05; // Time step
        this.frame = 0;
    }

    // Reset the simulation with new parameters
    reset(params = {}) {
        const {
            particleCount = 10000,
            theta = 0.8,
            epsilon = 1.0,
            timeStep = 0.05
        } = params;

        this.bodies = [];
        this.quadtree = new Quadtree(theta, epsilon);
        this.dt = timeStep;
        this.frame = 0;

        // Initialize with particles in a disc
        this.initializeDisc(particleCount);
    }

    // Initialize particles in a disc shape with a massive central body
    initializeDisc(count) {
        const innerRadius = 25;
        const outerRadius = Math.sqrt(count) * 5;

        // Create a massive central body
        const centralMass = 1e6;
        const center = new Body(Vec2.create(0, 0), Vec2.zero(), centralMass, innerRadius);
        this.bodies.push(center);

        // Create smaller bodies orbiting the central mass
        while (this.bodies.length < count) {
            const angle = Math.random() * Math.PI * 2;
            const sinA = Math.sin(angle);
            const cosA = Math.cos(angle);
            
            // Use a distribution that concentrates particles more toward the center
            const t = innerRadius / outerRadius;
            const r = Math.random() * (1 - t*t) + t*t;
            const radius = outerRadius * Math.sqrt(r);
            
            const pos = Vec2.create(cosA * radius, sinA * radius);
            
            // Initial velocity for a stable orbit (perpendicular to radial direction)
            const vel = Vec2.create(sinA, -cosA);
            const mass = 1.0;
            const bodyRadius = Math.cbrt(mass); // Radius proportional to cube root of mass
            
            this.bodies.push(new Body(pos, vel, mass, bodyRadius));
        }

        // Sort bodies by distance from center for better initial distribution
        this.bodies.sort((a, b) => Vec2.magSq(a.pos) - Vec2.magSq(b.pos));
        
        // Adjust velocities to create a stable orbit
        let mass = 0;
        for (let i = 0; i < this.bodies.length; i++) {
            mass += this.bodies[i].mass;
            
            // Skip the central body
            if (Vec2.magSq(this.bodies[i].pos) === 0) {
                continue;
            }
            
            // Set velocity for a stable orbit
            const distance = Vec2.mag(this.bodies[i].pos);
            const v = Math.sqrt(mass / distance);
            
            // Scale the initial velocity to the calculated orbital velocity
            this.bodies[i].vel = Vec2.mul(
                Vec2.normalize(this.bodies[i].vel), 
                v
            );
        }
    }

    // Perform one simulation step
    step() {
        this.attract();  // Calculate forces and update accelerations
        this.update();   // Update positions and velocities
        this.handleCollisions(); // Check for and resolve collisions
        this.frame++;
    }

    // Update all body positions based on velocities and accelerations
    update() {
        for (const body of this.bodies) {
            body.update(this.dt);
        }
    }

    // Calculate gravitational forces between bodies using Barnes-Hut algorithm
    attract() {
        // Rebuild the quadtree
        this.quadtree.buildFromBodies(this.bodies);
        
        // Calculate acceleration for each body
        for (const body of this.bodies) {
            body.resetAcceleration();
            const acc = this.quadtree.calculateAcceleration(body);
            body.applyForce({ x: acc.x * body.mass, y: acc.y * body.mass });
        }
    }

    // Handle collisions between bodies
    handleCollisions() {
        // Simple n^2 collision detection for now
        // This can be optimized using a grid or another quadtree
        for (let i = 0; i < this.bodies.length; i++) {
            for (let j = i + 1; j < this.bodies.length; j++) {
                this.resolveCollision(this.bodies[i], this.bodies[j]);
            }
        }
    }

    // Resolve collision between two bodies
    resolveCollision(bodyA, bodyB) {
        const posA = bodyA.pos;
        const posB = bodyB.pos;
        
        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        
        const distSq = dx*dx + dy*dy;
        const radiiSum = bodyA.radius + bodyB.radius;
        
        // Check if bodies are colliding
        if (distSq <= radiiSum * radiiSum) {
            const dist = Math.sqrt(distSq);
            
            // Move bodies apart to prevent overlap
            const overlap = 0.5 * (radiiSum - dist);
            const moveX = (dx / dist) * overlap;
            const moveY = (dy / dist) * overlap;
            
            // Adjust positions based on relative mass (conservation of momentum)
            const totalMass = bodyA.mass + bodyB.mass;
            const ratioA = bodyB.mass / totalMass;
            const ratioB = bodyA.mass / totalMass;
            
            // Move bodies apart
            posA.x -= moveX * ratioA;
            posA.y -= moveY * ratioA;
            posB.x += moveX * ratioB;
            posB.y += moveY * ratioB;
            
            // Calculate impulse for collision response
            const velDx = bodyB.vel.x - bodyA.vel.x;
            const velDy = bodyB.vel.y - bodyA.vel.y;
            
            // Dot product of normal and relative velocity
            const normalVel = (dx * velDx + dy * velDy) / dist;
            
            // Only resolve if bodies are moving toward each other
            if (normalVel < 0) {
                // Semi-elastic collision
                const restitution = 0.8; // 1.0 is perfectly elastic
                const impulse = (-(1 + restitution) * normalVel) / totalMass;
                
                // Apply impulse to velocities
                bodyA.vel.x -= impulse * dx * bodyB.mass / dist;
                bodyA.vel.y -= impulse * dy * bodyB.mass / dist;
                bodyB.vel.x += impulse * dx * bodyA.mass / dist;
                bodyB.vel.y += impulse * dy * bodyA.mass / dist;
            }
        }
    }
}
