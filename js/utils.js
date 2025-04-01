import { Vec2 } from './vector.js';
import { Body } from './body.js';

// Generate random particles in a disc around a central mass
export function generateDisc(count, innerRadius = 25, outerRadius = null) {
    // If outerRadius is not specified, calculate based on particle count
    if (!outerRadius) {
        outerRadius = Math.sqrt(count) * 5;
    }
    
    const bodies = [];
    
    // Add a massive central body
    const centralMass = 1e6; // 1 million mass units
    const center = new Body(
        Vec2.create(0, 0),
        Vec2.create(0, 0),
        centralMass,
        innerRadius
    );
    bodies.push(center);
    
    // Seed the random number generator for consistency if needed
    // Math.seedrandom(42); // If using seedrandom library
    
    // Add particles in a disc pattern
    while (bodies.length < count) {
        // Generate random angle
        const angle = Math.random() * Math.PI * 2;
        const sinA = Math.sin(angle);
        const cosA = Math.cos(angle);
        
        // Use a distribution that concentrates particles toward inner radius
        const t = innerRadius / outerRadius;
        const r = Math.random() * (1 - t*t) + t*t;
        const radius = outerRadius * Math.sqrt(r);
        
        // Calculate position
        const pos = Vec2.create(
            cosA * radius,
            sinA * radius
        );
        
        // Initial velocity (perpendicular to position vector for orbit)
        // Scale will be adjusted later
        const vel = Vec2.create(sinA, -cosA);
        
        // Mass and radius
        const mass = 1.0;
        const bodyRadius = Math.cbrt(mass); // Radius scales with cube root of mass
        
        bodies.push(new Body(pos, vel, mass, bodyRadius));
    }
    
    // Sort bodies by distance from center for better orbit calculation
    bodies.sort((a, b) => Vec2.magSq(a.pos) - Vec2.magSq(b.pos));
    
    // Adjust velocities for stable orbit
    let cumulativeMass = 0;
    for (let i = 0; i < bodies.length; i++) {
        cumulativeMass += bodies[i].mass;
        
        // Skip the central body
        if (Vec2.magSq(bodies[i].pos) === 0) {
            continue;
        }
        
        // Calculate orbital velocity based on accumulated mass
        // v = sqrt(GM/r) where G=1 in our simulation
        const distance = Vec2.mag(bodies[i].pos);
        const orbitalVelocity = Math.sqrt(cumulativeMass / distance);
        
        // Set velocity to correct magnitude
        bodies[i].vel = Vec2.mul(
            Vec2.normalize(bodies[i].vel),
            orbitalVelocity
        );
    }
    
    return bodies;
}

// Generate a random color based on a value
export function colorFromValue(value, min, max) {
    // Normalize value to 0-1 range
    const t = (value - min) / (max - min);
    
    // Use HSL color space for more visually pleasing colors
    const h = 240 - t * 240; // Blue to red
    const s = 80;
    const l = 50;
    
    return `hsl(${h}, ${s}%, ${l}%)`;
}

// Linear interpolation between two values
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

// Format a number with comma separators
export function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
