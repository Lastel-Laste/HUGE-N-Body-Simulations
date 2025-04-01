// Vector2 implementation similar to ultraviolet::Vec2 in the Rust code
class Vec2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    // Create a vector with components (0, 0)
    static zero() {
        return new Vec2(0, 0);
    }

    // Create a vector with components (1, 1)
    static one() {
        return new Vec2(1, 1);
    }

    // Copy this vector
    clone() {
        return new Vec2(this.x, this.y);
    }

    // Vector addition
    add(other) {
        return new Vec2(this.x + other.x, this.y + other.y);
    }

    // Vector subtraction
    sub(other) {
        return new Vec2(this.x - other.x, this.y - other.y);
    }

    // Vector scaling
    mul(scalar) {
        return new Vec2(this.x * scalar, this.y * scalar);
    }

    // Vector division
    div(scalar) {
        return new Vec2(this.x / scalar, this.y / scalar);
    }

    // Dot product
    dot(other) {
        return this.x * other.x + this.y * other.y;
    }

    // Squared magnitude (faster than mag())
    magSq() {
        return this.x * this.x + this.y * this.y;
    }

    // Magnitude (length) of the vector
    mag() {
        return Math.sqrt(this.magSq());
    }

    // Normalize the vector (make it unit length)
    normalize() {
        const m = this.mag();
        if (m > 0) {
            return this.div(m);
        }
        return this.clone();
    }

    // Check equality
    equals(other) {
        return this.x === other.x && this.y === other.y;
    }

    // Mutable operations (modify this vector in place)
    addInPlace(other) {
        this.x += other.x;
        this.y += other.y;
        return this;
    }

    subInPlace(other) {
        this.x -= other.x;
        this.y -= other.y;
        return this;
    }

    mulInPlace(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }

    divInPlace(scalar) {
        this.x /= scalar;
        this.y /= scalar;
        return this;
    }
}
