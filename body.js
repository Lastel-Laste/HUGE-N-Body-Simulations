// Body class represents a particle in the simulation
class Body {
    constructor(pos, vel, mass, bodyRadius) {  // Changed parameter name to bodyRadius
        this.pos = pos;
        this.vel = vel;
        this.acc = Vec2.zero();
        this.mass = mass;
        this.radius = bodyRadius;  // Use the passed parameter
    }

    // Create a copy of this body
    clone() {
        const body = new Body(
            this.pos.clone(),
            this.vel.clone(),
            this.mass,
            this.radius
        );
        body.acc = this.acc.clone();
        return body;
    }

    // Update body position and velocity based on acceleration
    update(dt) {
        // v = v + a*dt
        this.vel.addInPlace(this.acc.mul(dt));
        
        // p = p + v*dt
        this.pos.addInPlace(this.vel.mul(dt));
    }
}
