// Configurações do canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ajustar tamanho do canvas para diferentes resoluções
function resizeCanvas() {
    const container = canvas.parentElement;
    const maxWidth = container.clientWidth - 20;
    const maxHeight = window.innerHeight * 0.5;
    
    const aspectRatio = 900 / 550;
    let width = maxWidth;
    let height = width / aspectRatio;
    
    if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
    }
    
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Dimensões da mesa (proporcionais)
let TABLE = {
    x: 50,
    y: 40,
    width: 800,
    height: 470
};

function updateTableDimensions() {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Manter proporções relativas
    TABLE = {
        x: 50,
        y: 40,
        width: 800,
        height: 470
    };
}

// Configurações físicas
const FRICTION = 0.98;
const WALL_BOUNCE = 0.85;
const BALL_RADIUS = 7;

// Estado do jogo
let balls = [];
let cueBall = null;
let playerScore = 0;
let opponentScore = 0;
let currentTurn = 'player';
let isMoving = false;
let gameMode = 'normal';
let selectedPower = 50;
let cueAngle = 0;
let isDragging = false;
let dragStart = null;
let animationId = null;
let touchTimeout = null;

// Cores das bolas
const ballColors = {
    0: '#FFFFFF',
    1: '#FFD700',
    2: '#FF6B6B',
    3: '#4CAF50',
    4: '#FF9800',
    5: '#9C27B0',
    6: '#2196F3',
    7: '#8BC34A',
    8: '#FF5722',
    9: '#00BCD4',
    10: '#E91E63',
    11: '#CDDC39',
    12: '#FFC107',
    13: '#9E9E9E',
    14: '#795548',
    15: '#607D8B'
};

// Inicializar bolas conforme modo de jogo
function initBalls() {
    balls = [];
    
    cueBall = {
        x: TABLE.x + 70,
        y: TABLE.y + TABLE.height/2,
        vx: 0,
        vy: 0,
        color: '#FFFFFF',
        number: 0,
        radius: BALL_RADIUS
    };
    balls.push(cueBall);
    
    if (gameMode === 'normal') {
        initNormalMode();
    } else {
        initBolinhoMode();
    }
}

function initNormalMode() {
    const startX = TABLE.x + TABLE.width - 100;
    const startY = TABLE.y + TABLE.height/2;
    const spacing = BALL_RADIUS * 2 + 2;
    
    let numbers = [1,2,3,4,5,6,7];
    let index = 0;
    
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col <= row; col++) {
            if (index >= numbers.length) break;
            
            const x = startX - row * spacing;
            const y = startY - (row * spacing/2) + (col * spacing);
            
            balls.push({
                x: x,
                y: y,
                vx: 0,
                vy: 0,
                color: ballColors[numbers[index]],
                number: numbers[index],
                radius: BALL_RADIUS
            });
            index++;
        }
    }
}

function initBolinhoMode() {
    const isOdd = Math.random() < 0.5;
    
    let numbers;
    if (isOdd) {
        const oddNumbers = [1,3,5,7,9,11,13,15];
        numbers = oddNumbers.sort(() => Math.random() - 0.5).slice(0, 3);
    } else {
        const evenNumbers = [2,4,6,8,10,12,14];
        numbers = evenNumbers.sort(() => Math.random() - 0.5).slice(0, 3);
    }
    
    const startX = TABLE.x + TABLE.width - 80;
    const startY = TABLE.y + TABLE.height/2;
    const spacing = BALL_RADIUS * 2 + 5;
    
    numbers.forEach((num, i) => {
        balls.push({
            x: startX - (i * spacing * 0.8),
            y: startY + (i === 1 ? 0 : (i === 0 ? -12 : 12)),
            vx: 0,
            vy: 0,
            color: ballColors[num],
            number: num,
            radius: BALL_RADIUS
        });
    });
    
    const modeText = isOdd ? "ÍMPAR" : "PAR";
    document.getElementById('ballsRemaining').innerHTML = `Modo Bolinho: ${modeText}<br>Bolas: ${numbers.join(', ')}`;
}

// Verificar colisão
function checkCollision(ball1, ball2) {
    const dx = ball1.x - ball2.x;
    const dy = ball1.y - ball2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < ball1.radius + ball2.radius;
}

// Resolver colisão
function resolveCollision(ball1, ball2) {
    const dx = ball1.x - ball2.x;
    const dy = ball1.y - ball2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const overlap = (ball1.radius + ball2.radius) - distance;
    
    const angle = Math.atan2(dy, dx);
    const moveX = Math.cos(angle) * overlap / 2;
    const moveY = Math.sin(angle) * overlap / 2;
    
    ball1.x += moveX;
    ball1.y += moveY;
    ball2.x -= moveX;
    ball2.y -= moveY;
    
    const nx = dx / distance;
    const ny = dy / distance;
    const vrelx = ball1.vx - ball2.vx;
    const vrely = ball1.vy - ball2.vy;
    const dot = vrelx * nx + vrely * ny;
    
    if (dot < 0) {
        const e = 0.9;
        const m1 = 1, m2 = 1;
        const imp = (1 + e) * dot / ((1/m1) + (1/m2));
        
        ball1.vx -= imp * nx / m1;
        ball1.vy -= imp * ny / m1;
        ball2.vx += imp * nx / m2;
        ball2.vy += imp * ny / m2;
    }
}

// Verificar colisão com paredes
function checkWallCollision(ball) {
    const leftWall = TABLE.x;
    const rightWall = TABLE.x + TABLE.width;
    const topWall = TABLE.y;
    const bottomWall = TABLE.y + TABLE.height;
    
    if (ball.x - ball.radius < leftWall) {
        ball.x = leftWall + ball.radius;
        ball.vx = -ball.vx * WALL_BOUNCE;
    }
    if (ball.x + ball.radius > rightWall) {
        ball.x = rightWall - ball.radius;
        ball.vx = -ball.vx * WALL_BOUNCE;
    }
    if (ball.y - ball.radius < topWall) {
        ball.y = topWall + ball.radius;
        ball.vy = -ball.vy * WALL_BOUNCE;
    }
    if (ball.y + ball.radius > bottomWall) {
        ball.y = bottomWall - ball.radius;
        ball.vy = -ball.vy * WALL_BOUNCE;
    }
}

// Verificar caçapa
function checkPocket(ball) {
    const pockets = [
        {x: TABLE.x, y: TABLE.y},
        {x: TABLE.x + TABLE.width, y: TABLE.y},
        {x: TABLE.x, y: TABLE.y + TABLE.height},
        {x: TABLE.x + TABLE.width, y: TABLE.y + TABLE.height},
        {x: TABLE.x + TABLE.width/2, y: TABLE.y},
        {x: TABLE.x + TABLE.width/2, y: TABLE.y + TABLE.height}
    ];
    
    for (let pocket of pockets) {
        const dx = ball.x - pocket.x;
        const dy = ball.y - pocket.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < BALL_RADIUS + 8) {
            if (ball.number === 0) {
                resetCueBall();
                if (currentTurn === 'player') {
                    opponentScore += 2;
                } else {
                    playerScore += 2;
                }
                updateScores();
                switchTurn();
            } else {
                if (currentTurn === 'player') {
                    playerScore += ball.number;
                } else {
                    opponentScore += ball.number;
                }
                updateScores();
                
                const index = balls.indexOf(ball);
                if (index > -1) balls.splice(index, 1);
                
                checkGameOver();
            }
            return true;
        }
    }
    return false;
}

function resetCueBall() {
    cueBall.x = TABLE.x + 70;
    cueBall.y = TABLE.y + TABLE.height/2;
    cueBall.vx = 0;
    cueBall.vy = 0;
}

// Atualizar movimento
function updateMovement() {
    let moving = false;
    
    for (let ball of balls) {
        ball.vx *= FRICTION;
        ball.vy *= FRICTION;
        
        if (Math.abs(ball.vx) < 0.1) ball.vx = 0;
        if (Math.abs(ball.vy) < 0.1) ball.vy = 0;
        
        if (ball.vx !== 0 || ball.vy !== 0) {
            moving = true;
            ball.x += ball.vx;
            ball.y += ball.vy;
            
            checkWallCollision(ball);
            checkPocket(ball);
        }
    }
    
    for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
            if (checkCollision(balls[i], balls[j])) {
                resolveCollision(balls[i], balls[j]);
            }
        }
    }
    
    isMoving = moving;
    
    if (!moving && currentTurn === 'opponent') {
        setTimeout(() => aiPlay(), 500);
    }
    
    updateBallsRemaining();
    return moving;
}

// IA melhorada
function aiPlay() {
    if (currentTurn !== 'opponent' || isMoving) return;
    
    let bestBall = null;
    let bestAngle = 0;
    let bestPower = 10;
    
    for (let ball of balls) {
        if (ball.number !== 0) {
            const dx = ball.x - cueBall.x;
            const dy = ball.y - cueBall.y;
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            if (distance < 200) {
                bestBall = ball;
                bestAngle = Math.atan2(dy, dx);
                bestPower = Math.min(18, 200 / distance);
                break;
            }
        }
    }
    
    if (!bestBall && balls.length > 1) {
        let maxDistance = 0;
        for (let ball of balls) {
            if (ball.number !== 0) {
                const dx = ball.x - cueBall.x;
                const dy = ball.y - cueBall.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist > maxDistance) {
                    maxDistance = dist;
                    bestBall = ball;
                    bestAngle = Math.atan2(dy, dx);
                    bestPower = 15;
                }
            }
        }
    }
    
    if (bestBall) {
        cueBall.vx = Math.cos(bestAngle) * bestPower;
        cueBall.vy = Math.sin(bestAngle) * bestPower;
        isMoving = true;
        
        setTimeout(() => {
            if (!isMoving) {
                switchTurn();
            }
        }, 1000);
    } else {
        switchTurn();
    }
}

// Tacar com força selecionada manualmente
function shootBall() {
    if (isMoving || currentTurn !== 'player') return;
    
    const powerValue = 2 + (selectedPower / 100) * 18;
    
    if (powerValue > 2) {
        cueBall.vx = Math.cos(cueAngle) * powerValue;
        cueBall.vy = Math.sin(cueAngle) * powerValue;
        isMoving = true;
        
        // Feedback tátil para celular
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(50);
        }
        
        setTimeout(() => {
            if (!isMoving) {
                switchTurn();
            }
        }, 1000);
    }
}

// Trocar turno
function switchTurn() {
    currentTurn = currentTurn === 'player' ? 'opponent' : 'player';
    updateTurnDisplay();
}

// Atualizar displays
function updateTurnDisplay() {
    const turnIndicator = document.getElementById('turnIndicator');
    if (currentTurn === 'player') {
        turnIndicator.innerHTML = '🎯 SUA VEZ!';
        turnIndicator.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    } else {
        turnIndicator.innerHTML = '🤖 VEZ DO OPONENTE';
        turnIndicator.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
    }
}

function updateScores() {
    document.getElementById('playerScore').textContent = playerScore;
    document.getElementById('opponentScore').textContent = opponentScore;
}

function updateBallsRemaining() {
    const coloredBalls = balls.filter(b => b.number !== 0);
    if (gameMode === 'normal') {
        document.getElementById('ballsRemaining').innerHTML = `Bolas restantes: ${coloredBalls.length}`;
    }
}

function updatePowerDisplay() {
    document.getElementById('selectedPower').textContent = Math.floor(selectedPower);
    document.getElementById('powerBarManual').style.width = selectedPower + '%';
}

function checkGameOver() {
    const coloredBalls = balls.filter(b => b.number !== 0);
    if (coloredBalls.length === 0) {
        let winner = playerScore > opponentScore ? 'JOGADOR' : 'OPONENTE';
        setTimeout(() => {
            alert(`🏆 FIM DE JOGO! 🏆\n\n${winner} VENCEU!\nPlacar: ${playerScore} x ${opponentScore}`);
            resetGame();
        }, 100);
    }
}

function resetGame() {
    playerScore = 0;
    opponentScore = 0;
    currentTurn = 'player';
    isMoving = false;
    updateScores();
    initBalls();
    updateTurnDisplay();
    if (gameMode !== 'normal') {
        updateBallsRemaining();
    }
}

// Desenhar mesa
function drawTable() {
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(TABLE.x, TABLE.y, TABLE.width, TABLE.height);
    
    ctx.fillStyle = '#A0822A';
    for (let i = -3; i <= 3; i++) {
        ctx.fillRect(TABLE.x - 8 + i, TABLE.y - 10, TABLE.width + 16, 10);
        ctx.fillRect(TABLE.x - 8 + i, TABLE.y + TABLE.height, TABLE.width + 16, 10);
        ctx.fillRect(TABLE.x - 10, TABLE.y - 8 + i, 10, TABLE.height + 16);
        ctx.fillRect(TABLE.x + TABLE.width, TABLE.y - 8 + i, 10, TABLE.height + 16);
    }
    
    ctx.fillStyle = '#1a1a1a';
    const pockets = [
        {x: TABLE.x, y: TABLE.y},
        {x: TABLE.x + TABLE.width, y: TABLE.y},
        {x: TABLE.x, y: TABLE.y + TABLE.height},
        {x: TABLE.x + TABLE.width, y: TABLE.y + TABLE.height},
        {x: TABLE.x + TABLE.width/2, y: TABLE.y},
        {x: TABLE.x + TABLE.width/2, y: TABLE.y + TABLE.height}
    ];
    
    pockets.forEach(pocket => {
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#333';
        ctx.fill();
        ctx.fillStyle = '#1a1a1a';
    });
}

// Desenhar bolas
function drawBalls() {
    for (let ball of balls) {
        ctx.shadowBlur = 5;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        
        const gradient = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 2, ball.x, ball.y, ball.radius);
        gradient.addColorStop(0, ball.color);
        gradient.addColorStop(1, '#888');
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(ball.x - 2, ball.y - 2, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fill();
        
        if (ball.number > 0) {
            ctx.fillStyle = '#000';
            ctx.font = `bold ${ball.radius}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(ball.number, ball.x, ball.y);
        }
        
        ctx.shadowBlur = 0;
    }
}

// Desenhar taco
function drawCue() {
    if (currentTurn === 'player' && !isMoving && !isDragging) {
        ctx.save();
        ctx.translate(cueBall.x, cueBall.y);
        ctx.rotate(cueAngle);
        
        ctx.beginPath();
        ctx.moveTo(5, -3);
        ctx.lineTo(35, -1.5);
        ctx.lineTo(35, 1.5);
        ctx.lineTo(5, 3);
        ctx.fillStyle = '#8B4513';
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(35, -1.5);
        ctx.lineTo(42, 0);
        ctx.lineTo(35, 1.5);
        ctx.fillStyle = '#FFF';
        ctx.fill();
        
        ctx.restore();
    }
}

// Desenhar mira
function drawAim() {
    if (isDragging && currentTurn === 'player' && !isMoving) {
        ctx.beginPath();
        ctx.arc(cueBall.x, cueBall.y, BALL_RADIUS + 5, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        const endX = cueBall.x + Math.cos(cueAngle) * 100;
        const endY = cueBall.y + Math.sin(cueAngle) * 100;
        
        ctx.beginPath();
        ctx.moveTo(cueBall.x, cueBall.y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = `rgba(255, 215, 0, 0.5)`;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.shadowBlur = 3;
        ctx.fillText(`💪 ${Math.floor(selectedPower)}%`, endX - 20, endY - 10);
        ctx.shadowBlur = 0;
    }
}

// Eventos de mouse/touch otimizados para mobile
function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    let x = (clientX - rect.left) * scaleX;
    let y = (clientY - rect.top) * scaleY;
    
    // Limitar coordenadas ao canvas
    x = Math.max(0, Math.min(canvas.width, x));
    y = Math.max(0, Math.min(canvas.height, y));
    
    return { x, y };
}

function onPointerDown(e) {
    e.preventDefault();
    if (isMoving || currentTurn !== 'player') return;
    
    const pos = getCanvasCoords(e);
    const dx = pos.x - cueBall.x;
    const dy = pos.y - cueBall.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist < BALL_RADIUS + 20) {
        isDragging = true;
        dragStart = pos;
        cueAngle = Math.atan2(dy, dx);
        
        // Feedback tátil
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(20);
        }
    }
}

function onPointerMove(e) {
    if (!isDragging || isMoving) return;
    e.preventDefault();
    
    const pos = getCanvasCoords(e);
    const dx = pos.x - cueBall.x;
    const dy = pos.y - cueBall.y;
    cueAngle = Math.atan2(dy, dx);
}

function onPointerUp(e) {
    if (!isDragging) return;
    e.preventDefault();
    isDragging = false;
}

// Event listeners para desktop e mobile
canvas.addEventListener('mousedown', onPointerDown);
canvas.addEventListener('mousemove', onPointerMove);
canvas.addEventListener('mouseup', onPointerUp);

canvas.addEventListener('touchstart', onPointerDown, { passive: false });
canvas.addEventListener('touchmove', onPointerMove, { passive: false });
canvas.addEventListener('touchend', onPointerUp);

// Botões de ação
document.getElementById('shootBtn')?.addEventListener('click', () => {
    if (currentTurn === 'player' && !isMoving && !isDragging) {
        shootBall();
    }
});

document.getElementById('touchShootBtn')?.addEventListener('click', () => {
    if (currentTurn === 'player' && !isMoving && !isDragging) {
        shootBall();
    }
});

document.getElementById('resetBtn').addEventListener('click', resetGame);
document.getElementById('aiBtn').addEventListener('click', () => {
    if (currentTurn === 'player' && !isMoving) {
        switchTurn();
    }
});

// Controles de força
const powerSlider = document.getElementById('powerSlider');
powerSlider.addEventListener('input', (e) => {
    selectedPower = parseInt(e.target.value);
    updatePowerDisplay();
});

document.querySelectorAll('.power-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        selectedPower = parseInt(btn.dataset.power);
        powerSlider.value = selectedPower;
        updatePowerDisplay();
        
        // Feedback tátil
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(10);
        }
    });
});

document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        setGameMode(btn.dataset.mode);
    });
});

// Mudar modo de jogo
function setGameMode(mode) {
    gameMode = mode;
    resetGame();
    
    document.querySelectorAll('.mode-btn').forEach(btn => {
        if (btn.dataset.mode === mode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Animação principal
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawTable();
    drawBalls();
    drawCue();
    drawAim();
    
    if (isMoving) {
        updateMovement();
    }
    
    requestAnimationFrame(animate);
}

// Inicializar
function init() {
    updateTableDimensions();
    initBalls();
    updateScores();
    updateTurnDisplay();
    updatePowerDisplay();
    animate();
}

init();