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
            Math.cbrt(centralMass) * 2  // 반지름
        );
        bodies.push(centralBody);
        
        // 나선 은하 형성
        const innerRadius = 10;
        const outerRadius = Math.sqrt(numBodies) * 5;
        
        for (let i = 1; i < numBodies; i++) {
            // 나선 분포
            const angle = i * 0.5;
            const t = innerRadius / outerRadius;
            const r = Math.random() * (1 - t * t) + t * t;
            const radius = outerRadius * Math.sqrt(r);
            
            // 나선 위치
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const pos = new Vec2(x, y);
            
            // 안정적인 궤도 속도 (방사 방향에 수직)
            const orbitSpeed = Math.sqrt((centralMass + i) / radius) * 0.3;
            const vx = -y / radius * orbitSpeed;
            const vy = x / radius * orbitSpeed;
            const vel = new Vec2(vx, vy);
            
            // 질량 0.1 ~ 2 사이의 바디 생성
            const mass = 0.1 + Math.random() * 1.9;
            const bodyRadius = Math.cbrt(mass);
            
            bodies.push(new Body(pos, vel, mass, bodyRadius));
        }
        
        return bodies;
    }
    
    // 바디 추가
    addBody(body) {
        this.bodies.push(body);
    }
    
    // 시뮬레이션 스텝
    step() {
        this.calculateForces();
        this.integrate();
        this.handleCollisions();
    }
    
    // 중력 힘 계산 (Barnes-Hut 알고리즘)
    calculateForces() {
        // 모든 바디를 포함하는 쿼드트리 생성
        const quad = Quad.newContaining(this.bodies);
        this.quadtree.clear(quad);
        
        // 쿼드트리에 바디 삽입
        for (const body of this.bodies) {
            this.quadtree.insert(body);
        }
        
        // 각 바디의 가속도 계산
        for (const body of this.bodies) {
            body.acc = this.quadtree.calculateAcceleration(body);
        }
    }
    
    // 위치와 속도 업데이트
    integrate() {
        for (const body of this.bodies) {
            body.update(this.dt);
        }
    }
    
    // 충돌 처리
    handleCollisions() {
        for (let i = 0; i < this.bodies.length; i++) {
            const bodyA = this.bodies[i];
            
            for (let j = i + 1; j < this.bodies.length; j++) {
                const bodyB = this.bodies[j];
                
                // 바디 간 거리 계산
                const diff = bodyB.pos.sub(bodyA.pos);
                const distance = diff.mag();
                const minDistance = bodyA.radius + bodyB.radius;
                
                // 충돌 감지
                if (distance < minDistance) {
                    // 충돌 노멀 및 상대 속도 계산
                    const normal = diff.div(distance);
                    const relVel = bodyB.vel.sub(bodyA.vel);
                    const velAlongNormal = relVel.dot(normal);
                    
                    // 서로 가까워지는 경우에만 처리
                    if (velAlongNormal < 0) {
                        // 충격량 계산
                        const restitution = 0.5; // 반발 계수
                        const totalMass = bodyA.mass + bodyB.mass;
                        const impulse = -(1 + restitution) * velAlongNormal;
                        const impulseScalar = impulse / totalMass;
                        
                        // 충격 적용
                        const impulseVector = normal.mul(impulseScalar);
                        bodyA.vel.subInPlace(impulseVector.mul(bodyB.mass));
                        bodyB.vel.addInPlace(impulseVector.mul(bodyA.mass));
                        
                        // 바디 분리
                        const correction = normal.mul(0.2 * (minDistance - distance));
                        bodyA.pos.subInPlace(correction.mul(bodyB.mass / totalMass));
                        bodyB.pos.addInPlace(correction.mul(bodyA.mass / totalMass));
                    }
                }
            }
        }
    }
    
    // 시뮬레이션 매개변수 업데이트
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
