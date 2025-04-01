// Quad class represents a square region in the simulation
class Quad {
    constructor(center, size) {
        this.center = center;
        this.size = size;
    }

    // Create a quad that contains all bodies
    static newContaining(bodies) {
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

        // Add some margin to ensure all bodies are fully contained
        const margin = 1;
        minX -= margin;
        minY -= margin;
        maxX += margin;
        maxY += margin;

        const center = new Vec2(
            (minX + maxX) * 0.5,
            (minY + maxY) * 0.5
        );
        
        const size = Math.max(maxX - minX, maxY - minY);

        return new Quad(center, size);
    }

    // Determine which quadrant a position falls into
    findQuadrant(pos) {
        const isEast = pos.x > this.center.x;
        const isSouth = pos.y > this.center.y;
        
        if (isEast) {
            return isSouth ? 3 : 1;  // SE : NE
        } else {
            return isSouth ? 2 : 0;  // SW : NW
        }
    }

    // Create a new quad for the specified quadrant
    intoQuadrant(quadrant) {
        const halfSize = this.size * 0.5;
        
        // Determine the offset for the new center based on quadrant
        let offsetX, offsetY;
        
        switch(quadrant) {
            case 0: // NW
                offsetX = -halfSize * 0.5;
                offsetY = -halfSize * 0.5;
                break;
            case 1: // NE
                offsetX = halfSize * 0.5;
                offsetY = -halfSize * 0.5;
                break;
            case 2: // SW
                offsetX = -halfSize * 0.5;
                offsetY = halfSize * 0.5;
                break;
            case 3: // SE
                offsetX = halfSize * 0.5;
                offsetY = halfSize * 0.5;
                break;
        }
        
        const newCenter = new Vec2(
            this.center.x + offsetX,
            this.center.y + offsetY
        );
        
        return new Quad(newCenter, halfSize);
    }

    // Create four quads for the quadrants
    subdivide() {
        return [
            this.intoQuadrant(0),  // NW
            this.intoQuadrant(1),  // NE
            this.intoQuadrant(2),  // SW
            this.intoQuadrant(3)   // SE
        ];
    }
}

// Node class represents a node in the quadtree
class Node {
    constructor(quad) {
        this.children = null;   // Array of 4 nodes if this is an internal node
        this.body = null;       // Reference to a body if this is a leaf node
        this.centerOfMass = Vec2.zero();
        this.totalMass = 0;
        this.quad = quad;
    }

    // Check if this node is a leaf (has no children)
    isLeaf() {
        return this.children === null;
    }

    // Check if this node is a branch (has children)
    isBranch() {
        return this.children !== null;
    }

    // Check if this node is empty (has no body or mass)
    isEmpty() {
        return this.totalMass === 0;
    }
}

// Quadtree class implements the Barnes-Hut algorithm
class Quadtree {
    constructor(theta = 0.5, epsilon = 1.0) {
        this.theta = theta;         // Accuracy parameter (smaller = more accurate)
        this.thetaSquared = theta * theta;
        this.epsilon = epsilon;     // Softening parameter to prevent division by zero
        this.epsilonSquared = epsilon * epsilon;
        this.root = null;
        this.nodes = [];            // For visualization
    }

    // Clear the quadtree and initialize with a new root node
    clear(quad) {
        this.root = new Node(quad);
        this.nodes = [this.root];
    }

    // Insert a body into the quadtree
    insert(body) {
        this._insert(this.root, body);
    }

    // Recursive helper for inserting a body
    _insert(node, body) {
        // If node is empty, put the body here
        if (node.isEmpty()) {
            node.body = body;
            node.centerOfMass = body.pos.clone();
            node.totalMass = body.mass;
            return;
        }

        // If this is a leaf with a body already in it
        if (node.isLeaf() && node.body !== null) {
            const existingBody = node.body;
            
            // Subdivide the node
            node.children = new Array(4);
            for (let i = 0; i < 4; i++) {
                node.children[i] = new Node(node.quad.intoQuadrant(i));
                this.nodes.push(node.children[i]); // For visualization
            }
            
            // Re-insert the existing body
            const quadrant1 = node.quad.findQuadrant(existingBody.pos);
            this._insert(node.children[quadrant1], existingBody);
            
            // Insert the new body
            const quadrant2 = node.quad.findQuadrant(body.pos);
            this._insert(node.children[quadrant2], body);
            
            // Clear the body from this node as it's now a branch
            node.body = null;
        } 
        // If this is already a branch node
        else if (node.isBranch()) {
            // Determine which quadrant the body belongs to
            const quadrant = node.quad.findQuadrant(body.pos);
            
            // Insert the body into the appropriate child
            this._insert(node.children[quadrant], body);
        }

        // Update center of mass and total mass for this node
        this._updateMass(node);
    }

    // Update the center of mass and total mass of a node based on its children
    _updateMass(node) {
        // If this is a leaf with a body
        if (node.isLeaf() && node.body !== null) {
            node.centerOfMass = node.body.pos.clone();
            node.totalMass = node.body.mass;
            return;
        }
        
        // If this is a branch, aggregate from children
        if (node.isBranch()) {
            node.centerOfMass = Vec2.zero();
            node.totalMass = 0;
            
            for (const child of node.children) {
                if (!child.isEmpty()) {
                    // Weighted contribution to center of mass
                    node.centerOfMass.addInPlace(child.centerOfMass.mul(child.totalMass));
                    node.totalMass += child.totalMass;
                }
            }
            
            // Normalize to get true center of mass
            if (node.totalMass > 0) {
                node.centerOfMass.divInPlace(node.totalMass);
            }
        }
    }

    // Calculate acceleration on a body due to all other bodies
    calculateAcceleration(body) {
        return this._calculateAcceleration(this.root, body.pos);
    }

    // Recursive helper for calculating acceleration
    _calculateAcceleration(node, pos) {
        // If the node is empty, no force
        if (node.isEmpty()) {
            return Vec2.zero();
        }

        // Calculate distance to the center of mass
        const direction = node.centerOfMass.sub(pos);
        const distanceSquared = direction.magSq();
        
        // If this is a leaf node or the node is far enough away
        // to be approximated as a single body
        if (node.isLeaf() || (node.quad.size * node.quad.size) / distanceSquared < this.thetaSquared) {
            // Prevent division by zero and excessive forces at very small distances
            if (distanceSquared < 0.0001) {
                return Vec2.zero();
            }
            
            // Calculate gravitational force using Newton's law
            const distance = Math.sqrt(distanceSquared);
            const forceMagnitude = node.totalMass / (distanceSquared * distance + this.epsilonSquared);
            
            return direction.mul(forceMagnitude);
        }
        
        // Otherwise, recursively calculate forces from each child
        let acceleration = Vec2.zero();
        for (const child of node.children) {
            acceleration.addInPlace(this._calculateAcceleration(child, pos));
        }
        
        return acceleration;
    }
}
