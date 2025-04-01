// A class representing a particle in the simulation
export class Body {
    constructor(pos, vel, mass = 1.0, radius = 1.0) {
        this.pos = pos; // Vector2 position
        this.vel = vel; // Vector2 velocity
        this.acc = { x: 0, y: 0 }; // Vector2 acceleration
        this.mass = mass;
        this.radius = radius;
    }

    // Update position and velocity based on acceleration
    update(dt) {
        // Update velocity
        this.vel.x += this.acc.x * dt;
        this.vel.y += this.acc.y * dt;
        
        // Update position
        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;
    }

    // Reset acceleration to zero
    resetAcceleration() {
        this.acc.x = 0;
        this.acc.y = 0;
    }

    // Apply force (acceleration) to the body
    applyForce(force) {
        this.acc.x += force.x / this.mass;
        this.acc.y += force.y / this.mass;
    }
}
