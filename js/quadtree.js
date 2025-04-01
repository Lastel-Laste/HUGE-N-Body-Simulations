import { Vec2 } from './vector.js';

// Represents a quadrant boundary in the simulation
export class Quad {
    constructor(centerX, centerY, size) {
        this.center = Vec2.create(centerX, centerY);
        this.size = size;
    }

    static newContaining(bodies) {
        // Find bounds of all bodies
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const body of bodies) {
            minX = Math.min(minX, body.pos.x);
            minY = Math.min(minY, body.pos.y);
            maxX = Math.max(maxX, body.pos.x);
            maxY = Math.max(maxY, body.pos.y);
        }

        // Create quad with some padding to avoid edge cases
        const centerX = (minX + maxX) * 0.5;
        const centerY = (minY + maxY) * 0.5;
        const size = Math.max(maxX - minX, maxY - minY) * 1.1; // Add 10% padding

        return new Quad(centerX, centerY, size);
    }

    // Determine which quadrant a position falls into (0-3)
    findQuadrant(pos) {
        const top = pos.y > this.center.y;
        const right = pos.x > this.center.x;
        return (top ? 2 : 0) + (right ? 1 : 0);
    }

    // Create a new quad for the specified quadrant
    intoQuadrant(quadrant) {
        const halfSize = this.size * 0.5;
        const x = this.center.x + ((quadrant & 1) ? 0.5 : -0.5) * halfSize;
        const y = this.center.y + ((quadrant & 2) ? 0.5 : -0.5) * halfSize;
        return new Quad(x, y, halfSize);
    }

    // Create the four child quads
    subdivide() {
        return [0, 1, 2, 3].map(i => this.intoQuadrant(i));
    }

    // Check if a point is inside this quad
    contains(pos) {
        const halfSize = this.size * 0.5;
        return (
            pos.x >= this.center.x - halfSize &&
            pos.x <= this.center.x + halfSize &&
            pos.y >= this.center.y - halfSize &&
            pos.y <= this.center.y + halfSize
        );
    }

    // Check if this quad intersects with another quad
    intersects(other) {
        const halfSize = this.size * 0.5;
        const otherHalfSize = other.size * 0.5;
        
        return !(
            this.center.x + halfSize < other.center.x - otherHalfSize ||
            this.center.x - halfSize > other.center.x + otherHalfSize ||
            this.center.y + halfSize < other.center.y - otherHalfSize ||
            this.center.y - halfSize > other.center.y + otherHalfSize
        );
    }
}

// Node in the quadtree
export class Node {
    constructor(quad) {
        this.children = null; // Array of 4 child nodes for internal nodes
        this.pos = Vec2.create(); // Center of mass
        this.mass = 0; // Total mass
        this.quad = quad; // Boundary
        this.body = null; // For leaf nodes, the body contained
    }

    isLeaf() {
        return this.children === null;
    }

    isBranch() {
        return this.children !== null;
    }

    isEmpty() {
        return this.mass === 0;
    }
}

// Barnes-Hut Quadtree implementation
export class Quadtree {
    constructor(theta = 0.5, epsilon = 1.0) {
        this.thetaSquared = theta * theta; // Approximation parameter squared
        this.epsilonSquared = epsilon * epsilon; // Softening parameter squared
        this.root = null; // Root node
        this.nodes = []; // All nodes (for visualization)
    }

    // Reset the quadtree with a new bounding quad
    clear(quad) {
        this.root = new Node(quad);
        this.nodes = [this.root];
    }

    // Subdivide a node into 4 children
    subdivide(node) {
        if (node.children !== null) return;
        
        const quads = node.quad.subdivide();
        node.children = quads.map(quad => {
            const child = new Node(quad);
            this.nodes.push(child);
            return child;
        });
    }

    // Insert a body into the quadtree
    insert(body) {
        // If the tree is empty, create a root node
        if (!this.root) {
            this.root = new Node(Quad.newContaining([body]));
            this.nodes = [this.root];
        }

        this._insert(this.root, body);
    }

    // Recursive insertion helper
    _insert(node, body) {
        // Update node's center of mass and total mass
        if (node.isEmpty()) {
            // Empty leaf node, just store the body
            node.body = body;
            node.mass = body.mass;
            node.pos = Vec2.clone(body.pos);
        } else if (node.isLeaf()) {
            // Leaf node with a body already, need to subdivide
            const existingBody = node.body;
            node.body = null; // No longer a leaf with a specific body
            
            this.subdivide(node);
            
            // Re-insert the existing body
            const quadrant1 = node.quad.findQuadrant(existingBody.pos);
            this._insert(node.children[quadrant1], existingBody);
            
            // Insert the new body
            const quadrant2 = node.quad.findQuadrant(body.pos);
            this._insert(node.children[quadrant2], body);
            
            // Update node's mass and center of mass
            node.mass = existingBody.mass + body.mass;
            node.pos.x = (existingBody.pos.x * existingBody.mass + body.pos.x * body.mass) / node.mass;
            node.pos.y = (existingBody.pos.y * existingBody.mass + body.pos.y * body.mass) / node.mass;
        } else {
            // Internal node, determine which child to insert into
            node.mass += body.mass;
            
            // Update center of mass
            const totalMass = node.mass;
            node.pos.x = (node.pos.x * (totalMass - body.mass) + body.pos.x * body.mass) / totalMass;
            node.pos.y = (node.pos.y * (totalMass - body.mass) + body.pos.y * body.mass) / totalMass;
            
            // Insert into the correct child
            const quadrant = node.quad.findQuadrant(body.pos);
            this._insert(node.children[quadrant], body);
        }
    }

    // Calculate acceleration on a body using Barnes-Hut approximation
    calculateAcceleration(body) {
        const acceleration = Vec2.zero();
        this._calculateForce(this.root, body, acceleration);
        return acceleration;
    }

    // Recursive helper to calculate force/acceleration from a node
    _calculateForce(node, body, acceleration) {
        if (node.isEmpty() || node === null) {
            return;
        }
        
        // Vector from body to node center of mass
        const dx = node.pos.x - body.pos.x;
        const dy = node.pos.y - body.pos.y;
        
        // Skip if it's the same position to avoid division by zero
        if (dx === 0 && dy === 0) {
            return;
        }
        
        const distanceSq = dx*dx + dy*dy;
        
        // If it's a leaf node or the node is far enough away, calculate force directly
        if (node.isLeaf() || (node.quad.size * node.quad.size) / distanceSq < this.thetaSquared) {
            // Use softened force calculation to avoid huge accelerations at tiny distances
            const distance = Math.sqrt(distanceSq + this.epsilonSquared);
            const forceMagnitude = node.mass / (distance * distance * distance);
            
            // Add to acceleration (F = ma, so a = F/m which is already factored into forceMagnitude)
            acceleration.x += dx * forceMagnitude;
            acceleration.y += dy * forceMagnitude;
        } else if (node.isBranch()) {
            // If node is too close, recursively calculate forces from children
            for (const child of node.children) {
                this._calculateForce(child, body, acceleration);
            }
        }
    }

    // Build a quadtree from an array of bodies
    buildFromBodies(bodies) {
        // Create a quad that contains all bodies
        const quad = Quad.newContaining(bodies);
        this.clear(quad);
        
        // Insert all bodies
        for (const body of bodies) {
            this.insert(body);
        }
    }
}
