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
        this.setupCanvas(); // 先设置画布，获取游戏尺寸
        this.init(true);    // 再初始化游戏状态
        this.setupEventListeners();
        
        // 添加窗口大小改变事件
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.updateGameElements();
        });
        
        // 添加算术题相关属性
        this.arithmeticQuiz = {
            question: '',
            answer: 0,
            options: [],
            isProcessing: false,  // 添加状态锁
            timer: null,          // 添加定时器引用
            wrongAttempts: 0,     // 记录连续答错次数
            waitTime: 0,          // 答错后的等待时间
            cooldownTimer: null,   // 冷却时间定时器
            correctStreak: 0,    // 添加连续答对计数
            lastAnswerPosition: -1  // 记录上一次正确答案的位置
        };
        
        // 初始化音频上下文和音效
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.jumpSound = null;
        this.gameOverSound = null;  // 添加游戏结束音效
        this.createJumpSound();
        this.createGameOverSound();  // 创建游戏结束音效
    }

    init(isFirstInit = false) {
        // 游戏状态
        this.gameState = 'start';
        this.score = 0;
        
        // 从localStorage获取最高分并更新显示
        this.bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
        this.bestScoreElement.textContent = this.bestScore;
        
        // 小鸟属
        this.bird = {
            x: this.gameWidth * 0.2,
            y: this.gameHeight / 2,
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
        this.pipeGap = this.gameHeight * 0.25;        // 根据游戏高度设置间隙
        this.pipeSpacing = this.gameWidth * 0.4;      // 根据游戏宽度设置间距
        this.pipeSpeed = 3;
        
        // 管道难度相关属性
        this.initialPipeGap = this.gameHeight * 0.25;
        this.minPipeGap = this.gameHeight * 0.18;
        this.pipeGapDecrease = 0.002;
        
        // 动画相关属性
        this.birdFrame = 0;
        this.birdAnimationSpeed = 0.15;
        this.lastTime = 0;
        
        // 只在首次初始化时加载图片和开始动画
        if (isFirstInit) {
            this.loadImages({
                bird: [
                    SVGGenerator.createBirdSVG('#FFD700'),
                    SVGGenerator.createBirdSVG('#FFE44D'),
                    SVGGenerator.createBirdSVG('#FFD700')
                ],
                background: SVGGenerator.createBackgroundSVG(),
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
        
        // 更新游戏元素位置和大小
        this.updateGameElements();
        
        // 隐藏算术题
        document.querySelector('.arithmetic-quiz').classList.add('hidden');
        
        // 清理定时器
        if (this.arithmeticQuiz.timer) {
            clearTimeout(this.arithmeticQuiz.timer);
            this.arithmeticQuiz.timer = null;
        }
        
        // 重置状态
        this.arithmeticQuiz.isProcessing = false;
    }

    setupEventListeners() {
        // 处理点击/触摸事件
        const handleInput = (e) => {
            // 如果游戏界面正在阻止点击，则不处理任何点击事件
            if (this.gameOverScreen.classList.contains('blocking')) {
                return;
            }
            
            e.preventDefault();
            
            if (this.gameState === 'start') {
                this.startGame();
            } else if (this.gameState === 'playing') {
                if (this.bird.velocity > -4) {
                    this.bird.velocity = this.bird.jump;
                    this.playJumpSound();  // 添加音效
                }
            }
        };

        // 给 canvas 添加事件监听
        this.canvas.addEventListener('click', handleInput);
        this.canvas.addEventListener('touchstart', handleInput);
        
        // 给开始界面添加事件监听
        this.startScreen.addEventListener('click', handleInput);
        this.startScreen.addEventListener('touchstart', handleInput);
    }

    startGame() {
        this.gameState = 'playing';
        this.startScreen.classList.add('hidden');
        // 游戏开始时添加第一个管道
        this.addPipe();
    }

    addPipe() {
        // 基础参数设置
        const minPipeHeight = this.gameHeight * 0.1;
        const maxPipeHeight = this.gameHeight * 0.6;  // 增加最大管道高度
        
        // 计算当前管间隙
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
        
        // 计算时间差并限制最大值
        const deltaTime = Math.min(timestamp - (this.lastTime || timestamp), 32); // 限制最大时间差为32ms
        this.lastTime = timestamp;
        
        // 更新小鸟动画帧
        this.birdFrame += this.birdAnimationSpeed;
        if (this.birdFrame >= this.images.bird.length) {
            this.birdFrame = 0;
        }
        
        // 根据时间差更新小鸟位置
        this.bird.velocity += this.bird.gravity * (deltaTime / 16); // 标准化重力
        this.bird.velocity = Math.min(this.bird.velocity, this.bird.maxVelocity);
        this.bird.y += this.bird.velocity * (deltaTime / 16); // 标准化移动
        
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

        // 更新管道位置
        this.pipes.forEach(pipe => {
            pipe.x -= this.pipeSpeed;

            // 检查得分
            if (!pipe.passed && pipe.x + this.pipeWidth < this.bird.x) {
                pipe.passed = true;
                this.score++;
                // 实时更新分数显示
                this.scoreElement.textContent = this.score;
            }
        });

        // 移除超出屏幕的管道
        if (this.pipes[0] && this.pipes[0].x + this.pipeWidth < 0) {
            this.pipes.shift();
        }

        // 修改管道生成逻辑
        if (this.pipes.length === 0) {
            this.addPipe();
        } else {
            const lastPipe = this.pipes[this.pipes.length - 1];
            // 当最后一个管道移动到离右边缘一定距离时，添加新管道
            if (lastPipe.x < this.gameWidth - this.pipeSpacing) {
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

            // 检查与管道的碰撞
            const hitBottomPipe = birdRight > pipe.x && 
                                 birdLeft < pipe.x + this.pipeWidth &&
                                 birdBottom > pipe.topHeight + pipe.gapSize;

            return hitTopPipe || hitBottomPipe;
        });
    }

    gameOver() {
        this.gameState = 'gameOver';
        this.gameOverScreen.classList.add('blocking');
        
        // 播放游戏结束音效
        this.playGameOverSound();
        
        // 更新分数显示
        this.scoreElement.textContent = this.score;
        
        // 检查并更新最高分
        const currentBestScore = parseInt(localStorage.getItem('bestScore')) || 0;
        if (this.score > currentBestScore) {
            this.bestScore = this.score;
            localStorage.setItem('bestScore', this.score);
        }
        
        // 更新最高分显示
        this.bestScoreElement.textContent = Math.max(currentBestScore, this.score);
        
        // 先显示游戏结束界面
        this.gameOverScreen.classList.remove('hidden');
        
        // 延迟显示算术题
        setTimeout(() => {
            this.gameOverScreen.classList.remove('blocking');
            const quizContainer = document.querySelector('.arithmetic-quiz');
            
            // 重置状态
            quizContainer.classList.remove('quiz-animate-in');
            quizContainer.classList.remove('hidden');
            
            // 强制重绘
            quizContainer.offsetHeight;
            
            // 添加动画类
            quizContainer.classList.add('quiz-animate-in');
            
            // 生成算术题
            this.generateArithmeticQuiz();
        }, 1000);
        
        // 重置连续答对计数
        this.arithmeticQuiz.correctStreak = 0;
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

    // 生成随机算术题
    generateArithmeticQuiz() {
        // 清理之前的定时器
        if (this.arithmeticQuiz.timer) {
            clearTimeout(this.arithmeticQuiz.timer);
            this.arithmeticQuiz.timer = null;
        }
        
        // 重置处理状态
        this.arithmeticQuiz.isProcessing = false;
        
        const quizContainer = document.querySelector('.arithmetic-quiz');
        
        // 先隐藏容器
        quizContainer.classList.add('hidden');
        quizContainer.classList.remove('quiz-animate-in');
        
        // 生成题目内容
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        const isAddition = Math.random() > 0.5;
        
        if (isAddition) {
            this.arithmeticQuiz.question = `${num1} + ${num2} = ?`;
            this.arithmeticQuiz.answer = num1 + num2;
        } else {
            const [larger, smaller] = [Math.max(num1, num2), Math.min(num1, num2)];
            this.arithmeticQuiz.question = `${larger} - ${smaller} = ?`;
            this.arithmeticQuiz.answer = larger - smaller;
        }
        
        this.generateQuizOptions();
        
        // 使用 setTimeout 确保 DOM 更新
        setTimeout(() => {
            // 更新 UI（包含进度显示）
            this.updateQuizUI();
            
            // 移除隐藏类并添加动画类
            quizContainer.classList.remove('hidden');
            
            // 强制重绘
            quizContainer.offsetHeight;
            
            // 添加动画类
            quizContainer.classList.add('quiz-animate-in');
        }, 50);
        
        // 更新题目提示，显示当前进度
        const quizText = document.querySelector('.quiz-text');
        quizText.textContent = `请回答: (${this.arithmeticQuiz.correctStreak + 1}/2)`;
    }

    // 生成选项
    generateQuizOptions() {
        const answer = this.arithmeticQuiz.answer;
        
        // 记录上一次正确答案的位置
        if (!this.arithmeticQuiz.lastAnswerPosition) {
            this.arithmeticQuiz.lastAnswerPosition = -1;  // 初始化
        }
        
        // 生成干扰项的范围
        const minOption = Math.max(0, answer - 5);
        const maxOption = Math.min(20, answer + 5);
        
        // 创建可用选项池（排除正确答案）
        const availableOptions = [];
        for (let i = minOption; i <= maxOption; i++) {
            if (i !== answer) {
                availableOptions.push(i);
            }
        }
        
        // 生成3个干扰项
        const distractors = [];
        while (distractors.length < 3 && availableOptions.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableOptions.length);
            distractors.push(availableOptions[randomIndex]);
            availableOptions.splice(randomIndex, 1);
        }
        
        // 如果干扰项不足，补充生成
        while (distractors.length < 3) {
            let newOption;
            do {
                const offset = Math.floor(Math.random() * 5) + 1;
                newOption = answer + (Math.random() < 0.5 ? offset : -offset);
            } while (
                newOption < 0 || 
                newOption > 20 || 
                distractors.includes(newOption) || 
                newOption === answer
            );
            distractors.push(newOption);
        }
        
        // 确定正确答案的位置
        let answerPosition;
        do {
            answerPosition = Math.floor(Math.random() * 4);
        } while (answerPosition === this.arithmeticQuiz.lastAnswerPosition);
        
        // 记录这次的位置
        this.arithmeticQuiz.lastAnswerPosition = answerPosition;
        
        // 构建最终选项数组
        const options = [...distractors];
        options.splice(answerPosition, 0, answer);
        
        // 验证选项
        if (!this.validateOptions(answer, options)) {
            console.error('选项生成失败，使用备用方案');
            this.generateFallbackOptions(answer);
            return;
        }
        
        this.arithmeticQuiz.options = options;
    }

    // 验证选项
    validateOptions(answer, options) {
        // 基本验证
        if (!options.includes(answer)) return false;
        if (options.length !== 4) return false;
        if (new Set(options).size !== 4) return false;
        
        // 验证所有选项是否在有效范围内
        if (!options.every(opt => opt >= 0 && opt <= 20)) return false;
        
        // 验证选项之间的差异是否合理
        const sortedOptions = [...options].sort((a, b) => a - b);
        for (let i = 1; i < sortedOptions.length; i++) {
            if (sortedOptions[i] - sortedOptions[i-1] === 0) return false;
        }
        
        return true;
    }

    // 备用方案
    generateFallbackOptions(answer) {
        // 确保不与上次位置相同
        let position;
        do {
            position = Math.floor(Math.random() * 4);
        } while (position === this.arithmeticQuiz.lastAnswerPosition);
        
        // 生成基于答案的选项
        const options = [];
        const offsets = [-2, -1, 1, 2];
        
        // 打乱偏移量
        offsets.sort(() => Math.random() - 0.5);
        
        // 生成选项
        for (let offset of offsets) {
            let option = answer + offset;
            // 确保选项在有效范围内
            option = Math.max(0, Math.min(20, option));
            // 避免重复
            while (options.includes(option)) {
                option = option + (offset > 0 ? 1 : -1);
                option = Math.max(0, Math.min(20, option));
            }
            options.push(option);
        }
        
        // 在指定位置插入正确答案
        options[position] = answer;
        
        // 记录位置
        this.arithmeticQuiz.lastAnswerPosition = position;
        
        this.arithmeticQuiz.options = options;
    }

    // 更新算术题UI
    updateQuizUI() {
        const quizContainer = document.querySelector('.arithmetic-quiz');
        const questionEl = quizContainer.querySelector('.quiz-question');
        const optionsEl = quizContainer.querySelector('.quiz-options');
        const feedbackEl = quizContainer.querySelector('.quiz-feedback');
        const quizText = quizContainer.querySelector('.quiz-text');
        
        // 更新进度显示
        quizText.textContent = `请回答: (${this.arithmeticQuiz.correctStreak + 1}/2)`;
        
        // 显示题目
        questionEl.textContent = this.arithmeticQuiz.question;
        
        // 清空并重新生成选项按钮
        optionsEl.innerHTML = '';
        this.arithmeticQuiz.options.forEach(option => {
            const button = document.createElement('button');
            button.className = 'quiz-option';
            button.textContent = option;
            button.onclick = () => {
                if (!this.arithmeticQuiz.isProcessing && !button.disabled) {
                    this.checkAnswer(option);
                }
            };
            optionsEl.appendChild(button);
        });
        
        // 隐藏反馈信息
        feedbackEl.className = 'quiz-feedback hidden';
        
        // 显示算术题区域
        quizContainer.classList.remove('hidden');
        
        // 重置状态
        this.arithmeticQuiz.isProcessing = false;
    }

    // 检查答案
    checkAnswer(selectedAnswer) {
        if (this.arithmeticQuiz.isProcessing) {
            return;
        }
        
        this.arithmeticQuiz.isProcessing = true;
        const feedbackEl = document.querySelector('.quiz-feedback');
        const quizContainer = document.querySelector('.arithmetic-quiz');
        
        this.clearQuizTimers();
        this.disableQuizButtons(quizContainer);
        
        if (selectedAnswer === this.arithmeticQuiz.answer) {
            // 增加连续答对计数
            this.arithmeticQuiz.correctStreak++;
            
            // 更新反馈文本
            const remainingQuestions = 2 - this.arithmeticQuiz.correctStreak;
            feedbackEl.textContent = remainingQuestions > 0 
                ? `回答正确! 还需要答对${remainingQuestions}题` 
                : '回答正确! 游戏即将开始';
            feedbackEl.className = 'quiz-feedback correct';
            
            this.arithmeticQuiz.timer = setTimeout(() => {
                if (this.arithmeticQuiz.correctStreak >= 2) {
                    // 达到2题后重启游戏
                    quizContainer.classList.add('hidden');
                    this.gameOverScreen.classList.add('hidden');
                    
                    if (this.animationFrameId) {
                        cancelAnimationFrame(this.animationFrameId);
                        this.animationFrameId = null;
                    }
                    
                    // 重置所有状态并开始游戏
                    this.init(false);
                    this.lastTime = 0;
                    this.birdFrame = 0;
                    this.gameState = 'playing';
                    this.startAnimation();
                    this.addPipe();
                    
                    // 重置算术题状态
                    this.arithmeticQuiz.isProcessing = false;
                    this.arithmeticQuiz.timer = null;
                    this.arithmeticQuiz.correctStreak = 0;
                } else {
                    // 生成新题目并更新UI
                    this.generateNewQuestion();
                }
            }, 1000);
        } else {
            // 答错时重置连续答对计数
            this.arithmeticQuiz.correctStreak = 0;
            
            feedbackEl.textContent = '回答错误';
            feedbackEl.className = 'quiz-feedback wrong';
            
            // 延迟后生成新题目
            this.arithmeticQuiz.timer = setTimeout(() => {
                // 生成新的题目内容
                const num1 = Math.floor(Math.random() * 10) + 1;
                const num2 = Math.floor(Math.random() * 10) + 1;
                const isAddition = Math.random() > 0.5;
                
                if (isAddition) {
                    this.arithmeticQuiz.question = `${num1} + ${num2} = ?`;
                    this.arithmeticQuiz.answer = num1 + num2;
                } else {
                    const [larger, smaller] = [Math.max(num1, num2), Math.min(num1, num2)];
                    this.arithmeticQuiz.question = `${larger} - ${smaller} = ?`;
                    this.arithmeticQuiz.answer = larger - smaller;
                }
                
                // 生成新选项
                this.generateQuizOptions();
                
                // 更新UI（这里会同时更新进度显示）
                this.updateQuizUI();
            }, 1000);  // 1秒后更新新题目
        }
    }

    // 计算等待时间
    calculateWaitTime() {
        // 连续答错次数越多，等待时间越长
        return Math.pow(2, this.arithmeticQuiz.wrongAttempts - 1) * 3; // 3, 6, 12, 24秒...
    }

    // 清理定时器
    clearQuizTimers() {
        if (this.arithmeticQuiz.timer) {
            clearTimeout(this.arithmeticQuiz.timer);
            this.arithmeticQuiz.timer = null;
        }
        if (this.arithmeticQuiz.cooldownTimer) {
            clearTimeout(this.arithmeticQuiz.cooldownTimer);
            this.arithmeticQuiz.cooldownTimer = null;
        }
    }

    // 禁用答题按钮
    disableQuizButtons(quizContainer) {
        const buttons = quizContainer.querySelectorAll('.quiz-option');
        buttons.forEach(button => {
            button.disabled = true;
            button.style.pointerEvents = 'none';
        });
    }

    // 修改 createJumpSound 方法
    createJumpSound() {
        // 创建音频缓冲区
        const duration = 0.15;  // 增加持续时间
        const audioBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        
        // 生成更柔和的音效波形
        for (let i = 0; i < audioBuffer.length; i++) {
            const t = i / audioBuffer.length;
            // 降低基础频率，添加更柔和的泛音
            channelData[i] = (
                Math.sin(2 * Math.PI * 400 * t) * 0.5 + // 基础频率降低到400Hz
                Math.sin(2 * Math.PI * 600 * t) * 0.3 + // 添加600Hz的泛音
                Math.sin(2 * Math.PI * 800 * t) * 0.2   // 添加800Hz的泛音
            ) * Math.pow(1 - t, 2);  // 使用平方函数实现更平滑的衰减
        }
        
        this.jumpSound = audioBuffer;
    }
    
    // 修改 playJumpSound 方法，添加音量控制
    playJumpSound() {
        if (this.jumpSound && this.audioContext) {
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            // 设置音量
            gainNode.gain.value = 0.3;  // 降低音量到30%
            
            // 连接节点
            source.buffer = this.jumpSound;
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // 启动音频
            source.start();
        }
    }
    
    // 添加游戏结束音效生成方法
    createGameOverSound() {
        const duration = 0.5;  // 音效持续时间
        const audioBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        
        // 生成音效波形
        for (let i = 0; i < audioBuffer.length; i++) {
            const t = i / audioBuffer.length;
            // 创建一个下降的音调效果
            channelData[i] = (
                Math.sin(2 * Math.PI * (600 - 300 * t) * t) * 0.5 +  // 主音频从600Hz降至300Hz
                Math.sin(2 * Math.PI * (400 - 200 * t) * t) * 0.3    // 添加和声
            ) * Math.pow(1 - t, 1.5);  // 平滑的音量衰减
        }
        
        this.gameOverSound = audioBuffer;
    }
    
    // 添加播放游戏结束音效的方法
    playGameOverSound() {
        if (this.gameOverSound && this.audioContext) {
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            // 设置音量
            gainNode.gain.value = 0.4;  // 设置适中的音量
            
            // 连接节点
            source.buffer = this.gameOverSound;
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // 启动音频
            source.start();
        }
    }

    // 添加新方法处理生成新题目
    generateNewQuestion() {
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        const isAddition = Math.random() > 0.5;
        
        if (isAddition) {
            this.arithmeticQuiz.question = `${num1} + ${num2} = ?`;
            this.arithmeticQuiz.answer = num1 + num2;
        } else {
            const [larger, smaller] = [Math.max(num1, num2), Math.min(num1, num2)];
            this.arithmeticQuiz.question = `${larger} - ${smaller} = ?`;
            this.arithmeticQuiz.answer = larger - smaller;
        }
        
        // 生成新选项
        this.generateQuizOptions();
        
        // 更新UI（这里会同时更新进度显示）
        this.updateQuizUI();
    }
}

// 启动游戏
window.onload = () => new FlappyBird(); 