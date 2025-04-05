// Renderer class handles drawing the simulation on a canvas
class Renderer {
    constructor(canvas, simulation) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });  // alpha:false for optimization
        this.simulation = simulation;
        
        // View parameters
        this.viewPos = new Vec2(0, 0);
        this.viewScale = 50;
        
        // Visualization options
        this.showBodies = true;
        this.showQuadtree = false;
        
        // Mouse interaction state
        this.isDragging = false;
        this.lastMousePos = new Vec2(0, 0);
        this.rightMouseDown = false;
        this.spawnBody = null;
        this.spawnAngle = null;
        this.spawnTotalAngle = 0;
        
        // Performance tracking
        this.lastFrameTime = 0;
        this.frameTimeAccumulator = 0;
        this.frameCount = 0;
        this.fps = 0;
        
        // 최적화: 오프스크린 렌더링
        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        this.initOffscreenCanvas();
        
        // 최적화: 뷰포트 바운딩박스
        this.viewportBounds = {
            minX: 0, 
            minY: 0, 
            maxX: 0, 
            maxY: 0
        };
        
        // 최적화: 재사용 벡터
        this._tempVec1 = new Vec2();
        this._tempVec2 = new Vec2();
        
        // 최적화: 미리 계산된 캐시
        this._screenPositionCache = new Map();
        this._worldBoundsCache = new Map();
        
        // 최적화: 프레임 카운팅 - 렌더링 주기 조절
        this._frameCounter = 0;
        this._quadtreeRenderInterval = 5; // 쿼드트리는 5프레임마다 업데이트
        
        // Initial canvas resize
        this.resizeCanvas();
    }
    
    // 오프스크린 캔버스 초기화
    initOffscreenCanvas() {
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: false });
    }
    
    // Resize canvas to window size
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.ctx.imageSmoothingEnabled = false;
        
        // 오프스크린 캔버스도 리사이즈
        this.offscreenCanvas.width = this.canvas.width;
        this.offscreenCanvas.height = this.canvas.height;
        this.offscreenCtx.imageSmoothingEnabled = false;
        
        // 뷰포트 바운드 업데이트
        this.updateViewportBounds();
    }
    
    // 뷰포트 바운드 업데이트
    updateViewportBounds() {
        // 뷰포트 크기 계산 (월드 좌표)
        const halfWidth = this.canvas.width / 2 / (this.canvas.width / 2) * this.viewScale;
        const halfHeight = this.canvas.height / 2 / (this.canvas.height / 2) * this.viewScale;
        
        this.viewportBounds.minX = this.viewPos.x - halfWidth;
        this.viewportBounds.maxX = this.viewPos.x + halfWidth;
        this.viewportBounds.minY = this.viewPos.y - halfHeight;
        this.viewportBounds.maxY = this.viewPos.y + halfHeight;
    }
    
    // Convert screen coordinates to simulation coordinates
    screenToWorld(screenPos) {
        // 키를 생성하여 캐시 확인
        const key = `${Math.floor(screenPos.x)},${Math.floor(screenPos.y)}`;
        
        if (this._worldBoundsCache.has(key)) {
            return this._worldBoundsCache.get(key);
        }
        
        const x = (screenPos.x / this.canvas.width * 2 - 1) * this.viewScale + this.viewPos.x;
        const y = (1 - screenPos.y / this.canvas.height * 2) * this.viewScale + this.viewPos.y;
        
        // 결과를 임시 벡터에 저장
        const result = new Vec2(x, y);
        
        // 캐시가 너무 커지지 않도록 관리
        if (this._worldBoundsCache.size > 1000) {
            this._worldBoundsCache.clear();
        }
        
        // 결과 캐싱
        this._worldBoundsCache.set(key, result);
        
        return result;
    }
    
    // Convert simulation coordinates to screen coordinates
    worldToScreen(worldPos) {
        // 키를 생성하여 캐시 확인
        const key = `${Math.floor(worldPos.x * 100)},${Math.floor(worldPos.y * 100)}`;
        
        if (this._screenPositionCache.has(key)) {
            return this._screenPositionCache.get(key);
        }
        
        const x = ((worldPos.x - this.viewPos.x) / this.viewScale + 1) * this.canvas.width / 2;
        const y = ((-worldPos.y + this.viewPos.y) / this.viewScale + 1) * this.canvas.height / 2;
        
        // 결과를 임시 벡터에 저장
        const result = new Vec2(x, y);
        
        // 캐시가 너무 커지지 않도록 관리
        if (this._screenPositionCache.size > 1000) {
            this._screenPositionCache.clear();
        }
        
        // 결과 캐싱
        this._screenPositionCache.set(key, result);
        
        return result;
    }
    
    // Handle mouse down event
    onMouseDown(event) {
        const mousePos = new Vec2(event.clientX, event.clientY);
        
        if (event.button === 0) { // Left mouse button
            this.isDragging = true;
            this.lastMousePos = mousePos;
        } else if (event.button === 2) { // Right mouse button
            this.rightMouseDown = true;
            
            // Create new body at mouse position
            const worldPos = this.screenToWorld(mousePos);
            this.spawnBody = new Body(worldPos, Vec2.zero(), 1.0, 1.0);
            this.spawnAngle = null;
            this.spawnTotalAngle = 0;
        }
    }
    
    // Handle mouse move event
    onMouseMove(event) {
        const mousePos = new Vec2(event.clientX, event.clientY);
        
        if (this.isDragging) {
            // Move view
            const dx = (mousePos.x - this.lastMousePos.x) / this.canvas.width * this.viewScale * 2;
            const dy = (mousePos.y - this.lastMousePos.y) / this.canvas.height * this.viewScale * 2;
            this.viewPos.x -= dx;
            this.viewPos.y += dy;
            this.lastMousePos = mousePos;
            
            // 뷰포트 바운드 업데이트
            this.updateViewportBounds();
            
            // 캐시 비우기
            this._screenPositionCache.clear();
            this._worldBoundsCache.clear();
        }
        
        if (this.rightMouseDown && this.spawnBody) {
            const worldPos = this.screenToWorld(mousePos);
            
            // Calculate angle for body mass
            if (this.spawnAngle !== null) {
                const diff = worldPos.sub(this.spawnBody.pos);
                const newAngle = Math.atan2(diff.y, diff.x);
                let angleDiff = newAngle - this.spawnAngle;
                
                // Normalize angle difference to [-π, π] range
                if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                
                this.spawnTotalAngle -= angleDiff;
                this.spawnBody.mass = Math.pow(2, this.spawnTotalAngle / (2 * Math.PI));
                this.spawnBody.radius = Math.cbrt(this.spawnBody.mass);
                this.spawnAngle = newAngle;
            } else {
                this.spawnAngle = Math.atan2(worldPos.y - this.spawnBody.pos.y, worldPos.x - this.spawnBody.pos.x);
            }
            
            // Set velocity based on mouse position
            this.spawnBody.vel = worldPos.sub(this.spawnBody.pos);
        }
    }
    
    // Handle mouse up event
    onMouseUp(event) {
        if (event.button === 0) { // Left mouse button
            this.isDragging = false;
        } else if (event.button === 2) { // Right mouse button
            if (this.spawnBody) {
                // Add new body to simulation
                this.simulation.addBody(this.spawnBody.clone());
                this.spawnBody = null;
            }
            this.rightMouseDown = false;
        }
    }
    
    // Handle mouse wheel event
    onWheel(event) {
        // Prevent default scroll behavior
        event.preventDefault();
        
        // Get mouse position
        const mousePos = new Vec2(event.clientX, event.clientY);
        const worldBeforeZoom = this.screenToWorld(mousePos);
        
        // Adjust zoom level based on scroll direction
        const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
        this.viewScale *= zoomFactor;
        
        // Adjust view position towards mouse cursor
        const worldAfterZoom = this.screenToWorld(mousePos);
        this.viewPos.addInPlace(worldBeforeZoom.sub(worldAfterZoom));
        
        // 뷰포트 바운드 업데이트
        this.updateViewportBounds();
        
        // 캐시 비우기
        this._screenPositionCache.clear();
        this._worldBoundsCache.clear();
    }
    
    // 뷰포트 내 여부 확인 (컬링)
    isInViewport(pos, radius) {
        return !(pos.x + radius < this.viewportBounds.minX ||
                pos.x - radius > this.viewportBounds.maxX ||
                pos.y + radius < this.viewportBounds.minY ||
                pos.y - radius > this.viewportBounds.maxY);
    }
    
    // Batch draw all bodies for performance
    drawBodies() {
        // Use batch drawing instead of drawing each body separately
        const bodies = this.simulation.bodies;
        const ctx = this.offscreenCtx; // 오프스크린 캔버스 사용
        const len = bodies.length;
        
        // 1. 배치 처리를 위해 모든 파티클을 먼저 그려질 순서대로 정렬
        const visibleBodies = [];
        
        for (let i = 0; i < len; i++) {
            const body = bodies[i];
            
            // 뷰포트 컬링으로 화면 밖 물체 제외
            if (!this.isInViewport(body.pos, body.radius)) {
                continue;
            }
            
            const screenPos = this.worldToScreen(body.pos);
            const screenRadius = Math.max(2, body.radius / this.viewScale * 10);
            
            // Calculate color based on mass (brighter for heavier bodies)
            const brightness = Math.min(255, 100 + Math.log2(body.mass) * 20);
            
            // 화면에 보이는 물체를 저장
            visibleBodies.push({
                x: screenPos.x,
                y: screenPos.y,
                radius: screenRadius,
                brightness: brightness
            });
        }
        
        // 2. 성능 최적화: 배치 그리기 (최소한의 상태 변경)
        // 매 프레임마다 전체 그리기 대신 필요한 부분만 업데이트
        ctx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
        
        // 크기/밝기별로 그룹화하여 최적화
        const brightnessBuckets = {};
        
        // 파티클을 밝기 버킷에 그룹화
        for (let i = 0; i < visibleBodies.length; i++) {
            const body = visibleBodies[i];
            const bucket = Math.floor(body.brightness / 10) * 10;
            
            if (!brightnessBuckets[bucket]) {
                brightnessBuckets[bucket] = [];
            }
            
            brightnessBuckets[bucket].push(body);
        }
        
        // 각 버킷별로 파티클 일괄 그리기
        Object.keys(brightnessBuckets).forEach(bucket => {
            const bodies = brightnessBuckets[bucket];
            const brightness = parseInt(bucket);
            
            ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
            ctx.beginPath();
            
            for (let i = 0; i < bodies.length; i++) {
                const body = bodies[i];
                ctx.moveTo(body.x + body.radius, body.y);
                ctx.arc(body.x, body.y, body.radius, 0, 2 * Math.PI);
            }
            
            ctx.fill();
        });
        
        // 결과를 메인 캔버스에 복사
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);
    }
    
    // Draw quadtree structure
    drawQuadtree() {
        // 최적화: 쿼드트리는 매 프레임마다 그리지 않고 몇 프레임마다 그림
        if (this._frameCounter % this._quadtreeRenderInterval !== 0) return;
        
        const ctx = this.ctx;
        
        // Optimize quadtree visualization
        const drawNode = (node, depth = 0) => {
            if (node.isEmpty()) return;
            
            // Skip nodes that are completely outside the viewport
            const quad = node.quad;
            const halfSize = quad.size * 0.5;
            const minX = quad.center.x - halfSize;
            const minY = quad.center.y - halfSize;
            const maxX = quad.center.x + halfSize;
            const maxY = quad.center.y + halfSize;
            
            // 뷰포트 컬링: 화면 밖 노드는 그리지 않음
            if (maxX < this.viewportBounds.minX || 
                minX > this.viewportBounds.maxX || 
                maxY < this.viewportBounds.minY || 
                minY > this.viewportBounds.maxY) {
                return;
            }
            
            // 화면 좌표로 변환
            const screenMin = this.worldToScreen(new Vec2(minX, minY));
            const screenMax = this.worldToScreen(new Vec2(maxX, maxY));
            
            // Calculate color based on depth and mass
            const hue = (180 + depth * 20) % 360;
            const saturation = node.isLeaf() ? '100%' : '70%';
            const lightness = node.isLeaf() ? '50%' : '30%';
            
            // Draw quad
            ctx.strokeStyle = `hsl(${hue}, ${saturation}, ${lightness})`;
            ctx.lineWidth = 1;
            ctx.strokeRect(screenMin.x, screenMin.y, screenMax.x - screenMin.x, screenMax.y - screenMin.y);
            
            // Draw center of mass for branch nodes
            if (node.isBranch()) {
                const comPos = this.worldToScreen(node.centerOfMass);
                const radius = 2;
                
                ctx.beginPath();
                ctx.arc(comPos.x, comPos.y, radius, 0, 2 * Math.PI);
                ctx.fillStyle = `hsl(${hue}, 100%, 70%)`;
                ctx.fill();
                
                // Recursively draw children
                for (let i = 0; i < 4; i++) {
                    const child = node.children[i];
                    if (child) drawNode(child, depth + 1);
                }
            }
        };
        
        // Start drawing from the root
        if (this.simulation.quadtree.root) {
            drawNode(this.simulation.quadtree.root);
        }
    }
    
    // Draw preview of body being created
    drawSpawnPreview() {
        if (!this.spawnBody) return;
        
        // Draw body
        const screenPos = this.worldToScreen(this.spawnBody.pos);
        const screenRadius = Math.max(2, this.spawnBody.radius / this.viewScale * 10);
        
        // Calculate color based on mass
        const brightness = Math.min(255, 100 + Math.log2(this.spawnBody.mass) * 20);
        
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, 2 * Math.PI);
        this.ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
        this.ctx.fill();
        
        // Draw velocity vector
        const endPos = this.worldToScreen(this.spawnBody.pos.add(this.spawnBody.vel));
        
        this.ctx.beginPath();
        this.ctx.moveTo(screenPos.x, screenPos.y);
        this.ctx.lineTo(endPos.x, endPos.y);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }
    
    // Update FPS counter
    updateFPS(currentTime) {
        if (this.lastFrameTime === 0) {
            this.lastFrameTime = currentTime;
            return;
        }
        
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        this.frameTimeAccumulator += deltaTime;
        this.frameCount++;
        
        // Update FPS every 500ms
        if (this.frameTimeAccumulator >= 500) {
            this.fps = 1000 * this.frameCount / this.frameTimeAccumulator;
            this.frameTimeAccumulator = 0;
            this.frameCount = 0;
            
            // Update FPS display
            const fpsElement = document.getElementById('fps');
            if (fpsElement) {
                fpsElement.textContent = `FPS: ${Math.round(this.fps)}`;
            }
            
            // Update particle count display
            const particleCountElement = document.getElementById('particleCount');
            if (particleCountElement) {
                particleCountElement.textContent = this.simulation.bodies.length;
            }
        }
    }
    
    // Main rendering function
    render(currentTime) {
        // 프레임 카운터 증가
        this._frameCounter++;
        
        // Update FPS
        this.updateFPS(currentTime);
        
        // Clear canvas - use fillRect instead of clearRect for better performance with black background
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Check if there are bodies to draw
        if (this.simulation.bodies.length === 0) {
            // Draw a test circle if no bodies
            this.ctx.beginPath();
            this.ctx.arc(this.canvas.width/2, this.canvas.height/2, 50, 0, 2 * Math.PI);
            this.ctx.fillStyle = 'red';
            this.ctx.fill();
            return;
        }
        
        // Draw bodies if enabled
        if (this.showBodies) {
            this.drawBodies();
        }
        
        // Draw quadtree if enabled
        if (this.showQuadtree) {
            this.drawQuadtree();
        }
        
        // Draw preview of body being created
        this.drawSpawnPreview();
    }
}
