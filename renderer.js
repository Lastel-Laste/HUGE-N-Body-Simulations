// Renderer class handles drawing the simulation on a canvas
class Renderer {
    constructor(canvas, simulation) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.simulation = simulation;
        
        // 뷰 매개변수
        this.viewPos = new Vec2(0, 0);
        this.viewScale = 50;  // 초기 스케일을 더 크게 조정
        
        // 시각화 옵션
        this.showBodies = true;
        this.showQuadtree = false;
        
        // 마우스 상호작용 상태
        this.isDragging = false;
        this.lastMousePos = new Vec2(0, 0);
        this.rightMouseDown = false;
        this.spawnBody = null;
        this.spawnAngle = null;
        this.spawnTotalAngle = 0;
        
        // 성능 추적
        this.lastFrameTime = 0;
        this.frameTimeAccumulator = 0;
        this.frameCount = 0;
        this.fps = 0;
        
        // 초기 캔버스 크기 조정
        this.resizeCanvas();

        // 창 크기 변경 시 캔버스 크기 조정 이벤트 리스너 추가
        window.addEventListener('resize', () => this.resizeCanvas());

        // 디버그 로깅 추가
        console.log('Renderer 초기화됨');
        console.log('초기 바디 수:', this.simulation.bodies.length);
    }
    
    // 캔버스 크기 조정
    resizeCanvas() {
        // 캔버스를 윈도우 크기에 맞추기
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // 선명한 렌더링 보장
        this.ctx.imageSmoothingEnabled = false;

        console.log('캔버스 크기 조정됨:', this.canvas.width, this.canvas.height);
    }
    
    // 화면 좌표를 시뮬레이션 좌표로 변환
    screenToWorld(screenPos) {
        const x = (screenPos.x / this.canvas.width * 2 - 1) * this.viewScale + this.viewPos.x;
        const y = (1 - screenPos.y / this.canvas.height * 2) * this.viewScale + this.viewPos.y;
        return new Vec2(x, y);
    }
    
    // 시뮬레이션 좌표를 화면 좌표로 변환
    worldToScreen(worldPos) {
        const x = ((worldPos.x - this.viewPos.x) / this.viewScale + 1) * this.canvas.width / 2;
        const y = ((-worldPos.y + this.viewPos.y) / this.viewScale + 1) * this.canvas.height / 2;
        return new Vec2(x, y);
    }
    
    // 마우스 다운 이벤트 처리
    onMouseDown(event) {
        const mousePos = new Vec2(event.clientX, event.clientY);
        
        if (event.button === 0) { // 왼쪽 마우스 버튼
            this.isDragging = true;
            this.lastMousePos = mousePos;
        } else if (event.button === 2) { // 오른쪽 마우스 버튼
            this.rightMouseDown = true;
            
            // 마우스 위치에 새 바디 생성
            const worldPos = this.screenToWorld(mousePos);
            this.spawnBody = new Body(worldPos, Vec2.zero(), 1.0, 1.0);
            this.spawnAngle = null;
            this.spawnTotalAngle = 0;
        }
    }
    
    // 마우스 이동 이벤트 처리
    onMouseMove(event) {
        const mousePos = new Vec2(event.clientX, event.clientY);
        
        if (this.isDragging) {
            // 뷰 이동
            const dx = (mousePos.x - this.lastMousePos.x) / this.canvas.width * this.viewScale * 2;
            const dy = (mousePos.y - this.lastMousePos.y) / this.canvas.height * this.viewScale * 2;
            this.viewPos.x -= dx;
            this.viewPos.y += dy;
            this.lastMousePos = mousePos;
        }
        
        if (this.rightMouseDown && this.spawnBody) {
            const worldPos = this.screenToWorld(mousePos);
            
            // 바디 질량을 위한 각도 계산
            if (this.spawnAngle !== null) {
                const diff = worldPos.sub(this.spawnBody.pos);
                const newAngle = Math.atan2(diff.y, diff.x);
                let angleDiff = newAngle - this.spawnAngle;
                
                // 각도 차이를 [-π, π] 범위로 정규화
                if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                
                this.spawnTotalAngle -= angleDiff;
                this.spawnBody.mass = Math.pow(2, this.spawnTotalAngle / (2 * Math.PI));
                this.spawnBody.radius = Math.cbrt(this.spawnBody.mass);
                this.spawnAngle = newAngle;
            } else {
                this.spawnAngle = Math.atan2(worldPos.y - this.spawnBody.pos.y, worldPos.x - this.spawnBody.pos.x);
            }
            
            // 마우스 위치를 기반으로 속도 설정
            this.spawnBody.vel = worldPos.sub(this.spawnBody.pos);
        }
    }
    
    // 마우스 업 이벤트 처리
    onMouseUp(event) {
        if (event.button === 0) { // 왼쪽 마우스 버튼
            this.isDragging = false;
        } else if (event.button === 2) { // 오른쪽 마우스 버튼
            if (this.spawnBody) {
                // 새 바디를 시뮬레이션에 추가
                this.simulation.addBody(this.spawnBody.clone());
                this.spawnBody = null;
            }
            this.rightMouseDown = false;
        }
    }
    
    // 마우스 휠 이벤트 처리
    onWheel(event) {
        // 기본 스크롤 동작 방지
        event.preventDefault();
        
        // 마우스 위치 가져오기
        const mousePos = new Vec2(event.clientX, event.clientY);
        const worldBeforeZoom = this.screenToWorld(mousePos);
        
        // 스크롤 방향에 따라 줌 레벨 조정
        const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
        this.viewScale *= zoomFactor;
        
        // 마우스 커서 방향으로 뷰 위치 조정
        const worldAfterZoom = this.screenToWorld(mousePos);
        this.viewPos.addInPlace(worldBeforeZoom.sub(worldAfterZoom));
    }
    
    // 단일 바디 그리기
    drawBody(body) {
        try {
            const screenPos = this.worldToScreen(body.pos);
            const screenRadius = Math.max(2, body.radius / this.viewScale * 10);
            
            // 질량에 따른 색상 계산 (더 무거운 바디일수록 밝게)
            const brightness = Math.min(255, 100 + Math.log2(body.mass) * 20);
            const color = `rgb(${brightness}, ${brightness}, ${brightness})`;
            
            // 바디 그리기
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, 2 * Math.PI);
            this.ctx.fillStyle = color;
            this.ctx.fill();

            // 디버그 로깅
            console.log(`바디 그리기: pos=${body.pos.x},${body.pos.y}, mass=${body.mass}, screenPos=${screenPos.x},${screenPos.y}, screenRadius=${screenRadius}`);
        } catch (error) {
            console.error('바디 그리기 중 오류 발생:', error);
        }
    }
    
    // 쿼드트리 구조 그리기
    drawQuadtree() {
        const drawNode = (node, depth = 0) => {
            // 빈 노드 건너뛰기
            if (node.isEmpty()) return;
            
            const quad = node.quad;
            const halfSize = quad.size * 0.5;
            
            // 화면 공간의 코너 위치 계산
            const min = this.worldToScreen(new Vec2(quad.center.x - halfSize, quad.center.y - halfSize));
            const max = this.worldToScreen(new Vec2(quad.center.x + halfSize, quad.center.y + halfSize));
            
            // 깊이와 질량에 따른 색상 계산
            const hue = (180 + depth * 20) % 360;
            const saturation = node.isLeaf() ? '100%' : '70%';
            const lightness = node.isLeaf() ? '50%' : '30%';
            
            // 쿼드 그리기
            this.ctx.strokeStyle = `hsl(${hue}, ${saturation}, ${lightness})`;
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(min.x, min.y, max.x - min.x, max.y - min.y);
            
            // 분기 노드의 질량 중심 그리기
            if (node.isBranch()) {
                const comPos = this.worldToScreen(node.centerOfMass);
                const radius = 2;
                
                this.ctx.beginPath();
                this.ctx.arc(comPos.x, comPos.y, radius, 0, 2 * Math.PI);
                this.ctx.fillStyle = `hsl(${hue}, 100%, 70%)`;
                this.ctx.fill();
                
                // 자식 노드 재귀적으로 그리기
                for (const child of node.children) {
                    if (child) drawNode(child, depth + 1);
                }
            }
        };
        
        // 루트부터 그리기 시작
        if (this.simulation.quadtree.root) {
            drawNode(this.simulation.quadtree.root);
        }
    }
    
    // 생성 중인 바디 미리보기 그리기
    drawSpawnPreview() {
        if (!this.spawnBody) return;
        
        // 바디 그리기
        this.drawBody(this.spawnBody);
        
        // 속도 벡터 그리기
        const startPos = this.worldToScreen(this.spawnBody.pos);
        const endPos = this.worldToScreen(this.spawnBody.pos.add(this.spawnBody.vel));
        
        this.ctx.beginPath();
        this.ctx.moveTo(startPos.x, startPos.y);
        this.ctx.lineTo(endPos.x, endPos.y);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }
    
    // FPS 카운터 업데이트
    updateFPS(currentTime) {
        if (this.lastFrameTime === 0) {
            this.lastFrameTime = currentTime;
            return;
        }
        
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        this.frameTimeAccumulator += deltaTime;
        this.frameCount++;
        
        // 500ms마다 FPS 업데이트
        if (this.frameTimeAccumulator >= 500) {
            this.fps = 1000 * this.frameCount / this.frameTimeAccumulator;
            this.frameTimeAccumulator = 0;
            this.frameCount = 0;
            
            // FPS 디스플레이 업데이트
            const fpsElement = document.getElementById('fps');
            if (fpsElement) {
                fpsElement.textContent = `FPS: ${Math.round(this.fps)}`;
            }
            
            // 입자 수 디스플레이 업데이트
            const particleCountElement = document.getElementById('particleCount');
            if (particleCountElement) {
                particleCountElement.textContent = this.simulation.bodies.length;
            }
        }
    }
    
    // 메인 렌더링 함수
    render(currentTime) {
        try {
            // FPS 업데이트
            this.updateFPS(currentTime);
            
            // 캔버스 지우기
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 바디가 없는 경우 경고 및 테스트 원 그리기
            if (this.simulation.bodies.length === 0) {
                console.warn('시뮬레이션에 바디가 없습니다');
                this.ctx.beginPath();
                this.ctx.arc(this.canvas.width/2, this.canvas.height/2, 50, 0, 2 * Math.PI);
                this.ctx.fillStyle = 'red';
                this.ctx.fill();
                return;
            }
            
            // 쿼드트리 그리기 (활성화된 경우)
            if (this.showQuadtree) {
                this.drawQuadtree();
            }
            
            // 바디 그리기 (활성화된 경우)
            if (this.showBodies) {
                console.log('바디 그리기 시작:', this.simulation.bodies.length);
                for (const body of this.simulation.bodies) {
                    this.drawBody(body);
                }
                console.log('바디 그리기 완료');
            }
            
            // 생성 중인 바디 미리보기 그리기
            this.drawSpawnPreview();
        } catch (error) {
            console.error('렌더링 중 오류 발생:', error);
        }
    }
}
