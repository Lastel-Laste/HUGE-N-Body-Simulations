// Vector utility functions

export const Vec2 = {
    // Create a new 2D vector
    create(x = 0, y = 0) {
        return { x, y };
    },

    // Create a copy of a vector
    clone(v) {
        return { x: v.x, y: v.y };
    },

    // Vector addition: result = a + b
    add(a, b) {
        return { x: a.x + b.x, y: a.y + b.y };
    },

    // Vector subtraction: result = a - b
    sub(a, b) {
        return { x: a.x - b.x, y: a.y - b.y };
    },

    // Scalar multiplication: result = v * scalar
    mul(v, scalar) {
        return { x: v.x * scalar, y: v.y * scalar };
    },

    // Scalar division: result = v / scalar
    div(v, scalar) {
        return { x: v.x / scalar, y: v.y / scalar };
    },

    // Dot product of two vectors
    dot(a, b) {
        return a.x * b.x + a.y * b.y;
    },

    // Magnitude squared (length squared) of a vector
    magSq(v) {
        return v.x * v.x + v.y * v.y;
    },

    // Magnitude (length) of a vector
    mag(v) {
        return Math.sqrt(this.magSq(v));
    },

    // Normalize a vector (make it unit length)
    normalize(v) {
        const length = this.mag(v);
        if (length === 0) return { x: 0, y: 0 };
        return this.div(v, length);
    },

    // Return a zero vector
    zero() {
        return { x: 0, y: 0 };
    },

    // Distance between two vectors
    distance(a, b) {
        return this.mag(this.sub(a, b));
    },

    // Distance squared between two vectors (more efficient)
    distanceSq(a, b) {
        return this.magSq(this.sub(a, b));
    },

    // Linear interpolation between two vectors
    lerp(a, b, t) {
        return {
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t
        };
    },

    // Return angle of vector in radians
    angle(v) {
        return Math.atan2(v.y, v.x);
    },

    // Create vector from angle and magnitude
    fromAngle(angle, mag = 1) {
        return {
            x: Math.cos(angle) * mag,
            y: Math.sin(angle) * mag
        };
    }
};
