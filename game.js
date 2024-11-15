class SVGGenerator {
    static createBirdSVG(color = '#FFD700') {
        return `data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 24">
                <g transform="translate(2 2)">
                    <!-- 身体 -->
                    <circle cx="15" cy="10" r="10" fill="${color}"/>
                    <!-- 翅膀 -->
                    <path d="M12 8 Q8 5 5 8 Q8 11 12 8" fill="#FFA500"/>
                    <!-- 眼睛 -->
                    <circle cx="18" cy="8" r="2" fill="#000"/>
                    <!-- 喙 -->
                    <path d="M24 10 L28 12 L24 14 Z" fill="#FF6B6B"/>
                </g>
            </svg>
        `)}`;
    }

    static createPipeSVG(isTop = true) {
        return `data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 100">
                <!-- 管道主体 -->
                <defs>
                    <linearGradient id="pipeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#75C147"/>
                        <stop offset="50%" style="stop-color:#8EDD5A"/>
                        <stop offset="100%" style="stop-color:#75C147"/>
                    </linearGradient>
                </defs>
                <rect width="52" height="100" fill="url(#pipeGradient)"/>
                <!-- 管道口 -->
                <rect x="-5" y="${isTop ? '80' : '0'}" width="62" height="20" fill="#75C147"/>
            </svg>
        `)}`;
    }

    static createGroundSVG() {
        return `data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 112">
                <defs>
                    <pattern id="grassPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M0 20 L10 15 L20 20" stroke="#85C14F" fill="none"/>
                    </pattern>
                </defs>
                <rect width="320" height="112" fill="#DEB887"/>
                <rect width="320" height="20" fill="url(#grassPattern)"/>
            </svg>
        `)}`;
    }

    static createBackgroundSVG() {
        return `data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 480">
                <!-- 天空渐变 -->
                <defs>
                    <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#4EC0CA"/>
                        <stop offset="100%" style="stop-color:#87CEEB"/>
                    </linearGradient>
                </defs>
                <rect width="320" height="480" fill="url(#skyGradient)"/>
                <!-- 云朵 -->
                <g fill="#FFFFFF" opacity="0.8">
                    <circle cx="50" cy="80" r="20"/>
                    <circle cx="70" cy="80" r="25"/>
                    <circle cx="90" cy="80" r="20"/>
                    
                    <circle cx="250" cy="120" r="20"/>
                    <circle cx="270" cy="120" r="25"/>
                    <circle cx="290" cy="120" r="20"/>
                </g>
            </svg>
        `)}`;
    }
}

class FlappyBird {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.startScreen = document.querySelector('.start-screen');
        this.gameOverScreen = document.querySelector('.game-over');
        this.scoreElement = document.getElementById('score');
        this.bestScoreElement = document.getElementById('bestScore');
        
        // 初始化图片容器
        this.images = {};
        
        // 添加动画帧ID
        this.animationFrameId = null;
        
        // 添加设备像素比属性
        this.dpr = window.devicePixelRatio || 1;
        
        // 修改初始化顺序
        this.init(true); // 先初始化游戏状态
        this.setupCanvas(); // 再设置画布
        this.setupEventListeners();
        
        // 添加窗口大小改变事件
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.updateGameElements();
        });
    }

    init(isFirstInit = false) {
        // 游戏状态
        this.gameState = 'start';
        this.score = 0;
        this.bestScore = localStorage.getItem('bestScore') || 0;
        
        // 小鸟属性
        this.bird = {
            x: 60,
            y: this.canvas.height / 2,
            width: 34,
            height: 24,
            gravity: 0.4,
            velocity: 0,
            jump: -6.5,
            maxVelocity: 8,
            rotation: 0,
            smoothVelocity: 0
        };
        
        // 管道属性
        this.pipes = [];
        this.pipeWidth = 52 / this.dpr;
        this.pipeGap = 120;
        this.pipeSpacing = 300;          // 增加管道间距
        this.pipeSpeed = 3;              // 调整管道移动速度
        
        // 动画相关属性
        this.birdFrame = 0;
        this.birdAnimationSpeed = 0.15;
        this.groundX = 0;
        this.groundSpeed = 2;
        this.lastTime = 0;
        
        // 管道难度相关属性
        this.initialPipeGap = this.gameHeight * 0.25;
        this.minPipeGap = this.gameHeight * 0.18;
        this.pipeGapDecrease = 0.002;
        
        // 只在首次初始化时加载图片和开始动画
        if (isFirstInit) {
            this.loadImages({
                bird: [
                    SVGGenerator.createBirdSVG('#FFD700'),
                    SVGGenerator.createBirdSVG('#FFE44D'),
                    SVGGenerator.createBirdSVG('#FFD700')
                ],
                background: SVGGenerator.createBackgroundSVG(),
                ground: SVGGenerator.createGroundSVG(),
                pipeTop: SVGGenerator.createPipeSVG(true),
                pipeBottom: SVGGenerator.createPipeSVG(false)
            });
            
            this.startAnimation();
        }
    }

    startAnimation() {
        const animate = (timestamp) => {
            this.update(timestamp);
            this.draw();
            this.animationFrameId = requestAnimationFrame(animate);
        };
        this.animationFrameId = requestAnimationFrame(animate);
    }

    resetGame() {
        // 取消当前的动画循环
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        this.init(false);
        this.startAnimation();
        this.gameOverScreen.classList.add('hidden');
        this.startScreen.classList.remove('hidden');
        
        // 更新游戏元素位置和大小
        this.updateGameElements();
    }

    setupEventListeners() {
        // 处理点击/触摸事件
        const handleInput = (e) => {
            e.preventDefault();
            
            if (this.gameState === 'start') {
                this.startGame();
            } else if (this.gameState === 'playing') {
                if (this.bird.velocity > -4) {
                    this.bird.velocity = this.bird.jump;
                }
            } else if (this.gameState === 'gameOver') {
                this.resetGame();
            }
        };

        // 给 canvas 添加事件监听
        this.canvas.addEventListener('click', handleInput);
        this.canvas.addEventListener('touchstart', handleInput);
        
        // 给开始界面添加事件监听
        this.startScreen.addEventListener('click', handleInput);
        this.startScreen.addEventListener('touchstart', handleInput);
        
        // 重新开始按钮事件
        document.querySelector('.restart-btn').addEventListener('click', () => this.resetGame());
    }

    startGame() {
        this.gameState = 'playing';
        this.startScreen.classList.add('hidden');
    }

    addPipe() {
        // 基础参数设置
        const minPipeHeight = this.gameHeight * 0.1;
        const maxPipeHeight = this.gameHeight * 0.6;  // 增加最大管道高度
        
        // 计算当前管道间隙
        const currentPipeGap = Math.max(
            this.initialPipeGap * (1 - Math.min(this.score * this.pipeGapDecrease, 0.3)),
            this.minPipeGap
        );
        
        // 计算可用空间
        const availableHeight = this.gameHeight;
        const spaceForPipes = availableHeight - currentPipeGap;
        
        // 随机生成上管道高度
        const topHeight = Math.random() * (spaceForPipes - minPipeHeight * 2) + minPipeHeight;
        
        // 计算下管道高度
        const bottomHeight = spaceForPipes - topHeight;

        // 添加新管道，确保从屏幕右侧开始
        this.pipes.push({
            x: this.gameWidth,  // 从屏幕右侧开始
            topHeight: topHeight,
            bottomHeight: bottomHeight,
            passed: false,
            gapSize: currentPipeGap
        });
    }

    update(timestamp) {
        if (this.gameState !== 'playing') return;
        
        // 计算时间差
        const deltaTime = timestamp - (this.lastTime || timestamp);
        this.lastTime = timestamp;

        // 更新小鸟动画帧
        this.birdFrame += this.birdAnimationSpeed;
        if (this.birdFrame >= this.images.bird.length) {
            this.birdFrame = 0;
        }

        // 更新小鸟速度和位置
        this.bird.velocity += this.bird.gravity;
        this.bird.velocity = Math.min(this.bird.velocity, this.bird.maxVelocity);
        this.bird.y += this.bird.velocity;

        // 检查屏幕边界
        if (this.bird.y < 0 || this.bird.y + this.bird.height > this.gameHeight) {
            this.gameOver();
            return;
        }

        // 平滑速度用于旋转计算
        this.bird.smoothVelocity += (this.bird.velocity - this.bird.smoothVelocity) * 0.1;

        // 更平滑的旋转计算
        const targetRotation = this.bird.smoothVelocity * 0.12;
        const maxRotation = Math.PI / 4; // 45度
        this.bird.rotation = Math.max(-maxRotation, Math.min(maxRotation, targetRotation));

        // 更新地面位置
        this.groundX = (this.groundX - this.groundSpeed) % this.images.ground.width;

        // 更新管道位置
        this.pipes.forEach(pipe => {
            pipe.x -= this.pipeSpeed;

            // 检查得分
            if (!pipe.passed && pipe.x + this.pipeWidth < this.bird.x) {
                pipe.passed = true;
                this.score++;
                this.scoreElement.textContent = this.score;
            }
        });

        // 移除超出屏幕的管道
        if (this.pipes[0] && this.pipes[0].x + this.pipeWidth < 0) {
            this.pipes.shift();
        }

        // 修改管道生成逻辑
        if (this.pipes.length === 0) {
            // 第一个管道从屏幕右侧开始
            this.addPipe();
        } else {
            const lastPipe = this.pipes[this.pipes.length - 1];
            // 当最后一个管道移动到一定距离后，添加新管道
            if (this.gameWidth - (lastPipe.x + this.pipeWidth) >= this.pipeSpacing) {
                this.addPipe();
            }
        }

        // 碰撞检测
        if (this.checkCollision()) {
            this.gameOver();
        }
    }

    checkCollision() {
        // 只检查管道碰撞
        return this.pipes.some(pipe => {
            const birdLeft = this.bird.x + 5;
            const birdRight = this.bird.x + this.bird.width - 5;
            const birdTop = this.bird.y + 5;
            const birdBottom = this.bird.y + this.bird.height - 5;

            // 检查与上管道的碰撞
            const hitTopPipe = birdRight > pipe.x && 
                              birdLeft < pipe.x + this.pipeWidth &&
                              birdTop < pipe.topHeight;

            // 检查与下管道的碰撞
            const hitBottomPipe = birdRight > pipe.x && 
                                 birdLeft < pipe.x + this.pipeWidth &&
                                 birdBottom > pipe.topHeight + pipe.gapSize;

            return hitTopPipe || hitBottomPipe;
        });
    }

    gameOver() {
        this.gameState = 'gameOver';
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('bestScore', this.bestScore);
            this.bestScoreElement.textContent = this.bestScore;
        }
        this.gameOverScreen.classList.remove('hidden');
    }

    draw() {
        if (!this.isResourcesLoaded) return;
        
        this.ctx.clearRect(0, 0, this.gameWidth, this.gameHeight);

        // 绘制背景
        this.ctx.drawImage(this.images.background, 0, 0, this.gameWidth, this.gameHeight);

        // 绘制管道
        this.pipes.forEach(pipe => {
            // 上管道
            this.ctx.save();
            this.ctx.translate(pipe.x, pipe.topHeight);
            this.ctx.scale(1, -1);
            this.ctx.drawImage(
                this.images.pipeTop,
                0,
                0,
                this.pipeWidth,
                pipe.topHeight
            );
            this.ctx.restore();
            
            // 下管道
            this.ctx.drawImage(
                this.images.pipeBottom,
                pipe.x,
                pipe.topHeight + pipe.gapSize,
                this.pipeWidth,
                pipe.bottomHeight
            );
        });

        // 绘制小鸟
        this.ctx.save();
        this.ctx.translate(
            this.bird.x + this.bird.width / 2,
            this.bird.y + this.bird.height / 2
        );
        this.ctx.rotate(this.bird.rotation);
        this.ctx.drawImage(
            this.images.bird[Math.floor(this.birdFrame)],
            -this.bird.width / 2,
            -this.bird.height / 2,
            this.bird.width,
            this.bird.height
        );
        this.ctx.restore();

        // 绘制分数
        if (this.gameState === 'playing') {
            this.ctx.fillStyle = 'white';
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 5;
            this.ctx.font = 'bold 36px Arial';
            const scoreText = `${this.score}`;
            const x = this.gameWidth / 2;
            const y = 50;
            
            this.ctx.strokeText(scoreText, x, y);
            this.ctx.fillText(scoreText, x, y);
        }
    }

    loadImages(sources) {
        if (!this.images) {
            this.images = {};
        }
        
        const promises = [];
        
        for (let key in sources) {
            if (Array.isArray(sources[key])) {
                this.images[key] = [];
                sources[key].forEach((src, index) => {
                    promises.push(new Promise(resolve => {
                        const img = new Image();
                        img.onload = resolve;
                        img.src = src;
                        this.images[key][index] = img;
                    }));
                });
            } else {
                promises.push(new Promise(resolve => {
                    const img = new Image();
                    img.onload = resolve;
                    img.src = sources[key];
                    this.images[key] = img;
                }));
            }
        }

        Promise.all(promises).then(() => {
            this.isResourcesLoaded = true;
            this.groundHeight = this.images.ground?.height || 112;
            this.draw();
        });
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // 设置Canvas的显示尺寸
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        
        // 更新设备像素比
        this.dpr = window.devicePixelRatio || 1;
        
        // 设置Canvas的实际尺寸
        this.canvas.width = containerWidth * this.dpr;
        this.canvas.height = containerHeight * this.dpr;
        
        // 调整上下文缩放
        this.ctx.scale(this.dpr, this.dpr);
        
        // 更新游戏尺寸
        this.gameWidth = containerWidth;
        this.gameHeight = containerHeight;
        
        // 更新管道宽度
        this.pipeWidth = 52 / this.dpr;
    }

    updateGameElements() {
        // 添加安全检查
        if (!this.bird) return;
        
        // 调整小鸟位置
        this.bird.x = this.gameWidth * 0.2;
        this.bird.y = this.gameHeight / 2;
        
        // 更新管道相关参数
        this.initialPipeGap = this.gameHeight * 0.25;
        this.minPipeGap = this.gameHeight * 0.18;
        this.pipeGap = this.initialPipeGap;
        this.pipeSpacing = this.gameWidth * 0.5;  // 增加管道间距
    }
}

// 启动游戏
window.onload = () => new FlappyBird(); 