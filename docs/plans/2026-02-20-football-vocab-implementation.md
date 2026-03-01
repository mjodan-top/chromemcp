# Football Vocab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 创建一个足球主题的英语单词学习 H5 游戏，包含训练模式、射门挑战、闯关模式三种玩法。

**Architecture:** 单文件 HTML5 应用，使用纯 JavaScript + Canvas 实现游戏动画，LocalStorage 存储用户数据，Web Speech API 实现发音功能。

**Tech Stack:** HTML5, CSS3, ES6+ JavaScript, Canvas 2D API, Web Speech API, LocalStorage

---

## 准备工作

### Task 0: 创建项目目录结构

**Files:**
- Create: `examples/football-vocab/index.html`
- Create: `examples/football-vocab/README.md`

**Step 1: 创建目录**

```bash
mkdir -p examples/football-vocab
```

**Step 2: 初始化文件**

创建空的 index.html 和 README.md 文件。

---

## 第一阶段：基础结构和样式

### Task 1: HTML 基础结构和元信息

**Files:**
- Modify: `examples/football-vocab/index.html:1-50`

**Step 1: 编写基础 HTML 骨架**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Football Vocab - 足球单词</title>
    <meta name="description" content="通过足球游戏学习英语单词">
    <style>
        /* CSS will be added in Task 2 */
    </style>
</head>
<body>
    <!-- Content will be added in Task 3 -->
    <script>
        // JavaScript will be added in Task 4+
    </script>
</body>
</html>
```

**Step 2: 验证**

在浏览器打开文件，确认无错误。

**Step 3: Commit**

```bash
git add examples/football-vocab/index.html
git commit -m "feat(football-vocab): add basic HTML structure"
```

---

### Task 2: CSS 样式系统

**Files:**
- Modify: `examples/football-vocab/index.html:8-150`

**Step 1: 添加 CSS 变量和基础样式**

```css
:root {
    --primary-green: #2d5a27;
    --light-green: #4a7c43;
    --sky-blue: #87CEEB;
    --grass-light: #5a8f3e;
    --grass-dark: #3d6b2a;
    --white: #ffffff;
    --gold: #FFD700;
    --red: #e74c3c;
    --shadow: rgba(0, 0, 0, 0.3);
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Microsoft YaHei', 'Segoe UI', Arial, sans-serif;
    background: linear-gradient(180deg, var(--sky-blue) 0%, var(--grass-light) 40%);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
}

.game-container {
    width: 100%;
    max-width: 600px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 20px;
    box-shadow: 0 10px 40px var(--shadow);
    overflow: hidden;
}
```

**Step 2: 添加组件样式**

```css
/* Header */
.header {
    background: linear-gradient(135deg, var(--primary-green) 0%, var(--light-green) 100%);
    color: var(--white);
    padding: 15px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header h1 {
    font-size: 24px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.header-icon {
    font-size: 28px;
}

.stats-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    padding: 8px 15px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.3s;
}

.stats-btn:hover {
    background: rgba(255, 255, 255, 0.3);
}

/* Navigation Tabs */
.nav-tabs {
    display: flex;
    background: #f5f5f5;
    border-bottom: 2px solid #e0e0e0;
}

.nav-tab {
    flex: 1;
    padding: 15px 10px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 14px;
    color: #666;
    transition: all 0.3s;
    position: relative;
}

.nav-tab.active {
    color: var(--primary-green);
    font-weight: bold;
}

.nav-tab.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 20%;
    right: 20%;
    height: 3px;
    background: var(--primary-green);
    border-radius: 3px 3px 0 0;
}

/* Game Area */
.game-area {
    padding: 20px;
    min-height: 400px;
}

/* Canvas */
#gameCanvas {
    width: 100%;
    height: 200px;
    background: linear-gradient(180deg, #87CEEB 0%, #5a8f3e 60%);
    border-radius: 10px;
    margin-bottom: 20px;
}

/* Word Card */
.word-card {
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 15px;
    padding: 25px;
    text-align: center;
    margin-bottom: 20px;
    border: 2px solid #e0e0e0;
}

.word-display {
    font-size: 36px;
    font-weight: bold;
    color: #333;
    margin-bottom: 10px;
    font-family: Arial, sans-serif;
}

.phonetic {
    font-size: 18px;
    color: #666;
    margin-bottom: 15px;
}

.speak-btn {
    background: var(--primary-green);
    color: white;
    border: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 18px;
    transition: all 0.3s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.speak-btn:hover {
    background: var(--light-green);
    transform: scale(1.1);
}

/* Options Grid */
.options-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 20px;
}

.option-btn {
    padding: 15px 20px;
    border: 2px solid #e0e0e0;
    background: white;
    border-radius: 10px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.3s;
    text-align: center;
}

.option-btn:hover {
    border-color: var(--primary-green);
    background: #f0f8f0;
    transform: translateY(-2px);
}

.option-btn.correct {
    background: #d4edda;
    border-color: #28a745;
    color: #155724;
}

.option-btn.wrong {
    background: #f8d7da;
    border-color: #dc3545;
    color: #721c24;
}

.option-btn:disabled {
    cursor: not-allowed;
    opacity: 0.7;
}

/* Status Bar */
.status-bar {
    display: flex;
    justify-content: space-around;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 10px;
    font-size: 14px;
}

.status-item {
    display: flex;
    align-items: center;
    gap: 5px;
}

.status-label {
    color: #666;
}

.status-value {
    font-weight: bold;
    color: var(--primary-green);
}

/* Timer */
.timer-bar {
    width: 100%;
    height: 6px;
    background: #e0e0e0;
    border-radius: 3px;
    margin-bottom: 20px;
    overflow: hidden;
}

.timer-fill {
    height: 100%;
    background: linear-gradient(90deg, #28a745 0%, #ffc107 50%, #dc3545 100%);
    transition: width 1s linear;
}

/* Responsive */
@media (max-width: 480px) {
    .options-grid {
        grid-template-columns: 1fr;
    }

    .word-display {
        font-size: 28px;
    }

    .nav-tab {
        font-size: 12px;
        padding: 12px 8px;
    }
}
```

**Step 3: 验证样式**

添加临时 HTML 结构测试样式效果。

**Step 4: Commit**

```bash
git add examples/football-vocab/index.html
git commit -m "feat(football-vocab): add CSS styling system"
```

---

### Task 3: HTML 界面结构

**Files:**
- Modify: `examples/football-vocab/index.html:12-80`

**Step 1: 添加 HTML 结构**

```html
<body>
    <div class="game-container">
        <!-- Header -->
        <header class="header">
            <h1><span class="header-icon">⚽</span> Football Vocab</h1>
            <button class="stats-btn" onclick="showStats()">📊 统计</button>
        </header>

        <!-- Navigation Tabs -->
        <nav class="nav-tabs">
            <button class="nav-tab active" data-mode="practice" onclick="switchMode('practice')">训练</button>
            <button class="nav-tab" data-mode="shooting" onclick="switchMode('shooting')">射门</button>
            <button class="nav-tab" data-mode="levels" onclick="switchMode('levels')">闯关</button>
            <button class="nav-tab" data-mode="vocabulary" onclick="switchMode('vocabulary')">词库</button>
        </nav>

        <!-- Game Area -->
        <main class="game-area" id="gameArea">
            <!-- Canvas for game animation -->
            <canvas id="gameCanvas" width="600" height="200"></canvas>

            <!-- Timer bar (for shooting mode) -->
            <div class="timer-bar" id="timerBar" style="display: none;">
                <div class="timer-fill" id="timerFill" style="width: 100%;"></div>
            </div>

            <!-- Word Card -->
            <div class="word-card" id="wordCard">
                <div class="word-display" id="wordDisplay">Welcome</div>
                <div class="phonetic" id="phonetic">/ˈwelkəm/</div>
                <button class="speak-btn" onclick="speakWord()" title="播放发音">🔊</button>
                <div class="example" id="example" style="margin-top: 15px; color: #666; font-style: italic; display: none;">
                    Welcome to the game!
                </div>
            </div>

            <!-- Options -->
            <div class="options-grid" id="optionsGrid">
                <button class="option-btn" onclick="selectOption(0)">欢迎</button>
                <button class="option-btn" onclick="selectOption(1)">再见</button>
                <button class="option-btn" onclick="selectOption(2)">谢谢</button>
                <button class="option-btn" onclick="selectOption(3)">对不起</button>
            </div>

            <!-- Status Bar -->
            <div class="status-bar">
                <div class="status-item">
                    <span class="status-label">⭐ 得分:</span>
                    <span class="status-value" id="score">0</span>
                </div>
                <div class="status-item" id="timeItem" style="display: none;">
                    <span class="status-label">⏱️ 时间:</span>
                    <span class="status-value" id="timeLeft">90</span>
                </div>
                <div class="status-item">
                    <span class="status-label">🔥 连胜:</span>
                    <span class="status-value" id="streak">0</span>
                </div>
                <div class="status-item" id="levelItem" style="display: none;">
                    <span class="status-label">关卡:</span>
                    <span class="status-value" id="level">1</span>
                </div>
            </div>

            <!-- Practice Mode Controls -->
            <div class="practice-controls" id="practiceControls" style="display: none; margin-top: 20px; text-align: center;">
                <button onclick="prevWord()" style="padding: 10px 20px; margin: 0 10px;">← 上一个</button>
                <button onclick="nextWord()" style="padding: 10px 20px; margin: 0 10px;">下一个 →</button>
            </div>
        </main>
    </div>

    <script>
        // JavaScript will be implemented in following tasks
    </script>
</body>
```

**Step 2: 验证界面**

在浏览器中查看，确认所有元素正确显示。

**Step 3: Commit**

```bash
git add examples/football-vocab/index.html
git commit -m "feat(football-vocab): add HTML UI structure"
```

---

## 第二阶段：数据层

### Task 4: 内置词库数据

**Files:**
- Modify: `examples/football-vocab/index.html:85-200`

**Step 1: 添加词库数据**

```javascript
// Built-in vocabulary (200 words)
const BUILTIN_WORDS = [
    // Easy level - Colors
    { id: 'e1', word: 'red', phonetic: '/red/', meaning: '红色', example: 'The rose is red.', exampleTranslation: '这朵玫瑰是红色的。', difficulty: 'easy', category: 'colors' },
    { id: 'e2', word: 'blue', phonetic: '/bluː/', meaning: '蓝色', example: 'The sky is blue.', exampleTranslation: '天空是蓝色的。', difficulty: 'easy', category: 'colors' },
    { id: 'e3', word: 'green', phonetic: '/ɡriːn/', meaning: '绿色', example: 'The grass is green.', exampleTranslation: '草地是绿色的。', difficulty: 'easy', category: 'colors' },
    { id: 'e4', word: 'yellow', phonetic: '/ˈjeləʊ/', meaning: '黄色', example: 'The banana is yellow.', exampleTranslation: '香蕉是黄色的。', difficulty: 'easy', category: 'colors' },
    { id: 'e5', word: 'black', phonetic: '/blæk/', meaning: '黑色', example: 'The cat is black.', exampleTranslation: '这只猫是黑色的。', difficulty: 'easy', category: 'colors' },
    { id: 'e6', word: 'white', phonetic: '/waɪt/', meaning: '白色', example: 'The snow is white.', exampleTranslation: '雪是白色的。', difficulty: 'easy', category: 'colors' },

    // Easy level - Animals
    { id: 'e7', word: 'dog', phonetic: '/dɒɡ/', meaning: '狗', example: 'I have a pet dog.', exampleTranslation: '我有一只宠物狗。', difficulty: 'easy', category: 'animals' },
    { id: 'e8', word: 'cat', phonetic: '/kæt/', meaning: '猫', example: 'The cat is sleeping.', exampleTranslation: '猫正在睡觉。', difficulty: 'easy', category: 'animals' },
    { id: 'e9', word: 'bird', phonetic: '/bɜːd/', meaning: '鸟', example: 'The bird can fly.', exampleTranslation: '鸟会飞。', difficulty: 'easy', category: 'animals' },
    { id: 'e10', word: 'fish', phonetic: '/fɪʃ/', meaning: '鱼', example: 'Fish swim in water.', exampleTranslation: '鱼在水里游。', difficulty: 'easy', category: 'animals' },
    { id: 'e11', word: 'tiger', phonetic: '/ˈtaɪɡə/', meaning: '老虎', example: 'The tiger is strong.', exampleTranslation: '老虎很强壮。', difficulty: 'easy', category: 'animals' },
    { id: 'e12', word: 'elephant', phonetic: '/ˈelɪfənt/', meaning: '大象', example: 'The elephant is big.', exampleTranslation: '大象很大。', difficulty: 'easy', category: 'animals' },

    // Easy level - Food
    { id: 'e13', word: 'apple', phonetic: '/ˈæpl/', meaning: '苹果', example: 'I eat an apple.', exampleTranslation: '我吃一个苹果。', difficulty: 'easy', category: 'food' },
    { id: 'e14', word: 'banana', phonetic: '/bəˈnɑːnə/', meaning: '香蕉', example: 'The banana is yellow.', exampleTranslation: '香蕉是黄色的。', difficulty: 'easy', category: 'food' },
    { id: 'e15', word: 'orange', phonetic: '/ˈɒrɪndʒ/', meaning: '橙子', example: 'I like orange juice.', exampleTranslation: '我喜欢橙汁。', difficulty: 'easy', category: 'food' },
    { id: 'e16', word: 'bread', phonetic: '/bred/', meaning: '面包', example: 'I eat bread for breakfast.', exampleTranslation: '我早餐吃面包。', difficulty: 'easy', category: 'food' },
    { id: 'e17', word: 'milk', phonetic: '/mɪlk/', meaning: '牛奶', example: 'I drink milk every day.', exampleTranslation: '我每天喝牛奶。', difficulty: 'easy', category: 'food' },
    { id: 'e18', word: 'water', phonetic: '/ˈwɔːtə/', meaning: '水', example: 'Water is important.', exampleTranslation: '水很重要。', difficulty: 'easy', category: 'food' },

    // Easy level - Numbers
    { id: 'e19', word: 'one', phonetic: '/wʌn/', meaning: '一', example: 'I have one book.', exampleTranslation: '我有一本书。', difficulty: 'easy', category: 'numbers' },
    { id: 'e20', word: 'two', phonetic: '/tuː/', meaning: '二', example: 'I have two hands.', exampleTranslation: '我有两只手。', difficulty: 'easy', category: 'numbers' },
    { id: 'e21', word: 'three', phonetic: '/θriː/', meaning: '三', example: 'I have three apples.', exampleTranslation: '我有三个苹果。', difficulty: 'easy', category: 'numbers' },
    { id: 'e22', word: 'four', phonetic: '/fɔː/', meaning: '四', example: 'A table has four legs.', exampleTranslation: '桌子有四条腿。', difficulty: 'easy', category: 'numbers' },
    { id: 'e23', word: 'five', phonetic: '/faɪv/', meaning: '五', example: 'I have five fingers.', exampleTranslation: '我有五根手指。', difficulty: 'easy', category: 'numbers' },
    { id: 'e24', word: 'ten', phonetic: '/ten/', meaning: '十', example: 'I have ten toes.', exampleTranslation: '我有十个脚趾。', difficulty: 'easy', category: 'numbers' },

    // Easy level - Family
    { id: 'e25', word: 'father', phonetic: '/ˈfɑːðə/', meaning: '父亲', example: 'My father is tall.', exampleTranslation: '我的父亲很高。', difficulty: 'easy', category: 'family' },
    { id: 'e26', word: 'mother', phonetic: '/ˈmʌðə/', meaning: '母亲', example: 'My mother is kind.', exampleTranslation: '我的母亲很善良。', difficulty: 'easy', category: 'family' },
    { id: 'e27', word: 'brother', phonetic: '/ˈbrʌðə/', meaning: '兄弟', example: 'I have one brother.', exampleTranslation: '我有一个兄弟。', difficulty: 'easy', category: 'family' },
    { id: 'e28', word: 'sister', phonetic: '/ˈsɪstə/', meaning: '姐妹', example: 'My sister is a student.', exampleTranslation: '我的姐妹是学生。', difficulty: 'easy', category: 'family' },
    { id: 'e29', word: 'friend', phonetic: '/frend/', meaning: '朋友', example: 'He is my good friend.', exampleTranslation: '他是我的好朋友。', difficulty: 'easy', category: 'family' },
    { id: 'e30', word: 'teacher', phonetic: '/ˈtiːtʃə/', meaning: '老师', example: 'My teacher is nice.', exampleTranslation: '我的老师很好。', difficulty: 'easy', category: 'family' },

    // Medium level - School
    { id: 'm1', word: 'classroom', phonetic: '/ˈklɑːsruːm/', meaning: '教室', example: 'We study in the classroom.', exampleTranslation: '我们在教室里学习。', difficulty: 'medium', category: 'school' },
    { id: 'm2', word: 'textbook', phonetic: '/ˈtekstbʊk/', meaning: '教科书', example: 'Open your textbook.', exampleTranslation: '打开你的教科书。', difficulty: 'medium', category: 'school' },
    { id: 'm3', word: 'homework', phonetic: '/ˈhəʊmwɜːk/', meaning: '家庭作业', example: 'I finish my homework.', exampleTranslation: '我完成了家庭作业。', difficulty: 'medium', category: 'school' },
    { id: 'm4', word: 'examination', phonetic: '/ɪɡˌzæmɪˈneɪʃn/', meaning: '考试', example: 'The examination is difficult.', exampleTranslation: '这场考试很难。', difficulty: 'medium', category: 'school' },
    { id: 'm5', word: 'subject', phonetic: '/ˈsʌbdʒɪkt/', meaning: '科目', example: 'Math is my favorite subject.', exampleTranslation: '数学是我最喜欢的科目。', difficulty: 'medium', category: 'school' },
    { id: 'm6', word: 'student', phonetic: '/ˈstjuːdnt/', meaning: '学生', example: 'I am a middle school student.', exampleTranslation: '我是一名中学生。', difficulty: 'medium', category: 'school' },

    // Medium level - Daily Life
    { id: 'm7', word: 'morning', phonetic: '/ˈmɔːnɪŋ/', meaning: '早晨', example: 'I exercise in the morning.', exampleTranslation: '我早晨锻炼。', difficulty: 'medium', category: 'daily' },
    { id: 'm8', word: 'afternoon', phonetic: '/ˌɑːftəˈnuːn/', meaning: '下午', example: 'I play games in the afternoon.', exampleTranslation: '我下午玩游戏。', difficulty: 'medium', category: 'daily' },
    { id: 'm9', word: 'evening', phonetic: '/ˈiːvnɪŋ/', meaning: '晚上', example: 'I read books in the evening.', exampleTranslation: '我晚上看书。', difficulty: 'medium', category: 'daily' },
    { id: 'm10', word: 'weather', phonetic: '/ˈweðə/', meaning: '天气', example: 'The weather is nice today.', exampleTranslation: '今天天气很好。', difficulty: 'medium', category: 'daily' },
    { id: 'm11', word: 'hospital', phonetic: '/ˈhɒspɪtl/', meaning: '医院', example: 'The hospital is nearby.', exampleTranslation: '医院就在附近。', difficulty: 'medium', category: 'daily' },
    { id: 'm12', word: 'restaurant', phonetic: '/ˈrestrɒnt/', meaning: '餐厅', example: 'We eat at a restaurant.', exampleTranslation: '我们在餐厅吃饭。', difficulty: 'medium', category: 'daily' },

    // Medium level - Sports
    { id: 'm13', word: 'basketball', phonetic: '/ˈbɑːskɪtbɔːl/', meaning: '篮球', example: 'I play basketball.', exampleTranslation: '我打篮球。', difficulty: 'medium', category: 'sports' },
    { id: 'm14', word: 'football', phonetic: '/ˈfʊtbɔːl/', meaning: '足球', example: 'Football is popular.', exampleTranslation: '足球很受欢迎。', difficulty: 'medium', category: 'sports' },
    { id: 'm15', word: 'swimming', phonetic: '/ˈswɪmɪŋ/', meaning: '游泳', example: 'I like swimming.', exampleTranslation: '我喜欢游泳。', difficulty: 'medium', category: 'sports' },
    { id: 'm16', word: 'running', phonetic: '/ˈrʌnɪŋ/', meaning: '跑步', example: 'Running is good exercise.', exampleTranslation: '跑步是很好的运动。', difficulty: 'medium', category: 'sports' },
    { id: 'm17', word: 'exercise', phonetic: '/ˈeksəsaɪz/', meaning: '运动', example: 'Exercise makes me healthy.', exampleTranslation: '运动使我健康。', difficulty: 'medium', category: 'sports' },
    { id: 'm18', word: 'game', phonetic: '/ɡeɪm/', meaning: '游戏', example: 'This game is fun.', exampleTranslation: '这个游戏很有趣。', difficulty: 'medium', category: 'sports' },

    // Hard level - Science
    { id: 'h1', word: 'experiment', phonetic: '/ɪkˈsperɪmənt/', meaning: '实验', example: 'We do experiments in lab.', exampleTranslation: '我们在实验室做实验。', difficulty: 'hard', category: 'science' },
    { id: 'h2', word: 'electricity', phonetic: '/ɪˌlekˈtrɪsəti/', meaning: '电', example: 'Electricity powers our homes.', exampleTranslation: '电为我们的家供电。', difficulty: 'hard', category: 'science' },
    { id: 'h3', word: 'chemical', phonetic: '/ˈkemɪkl/', meaning: '化学的', example: 'Chemical reactions are interesting.', exampleTranslation: '化学反应很有趣。', difficulty: 'hard', category: 'science' },
    { id: 'h4', word: 'biology', phonetic: '/baɪˈɒlədʒi/', meaning: '生物', example: 'Biology is the study of life.', exampleTranslation: '生物学是研究生命的学科。', difficulty: 'hard', category: 'science' },
    { id: 'h5', word: 'planet', phonetic: '/ˈplænɪt/', meaning: '行星', example: 'Earth is a planet.', exampleTranslation: '地球是一颗行星。', difficulty: 'hard', category: 'science' },
    { id: 'h6', word: 'technology', phonetic: '/tekˈnɒlədʒi/', meaning: '技术', example: 'Technology changes our life.', exampleTranslation: '技术改变了我们的生活。', difficulty: 'hard', category: 'science' },

    // Hard level - Abstract
    { id: 'h7', word: 'knowledge', phonetic: '/ˈnɒlɪdʒ/', meaning: '知识', example: 'Knowledge is power.', exampleTranslation: '知识就是力量。', difficulty: 'hard', category: 'abstract' },
    { id: 'h8', word: 'experience', phonetic: '/ɪkˈspɪəriəns/', meaning: '经验', example: 'Experience is the best teacher.', exampleTranslation: '经验是最好的老师。', difficulty: 'hard', category: 'abstract' },
    { id: 'h9', word: 'culture', phonetic: '/ˈkʌltʃə/', meaning: '文化', example: 'We learn about different cultures.', exampleTranslation: '我们学习不同的文化。', difficulty: 'hard', category: 'abstract' },
    { id: 'h10', word: 'society', phonetic: '/səˈsaɪəti/', meaning: '社会', example: 'We live in a big society.', exampleTranslation: '我们生活在一个大社会中。', difficulty: 'hard', category: 'abstract' },
    { id: 'h11', word: 'opportunity', phonetic: '/ˌɒpəˈtjuːnəti/', meaning: '机会', example: 'This is a good opportunity.', exampleTranslation: '这是一个好机会。', difficulty: 'hard', category: 'abstract' },
    { id: 'h12', word: 'environment', phonetic: '/ɪnˈvaɪrənmənt/', meaning: '环境', example: 'We must protect the environment.', exampleTranslation: '我们必须保护环境。', difficulty: 'hard', category: 'abstract' }
];

// Add more words to reach 200 total
const ADDITIONAL_WORDS = [
    // Add more easy words
    { id: 'e31', word: 'book', phonetic: '/bʊk/', meaning: '书', example: 'I read a book.', exampleTranslation: '我读书。', difficulty: 'easy', category: 'school' },
    { id: 'e32', word: 'pen', phonetic: '/pen/', meaning: '钢笔', example: 'I write with a pen.', exampleTranslation: '我用钢笔写字。', difficulty: 'easy', category: 'school' },
    { id: 'e33', word: 'table', phonetic: '/ˈteɪbl/', meaning: '桌子', example: 'The book is on the table.', exampleTranslation: '书在桌子上。', difficulty: 'easy', category: 'daily' },
    { id: 'e34', word: 'chair', phonetic: '/tʃeə/', meaning: '椅子', example: 'Sit on the chair.', exampleTranslation: '坐在椅子上。', difficulty: 'easy', category: 'daily' },
    { id: 'e35', word: 'door', phonetic: '/dɔː/', meaning: '门', example: 'Open the door.', exampleTranslation: '打开门。', difficulty: 'easy', category: 'daily' },
    { id: 'e36', word: 'window', phonetic: '/ˈwɪndəʊ/', meaning: '窗户', example: 'Close the window.', exampleTranslation: '关上窗户。', difficulty: 'easy', category: 'daily' },
    // ... more words
];

// Combine all words
const ALL_WORDS = [...BUILTIN_WORDS, ...ADDITIONAL_WORDS];
```

**Step 2: 测试数据加载**

```javascript
console.log('Total words loaded:', ALL_WORDS.length);
```

**Step 3: Commit**

```bash
git add examples/football-vocab/index.html
git commit -m "feat(football-vocab): add built-in vocabulary data (200 words)"
```

---

### Task 5: 用户数据管理（LocalStorage）

**Files:**
- Modify: `examples/football-vocab/index.html:200-300`

**Step 1: 添加数据管理模块**

```javascript
// User Data Manager
const UserData = {
    // Keys for localStorage
    KEYS: {
        PROGRESS: 'football_vocab_progress',
        CUSTOM_WORDS: 'football_vocab_custom'
    },

    // Default progress data
    defaultProgress: {
        learnedWords: [],
        wrongWords: [],
        highScore: 0,
        maxStreak: 0,
        levelProgress: 1,
        totalGames: 0,
        correctCount: 0,
        wrongCount: 0
    },

    // Get progress from localStorage
    getProgress() {
        try {
            const data = localStorage.getItem(this.KEYS.PROGRESS);
            return data ? { ...this.defaultProgress, ...JSON.parse(data) } : this.defaultProgress;
        } catch (e) {
            console.error('Error loading progress:', e);
            return this.defaultProgress;
        }
    },

    // Save progress to localStorage
    saveProgress(progress) {
        try {
            localStorage.setItem(this.KEYS.PROGRESS, JSON.stringify(progress));
        } catch (e) {
            console.error('Error saving progress:', e);
        }
    },

    // Get custom words
    getCustomWords() {
        try {
            const data = localStorage.getItem(this.KEYS.CUSTOM_WORDS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error loading custom words:', e);
            return [];
        }
    },

    // Save custom words
    saveCustomWords(words) {
        try {
            localStorage.setItem(this.KEYS.CUSTOM_WORDS, JSON.stringify(words));
        } catch (e) {
            console.error('Error saving custom words:', e);
        }
    },

    // Add a custom word
    addCustomWord(word) {
        const words = this.getCustomWords();
        const newWord = {
            id: 'custom_' + Date.now(),
            ...word,
            difficulty: 'easy',
            category: 'custom'
        };
        words.push(newWord);
        this.saveCustomWords(words);
        return newWord;
    },

    // Delete a custom word
    deleteCustomWord(wordId) {
        const words = this.getCustomWords();
        const filtered = words.filter(w => w.id !== wordId);
        this.saveCustomWords(filtered);
    },

    // Mark word as learned
    markLearned(wordId) {
        const progress = this.getProgress();
        if (!progress.learnedWords.includes(wordId)) {
            progress.learnedWords.push(wordId);
            this.saveProgress(progress);
        }
    },

    // Mark word as wrong
    markWrong(wordId) {
        const progress = this.getProgress();
        const existing = progress.wrongWords.find(w => w.id === wordId);
        if (existing) {
            existing.count++;
            existing.lastWrong = Date.now();
        } else {
            progress.wrongWords.push({
                id: wordId,
                count: 1,
                lastWrong: Date.now()
            });
        }
        progress.wrongCount++;
        this.saveProgress(progress);
    },

    // Mark word as correct (remove from wrong if answered correctly 3 times)
    markCorrect(wordId) {
        const progress = this.getProgress();
        progress.correctCount++;

        // Check if in wrong words
        const wrongIndex = progress.wrongWords.findIndex(w => w.id === wordId);
        if (wrongIndex !== -1) {
            // Decrease wrong count or remove
            progress.wrongWords[wrongIndex].count--;
            if (progress.wrongWords[wrongIndex].count <= 0) {
                progress.wrongWords.splice(wrongIndex, 1);
            }
        }

        this.saveProgress(progress);
    },

    // Update high score
    updateHighScore(score) {
        const progress = this.getProgress();
        if (score > progress.highScore) {
            progress.highScore = score;
            this.saveProgress(progress);
            return true;
        }
        return false;
    },

    // Update max streak
    updateMaxStreak(streak) {
        const progress = this.getProgress();
        if (streak > progress.maxStreak) {
            progress.maxStreak = streak;
            this.saveProgress(progress);
            return true;
        }
        return false;
    },

    // Update level progress
    updateLevelProgress(level) {
        const progress = this.getProgress();
        if (level > progress.levelProgress) {
            progress.levelProgress = level;
            this.saveProgress(progress);
        }
    },

    // Increment total games
    incrementGames() {
        const progress = this.getProgress();
        progress.totalGames++;
        this.saveProgress(progress);
    },

    // Get wrong words list
    getWrongWords() {
        const progress = this.getProgress();
        const customWords = this.getCustomWords();
        const allWords = [...ALL_WORDS, ...customWords];

        return progress.wrongWords.map(w => {
            const word = allWords.find(word => word.id === w.id);
            return { ...w, ...word };
        }).filter(w => w.word); // Filter out deleted words
    },

    // Clear all data
    clearAll() {
        localStorage.removeItem(this.KEYS.PROGRESS);
        localStorage.removeItem(this.KEYS.CUSTOM_WORDS);
    }
};
```

**Step 2: 测试数据管理**

```javascript
// Test functions
console.log('User progress:', UserData.getProgress());
console.log('Custom words:', UserData.getCustomWords());
```

**Step 3: Commit**

```bash
git add examples/football-vocab/index.html
git commit -m "feat(football-vocab): add user data management with LocalStorage"
```

---

## 第三阶段：核心游戏逻辑

### Task 6: 游戏状态管理

**Files:**
- Modify: `examples/football-vocab/index.html:300-400`

**Step 1: 添加游戏状态**

```javascript
// Game State
const GameState = {
    mode: 'practice', // practice | shooting | levels | vocabulary
    score: 0,
    streak: 0,
    timeLeft: 90,
    timerInterval: null,
    currentWord: null,
    options: [],
    level: 1,
    levelProgress: 0, // Current progress in level (consecutive correct)
    levelRequired: 3, // Required consecutive correct to pass level
    isAnswering: false, // Prevent multiple clicks
    practiceIndex: 0, // Current index in practice mode

    // Reset state for new game
    reset() {
        this.score = 0;
        this.streak = 0;
        this.timeLeft = 90;
        this.levelProgress = 0;
        this.isAnswering = false;
    },

    // Start timer for shooting mode
    startTimer() {
        this.stopTimer();
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            updateTimerDisplay();
            if (this.timeLeft <= 0) {
                this.stopTimer();
                endShootingGame();
            }
        }, 1000);
    },

    // Stop timer
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
};
```

**Step 2: 添加单词选择逻辑**

```javascript
// Word Manager
const WordManager = {
    // Get all available words
    getAllWords() {
        const customWords = UserData.getCustomWords();
        return [...ALL_WORDS, ...customWords];
    },

    // Get words by difficulty
    getWordsByDifficulty(difficulty) {
        return this.getAllWords().filter(w => w.difficulty === difficulty);
    },

    // Get random word
    getRandomWord(difficulty = null) {
        const words = difficulty
            ? this.getWordsByDifficulty(difficulty)
            : this.getAllWords();
        return words[Math.floor(Math.random() * words.length)];
    },

    // Generate options for a word (1 correct + 3 wrong)
    generateOptions(correctWord) {
        const allWords = this.getAllWords();
        const options = [correctWord];

        // Filter out the correct word and get random wrong options
        const wrongWords = allWords.filter(w => w.id !== correctWord.id);

        while (options.length < 4 && wrongWords.length > 0) {
            const randomIndex = Math.floor(Math.random() * wrongWords.length);
            const wrongWord = wrongWords.splice(randomIndex, 1)[0];
            if (!options.find(o => o.meaning === wrongWord.meaning)) {
                options.push(wrongWord);
            }
        }

        // Shuffle options
        return options.sort(() => Math.random() - 0.5);
    },

    // Get word for level
    getWordForLevel(level) {
        let difficulty;
        if (level <= 3) difficulty = 'easy';
        else if (level <= 6) difficulty = 'medium';
        else difficulty = 'hard';

        return this.getRandomWord(difficulty);
    }
};
```

**Step 3: Commit**

```bash
git add examples/football-vocab/index.html
git commit -m "feat(football-vocab): add game state and word management"
```

---

### Task 7: 模式切换功能

**Files:**
- Modify: `examples/football-vocab/index.html:400-500`

**Step 1: 添加模式切换函数**

```javascript
// Mode switching
function switchMode(mode) {
    // Update UI tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.mode === mode) {
            tab.classList.add('active');
        }
    });

    // Stop any running timer
    GameState.stopTimer();

    // Set mode
    GameState.mode = mode;
    GameState.reset();

    // Update UI based on mode
    const timerBar = document.getElementById('timerBar');
    const timeItem = document.getElementById('timeItem');
    const levelItem = document.getElementById('levelItem');
    const practiceControls = document.getElementById('practiceControls');
    const exampleDiv = document.getElementById('example');

    // Reset displays
    timerBar.style.display = 'none';
    timeItem.style.display = 'none';
    levelItem.style.display = 'none';
    practiceControls.style.display = 'none';
    exampleDiv.style.display = 'none';

    switch(mode) {
        case 'practice':
            practiceControls.style.display = 'block';
            exampleDiv.style.display = 'block';
            initPracticeMode();
            break;

        case 'shooting':
            timerBar.style.display = 'block';
            timeItem.style.display = 'flex';
            initShootingMode();
            break;

        case 'levels':
            levelItem.style.display = 'flex';
            initLevelsMode();
            break;

        case 'vocabulary':
            showVocabularyManager();
            break;
    }

    // Update status display
    updateStatusDisplay();
}

// Initialize Practice Mode
function initPracticeMode() {
    const words = WordManager.getAllWords();
    GameState.practiceIndex = 0;
    GameState.currentWord = words[0];
    displayWord();
}

// Initialize Shooting Mode
function initShootingMode() {
    GameState.reset();
    GameState.timeLeft = 90;
    nextShootingQuestion();
    GameState.startTimer();
}

// Initialize Levels Mode
function initLevelsMode() {
    const progress = UserData.getProgress();
    GameState.level = progress.levelProgress;
    GameState.levelProgress = 0;
    GameState.levelRequired = Math.min(3 + Math.floor((GameState.level - 1) / 3), 5);
    nextLevelQuestion();
}

// Update timer display
function updateTimerDisplay() {
    document.getElementById('timeLeft').textContent = GameState.timeLeft;
    const percentage = (GameState.timeLeft / 90) * 100;
    document.getElementById('timerFill').style.width = percentage + '%';
}

// Update status display
function updateStatusDisplay() {
    document.getElementById('score').textContent = GameState.score;
    document.getElementById('streak').textContent = GameState.streak;
    document.getElementById('level').textContent = GameState.level;
}
```

**Step 2: Commit**

```bash
git add examples/football-vocab/index.html
git commit -m "feat(football-vocab): add mode switching functionality"
```

---

### Task 8: 单词显示和选项功能

**Files:**
- Modify: `examples/football-vocab/index.html:500-600`

**Step 1: 添加显示函数**

```javascript
// Display current word
function displayWord() {
    if (!GameState.currentWord) return;

    const word = GameState.currentWord;
    document.getElementById('wordDisplay').textContent = word.word;
    document.getElementById('phonetic').textContent = word.phonetic;

    // Update example if in practice mode
    const exampleDiv = document.getElementById('example');
    if (GameState.mode === 'practice') {
        exampleDiv.innerHTML = `
            <div style="color: #333; margin-bottom: 5px;">${word.example}</div>
            <div style="color: #666; font-size: 14px;">${word.exampleTranslation}</div>
        `;
    }

    // Generate options
    GameState.options = WordManager.generateOptions(word);

    // Display options
    const optionButtons = document.querySelectorAll('.option-btn');
    GameState.options.forEach((option, index) => {
        if (optionButtons[index]) {
            optionButtons[index].textContent = option.meaning;
            optionButtons[index].className = 'option-btn';
            optionButtons[index].disabled = false;
        }
    });
}

// Select option
function selectOption(index) {
    if (GameState.isAnswering) return;
    GameState.isAnswering = true;

    const selectedOption = GameState.options[index];
    const isCorrect = selectedOption.id === GameState.currentWord.id;

    // Update button styles
    const optionButtons = document.querySelectorAll('.option-btn');
    optionButtons.forEach((btn, i) => {
        btn.disabled = true;
        if (GameState.options[i].id === GameState.currentWord.id) {
            btn.classList.add('correct');
        } else if (i === index && !isCorrect) {
            btn.classList.add('wrong');
        }
    });

    // Handle answer result
    if (isCorrect) {
        handleCorrectAnswer();
    } else {
        handleWrongAnswer();
    }

    // Delay before next question
    setTimeout(() => {
        nextQuestion();
        GameState.isAnswering = false;
    }, 1500);
}

// Handle correct answer
function handleCorrectAnswer() {
    GameState.streak++;
    UserData.markCorrect(GameState.currentWord.id);
    UserData.markLearned(GameState.currentWord.id);

    // Update high score tracking
    UserData.updateMaxStreak(GameState.streak);

    // Score calculation
    let points = 10;
    if (GameState.streak >= 3) {
        points = 20; // Fire mode
        showFireEffect();
    }
    GameState.score += points + GameState.streak;

    // Update progress for levels mode
    if (GameState.mode === 'levels') {
        GameState.levelProgress++;
        if (GameState.levelProgress >= GameState.levelRequired) {
            levelComplete();
            return;
        }
    }

    updateStatusDisplay();

    // Play animation
    GameRenderer.animateGoal();
}

// Handle wrong answer
function handleWrongAnswer() {
    GameState.streak = 0;
    UserData.markWrong(GameState.currentWord.id);

    updateStatusDisplay();

    // Play animation
    GameRenderer.animateMiss();

    // For levels mode, reset progress
    if (GameState.mode === 'levels') {
        setTimeout(() => {
            alert(`答错了！回到关卡起点，需要连续答对${GameState.levelRequired}题才能过关。`);
            GameState.levelProgress = 0;
            nextLevelQuestion();
        }, 1500);
        return;
    }
}

// Show fire effect
function showFireEffect() {
    const wordCard = document.getElementById('wordCard');
    wordCard.style.animation = 'firePulse 0.5s ease';
    setTimeout(() => {
        wordCard.style.animation = '';
    }, 500);
}

// Add fire animation to CSS
const fireStyle = document.createElement('style');
fireStyle.textContent = `
    @keyframes firePulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.4); }
        50% { box-shadow: 0 0 20px 10px rgba(255, 107, 107, 0.6); }
    }
`;
document.head.appendChild(fireStyle);

// Next question based on mode
function nextQuestion() {
    switch(GameState.mode) {
        case 'practice':
            nextPracticeWord();
            break;
        case 'shooting':
            nextShootingQuestion();
            break;
        case 'levels':
            nextLevelQuestion();
            break;
    }
}

// Practice mode navigation
function nextPracticeWord() {
    const words = WordManager.getAllWords();
    GameState.practiceIndex = (GameState.practiceIndex + 1) % words.length;
    GameState.currentWord = words[GameState.practiceIndex];
    displayWord();
}

function prevWord() {
    const words = WordManager.getAllWords();
    GameState.practiceIndex = (GameState.practiceIndex - 1 + words.length) % words.length;
    GameState.currentWord = words[GameState.practiceIndex];
    displayWord();
}

function nextWord() {
    nextPracticeWord();
}

// Shooting mode next question
function nextShootingQuestion() {
    GameState.currentWord = WordManager.getRandomWord();
    displayWord();
}

// Levels mode next question
function nextLevelQuestion() {
    GameState.currentWord = WordManager.getWordForLevel(GameState.level);
    displayWord();
}
```

**Step 2: Commit**

```bash
git add examples/football-vocab/index.html
git commit -m "feat(football-vocab): add word display and answer selection"
```

---

### Task 9: 游戏结束和关卡完成

**Files:**
- Modify: `examples/football-vocab/index.html:600-700`

**Step 1: 添加结束处理**

```javascript
// End shooting game
function endShootingGame() {
    GameState.stopTimer();
    UserData.incrementGames();
    const isNewRecord = UserData.updateHighScore(GameState.score);

    // Get rating
    let rating, message;
    if (GameState.score >= 200) {
        rating = '世界级球星';
        message = '太棒了！你的词汇量令人惊叹！';
    } else if (GameState.score >= 150) {
        rating = '球队核心';
        message = '出色的表现！你是球队的关键人物！';
    } else if (GameState.score >= 100) {
        rating = '主力球员';
        message = '不错的成绩！继续保持！';
    } else if (GameState.score >= 50) {
        rating = '替补队员';
        message = '还有进步空间，加油！';
    } else {
        rating = '新手球员';
        message = '多多练习，你会越来越好的！';
    }

    const recordText = isNewRecord ? '\n🎉 新纪录！' : '';

    alert(`时间到！${recordText}\n\n最终得分: ${GameState.score}\n评价: ${rating}\n${message}\n\n再玩一次？`);

    // Restart
    initShootingMode();
}

// Level complete
function levelComplete() {
    UserData.updateLevelProgress(GameState.level + 1);

    if (GameState.level >= 10) {
        // Game complete
        alert(`🎉 恭喜你通关所有关卡！\n\n你已经掌握了大量词汇！\n最高分: ${UserData.getProgress().highScore}\n最高连胜: ${UserData.getProgress().maxStreak}`);
        switchMode('practice');
    } else {
        alert(`🎉 第 ${GameState.level} 关通过！\n\n解锁第 ${GameState.level + 1} 关！`);
        GameState.level++;
        GameState.levelProgress = 0;
        GameState.levelRequired = Math.min(3 + Math.floor((GameState.level - 1) / 3), 5);
        updateStatusDisplay();
        nextLevelQuestion();
    }
}
```

**Step 2: Commit**

```bash
git add examples/football-vocab/index.html
git commit -m "feat(football-vocab): add game end and level complete handlers"
```

---

## 第四阶段：Canvas 动画

### Task 10: Canvas 游戏渲染器

**Files:**
- Modify: `examples/football-vocab/index.html:700-900`

**Step 1: 添加 Canvas 渲染器**

```javascript
// Canvas Game Renderer
const GameRenderer = {
    canvas: null,
    ctx: null,
    animationId: null,

    // Initialize canvas
    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.renderField();
        return this;
    },

    // Render static field
    renderField() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, w, h);

        // Sky gradient
        const skyGradient = ctx.createLinearGradient(0, 0, 0, h * 0.4);
        skyGradient.addColorStop(0, '#87CEEB');
        skyGradient.addColorStop(1, '#B0E0E6');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, w, h * 0.4);

        // Grass gradient
        const grassGradient = ctx.createLinearGradient(0, h * 0.4, 0, h);
        grassGradient.addColorStop(0, '#5a8f3e');
        grassGradient.addColorStop(0.5, '#4a7c32');
        grassGradient.addColorStop(1, '#3d6b2a');
        ctx.fillStyle = grassGradient;
        ctx.fillRect(0, h * 0.4, w, h * 0.6);

        // Field lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 3;

        // Center line
        ctx.beginPath();
        ctx.moveTo(0, h * 0.7);
        ctx.lineTo(w, h * 0.7);
        ctx.stroke();

        // Center circle
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.7, 40, 0, Math.PI * 2);
        ctx.stroke();

        // Goal area
        ctx.strokeRect(w * 0.3, h * 0.4, w * 0.4, 60);

        // Goal
        this.renderGoal(w / 2, h * 0.42);

        // Player (static position)
        this.renderPlayer(w * 0.2, h * 0.75);

        // Ball (static position)
        this.renderBall(w * 0.25, h * 0.78);
    },

    // Render goal
    renderGoal(x, y) {
        const ctx = this.ctx;
        const goalWidth = 80;
        const goalHeight = 40;

        // Goal posts
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x - goalWidth / 2, y);
        ctx.lineTo(x - goalWidth / 2, y - goalHeight);
        ctx.lineTo(x + goalWidth / 2, y - goalHeight);
        ctx.lineTo(x + goalWidth / 2, y);
        ctx.stroke();

        // Net pattern
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < goalWidth; i += 10) {
            ctx.beginPath();
            ctx.moveTo(x - goalWidth / 2 + i, y);
            ctx.lineTo(x - goalWidth / 2 + i, y - goalHeight);
            ctx.stroke();
        }
    },

    // Render player
    renderPlayer(x, y) {
        const ctx = this.ctx;

        // Body
        ctx.fillStyle = '#2d5a27';
        ctx.fillRect(x - 15, y - 30, 30, 30);

        // Head
        ctx.fillStyle = '#fdbf60';
        ctx.beginPath();
        ctx.arc(x, y - 40, 12, 0, Math.PI * 2);
        ctx.fill();

        // Legs
        ctx.fillStyle = '#2d5a27';
        ctx.fillRect(x - 12, y, 8, 20);
        ctx.fillRect(x + 4, y, 8, 20);
    },

    // Render ball
    renderBall(x, y, rotation = 0) {
        const ctx = this.ctx;
        const radius = 10;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);

        // Ball base
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        // Black patches (simplified soccer ball pattern)
        ctx.fillStyle = '#333';
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(
                Math.cos(angle) * radius * 0.5,
                Math.sin(angle) * radius * 0.5,
                radius * 0.25,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

        ctx.restore();
    },

    // Animate goal
    animateGoal() {
        const startX = this.canvas.width * 0.25;
        const startY = this.canvas.height * 0.78;
        const goalX = this.canvas.width / 2;
        const goalY = this.canvas.height * 0.42;

        let progress = 0;
        const duration = 1000; // ms
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            progress = Math.min(elapsed / duration, 1);

            // Re-render field
            this.renderField();

            // Calculate ball position (parabolic arc)
            const currentX = startX + (goalX - startX) * progress;
            const arcHeight = 50;
            const currentY = startY + (goalY - startY) * progress - Math.sin(progress * Math.PI) * arcHeight;
            const rotation = progress * Math.PI * 4;

            // Render ball
            this.renderBall(currentX, currentY, rotation);

            if (progress < 1) {
                this.animationId = requestAnimationFrame(animate);
            } else {
                // Show GOAL text
                this.showGoalText();
            }
        };

        animate();
    },

    // Animate miss
    animateMiss() {
        const startX = this.canvas.width * 0.25;
        const startY = this.canvas.height * 0.78;

        // Random miss direction
        const missDirection = Math.random() > 0.5 ? 1 : -1;
        const missX = this.canvas.width / 2 + missDirection * 100;
        const missY = this.canvas.height * 0.5;

        let progress = 0;
        const duration = 800;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            progress = Math.min(elapsed / duration, 1);

            this.renderField();

            const currentX = startX + (missX - startX) * progress;
            const currentY = startY + (missY - startY) * progress;
            const rotation = progress * Math.PI * 3;

            this.renderBall(currentX, currentY, rotation);

            if (progress < 1) {
                this.animationId = requestAnimationFrame(animate);
            }
        };

        animate();
    },

    // Show GOAL text
    showGoalText() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.save();
        ctx.font = 'bold 48px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;

        const text = GameState.streak >= 3 ? '🔥 GOAL! 🔥' : 'GOAL!';
        ctx.strokeText(text, w / 2, h * 0.5);
        ctx.fillText(text, w / 2, h * 0.5);
        ctx.restore();

        // Clear after delay
        setTimeout(() => {
            this.renderField();
        }, 1500);
    }
};
```

**Step 2: 初始化 Canvas**

```javascript
// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    GameRenderer.init('gameCanvas');
    switchMode('practice');
});
```

**Step 3: Commit**

```bash
git add examples/football-vocab/index.html
git commit -m "feat(football-vocab): add Canvas game renderer with goal/miss animations"
```

---

## 第五阶段：高级功能

### Task 11: 发音功能

**Files:**
- Modify: `examples/football-vocab/index.html:900-950`

**Step 1: 添加发音函数**

```javascript
// Speak word using Web Speech API
function speakWord() {
    if (!GameState.currentWord) return;

    // Check if browser supports speech synthesis
    if (!window.speechSynthesis) {
        alert('您的浏览器不支持语音功能');
        return;
    }

    const utterance = new SpeechSynthesisUtterance(GameState.currentWord.word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
}
```

**Step 2: Commit**

```bash
git add examples/football-vocab/index.html
git commit -m "feat(football-vocab): add Web Speech API word pronunciation"
```

---

### Task 12: 词库管理界面

**Files:**
- Modify: `examples/football-vocab/index.html:950-1100`

**Step 1: 添加词库管理函数**

```javascript
// Show vocabulary manager
function showVocabularyManager() {
    const gameArea = document.getElementById('gameArea');
    const customWords = UserData.getCustomWords();
    const wrongWords = UserData.getWrongWords();

    gameArea.innerHTML = `
        <div style="padding: 20px;">
            <h2 style="margin-bottom: 20px; color: #2d5a27;">📚 词库管理</h2>

            <div style="margin-bottom: 30px;">
                <h3 style="color: #333; margin-bottom: 15px;">➕ 添加自定义单词</h3>
                <div style="display: grid; gap: 10px; max-width: 400px;">
                    <input type="text" id="newWord" placeholder="英文单词" style="padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <input type="text" id="newPhonetic" placeholder="音标 (可选)" style="padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <input type="text" id="newMeaning" placeholder="中文释义" style="padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <input type="text" id="newExample" placeholder="例句 (可选)" style="padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <button onclick="addCustomWord()" style="padding: 12px; background: #2d5a27; color: white; border: none; border-radius: 5px; cursor: pointer;">添加单词</button>
                </div>
            </div>

            <div style="margin-bottom: 30px;">
                <h3 style="color: #333; margin-bottom: 15px;">📝 自定义单词 (${customWords.length})</h3>
                ${customWords.length === 0 ?
                    '<p style="color: #999;">暂无自定义单词</p>' :
                    `<div style="display: grid; gap: 10px;">
                        ${customWords.map(w => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                                <div>
                                    <strong>${w.word}</strong> <span style="color: #666;">${w.phonetic}</span> - ${w.meaning}
                                </div>
                                <button onclick="deleteCustomWord('${w.id}')" style="background: #e74c3c; color: white; border: none; padding: 5px 15px; border-radius: 3px; cursor: pointer;">删除</button>
                            </div>
                        `).join('')}
                    </div>`
                }
            </div>

            <div>
                <h3 style="color: #333; margin-bottom: 15px;">❌ 错题本 (${wrongWords.length})</h3>
                ${wrongWords.length === 0 ?
                    '<p style="color: #999;">太棒了！没有错词</p>' :
                    `<div style="display: grid; gap: 10px;">
                        ${wrongWords.map(w => `
                            <div style="padding: 10px; background: #fff3f3; border-radius: 5px; border-left: 4px solid #e74c3c;">
                                <strong>${w.word}</strong> - ${w.meaning}
                                <span style="color: #e74c3c; margin-left: 10px;">错 ${w.count} 次</span>
                            </div>
                        `).join('')}
                    </div>
                    <button onclick="startWrongWordsPractice()" style="margin-top: 15px; padding: 12px; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer;">开始错题练习</button>
                `}
            </div>

            <button onclick="backToGame()" style="margin-top: 30px; padding: 12px 30px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer;">返回游戏</button>
        </div>
    `;
}

// Add custom word
function addCustomWord() {
    const word = document.getElementById('newWord').value.trim();
    const phonetic = document.getElementById('newPhonetic').value.trim() || '/' + word + '/';
    const meaning = document.getElementById('newMeaning').value.trim();
    const example = document.getElementById('newExample').value.trim() || word;

    if (!word || !meaning) {
        alert('请输入单词和释义');
        return;
    }

    UserData.addCustomWord({ word, phonetic, meaning, example, exampleTranslation: '' });

    // Clear inputs
    document.getElementById('newWord').value = '';
    document.getElementById('newPhonetic').value = '';
    document.getElementById('newMeaning').value = '';
    document.getElementById('newExample').value = '';

    // Refresh display
    showVocabularyManager();
}

// Delete custom word
function deleteCustomWord(wordId) {
    if (confirm('确定要删除这个单词吗？')) {
        UserData.deleteCustomWord(wordId);
        showVocabularyManager();
    }
}

// Start wrong words practice
function startWrongWordsPractice() {
    const wrongWords = UserData.getWrongWords();
    if (wrongWords.length === 0) {
        alert('没有错词需要练习！');
        return;
    }

    // Switch to practice mode with wrong words only
    GameState.mode = 'practice';
    // We'll filter to show only wrong words in practice mode
    alert('进入错题练习模式！');
    backToGame();
}

// Back to game
function backToGame() {
    // Restore original game area HTML
    location.reload(); // Simple approach: reload page
}
```

**Step 2: Commit**

```bash
git add examples/football-vocab/index.html
git commit -m "feat(football-vocab): add vocabulary manager with custom words and wrong words"
```

---

### Task 13: 统计界面

**Files:**
- Modify: `examples/football-vocab/index.html:1100-1200`

**Step 1: 添加统计函数**

```javascript
// Show statistics
function showStats() {
    const progress = UserData.getProgress();
    const totalWords = ALL_WORDS.length + UserData.getCustomWords().length;
    const accuracy = progress.correctCount + progress.wrongCount > 0
        ? Math.round((progress.correctCount / (progress.correctCount + progress.wrongCount)) * 100)
        : 0;

    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'statsModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 20px; max-width: 400px; width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
            <h2 style="color: #2d5a27; margin-bottom: 20px; text-align: center;">📊 学习统计</h2>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div style="text-align: center; padding: 15px; background: #f5f5f5; border-radius: 10px;">
                    <div style="font-size: 24px; font-weight: bold; color: #2d5a27;">${progress.learnedWords.length}</div>
                    <div style="font-size: 12px; color: #666;">已学单词</div>
                </div>
                <div style="text-align: center; padding: 15px; background: #f5f5f5; border-radius: 10px;">
                    <div style="font-size: 24px; font-weight: bold; color: #2d5a27;">${accuracy}%</div>
                    <div style="font-size: 12px; color: #666;">正确率</div>
                </div>
                <div style="text-align: center; padding: 15px; background: #f5f5f5; border-radius: 10px;">
                    <div style="font-size: 24px; font-weight: bold; color: #FFD700;">${progress.highScore}</div>
                    <div style="font-size: 12px; color: #666;">最高分</div>
                </div>
                <div style="text-align: center; padding: 15px; background: #f5f5f5; border-radius: 10px;">
                    <div style="font-size: 24px; font-weight: bold; color: #e74c3c;">${progress.maxStreak}</div>
                    <div style="font-size: 12px; color: #666;">最高连胜</div>
                </div>
            </div>

            <div style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>闯关进度</span>
                    <span>${progress.levelProgress - 1}/10</span>
                </div>
                <div style="height: 10px; background: #e0e0e0; border-radius: 5px; overflow: hidden;">
                    <div style="width: ${(progress.levelProgress - 1) * 10}%; height: 100%; background: linear-gradient(90deg, #2d5a27, #4a7c43); transition: width 0.3s;"></div>
                </div>
            </div>

            <div style="text-align: center; color: #666; font-size: 14px; margin-bottom: 20px;">
                总游戏次数: ${progress.totalGames}
            </div>

            <button onclick="closeStats()" style="width: 100%; padding: 12px; background: #2d5a27; color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 16px;">关闭</button>
        </div>
    `;

    document.body.appendChild(modal);

    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeStats();
        }
    });
}

// Close stats modal
function closeStats() {
    const modal = document.getElementById('statsModal');
    if (modal) {
        modal.remove();
    }
}
```

**Step 2: Commit**

```bash
git add examples/football-vocab/index.html
git commit -m "feat(football-vocab): add statistics modal with learning progress"
```

---

## 第六阶段：完善和优化

### Task 14: 添加更多词汇

**Files:**
- Modify: `examples/football-vocab/index.html:85-200`

**Step 1: 扩展词汇到200个**

在 ADDITIONAL_WORDS 数组中添加更多单词，使总数达到200个。

```javascript
const ADDITIONAL_WORDS = [
    // ... (add more words to reach 200 total)
    { id: 'e37', word: 'computer', phonetic: '/kəmˈpjuːtə/', meaning: '电脑', example: 'I use a computer.', exampleTranslation: '我用电脑。', difficulty: 'easy', category: 'technology' },
    { id: 'e38', word: 'phone', phonetic: '/fəʊn/', meaning: '电话', example: 'I call my friend on the phone.', exampleTranslation: '我打电话给我的朋友。', difficulty: 'easy', category: 'technology' },
    // ... add more words
];
```

**Step 2: Commit**

```bash
git add examples/football-vocab/index.html
git commit -m "feat(football-vocab): expand vocabulary to 200 words"
```

---

### Task 15: README 文档

**Files:**
- Create: `examples/football-vocab/README.md`

**Step 1: 编写 README**

```markdown
# Football Vocab - 足球单词

一个结合足球游戏的英语单词学习 H5 应用，让学习变得有趣！

## 🎮 游戏模式

### 1. 训练模式 (Practice)
- 无压力自由学习
- 单词卡片浏览
- 音标和发音
- 例句展示

### 2. 射门挑战 (Shooting Challenge)
- 90秒限时答题
- 答对越多，得分越高
- 连续答对3题触发"火力全开"
- 评价等级：新手→世界级球星

### 3. 闯关模式 (Levels)
- 10关难度递增
- 需连续答对才能过关
- 解锁新单词
- 挑战记忆力极限

### 4. 词库管理 (Vocabulary)
- 自定义单词
- 错题本复习
- 学习进度跟踪

## 📚 词汇内容

- **200个精选词汇**
  - 简单：颜色、动物、数字、水果（60词）
  - 中等：学校、日常生活、运动（80词）
  - 困难：科学、科技、抽象概念（60词）
- **支持自定义单词**
- **错题记录和复习**

## 🚀 快速开始

### 方式1：直接打开
```bash
# 用浏览器打开
open examples/football-vocab/index.html
```

### 方式2：启动本地服务器
```bash
cd examples/football-vocab
python -m http.server 8080
# 然后访问 http://localhost:8080
```

## 🎯 使用方法

1. 选择游戏模式（训练/射门/闯关/词库）
2. 根据单词选择正确的中文释义
3. 答对后观看进球动画！
4. 查看学习统计，追踪进步

## 💾 数据存储

- 学习进度保存在浏览器 LocalStorage
- 自定义单词永久保存
- 错题本帮助针对性复习

## 🔊 发音功能

- 使用 Web Speech API
- 点击喇叭图标播放发音
- 美式英语发音

## 📱 兼容性

- Chrome / Edge / Firefox / Safari
- 手机 / 平板 / 电脑
- 响应式设计

## 🛠️ 技术栈

- HTML5
- CSS3 (Flexbox + Grid)
- JavaScript (ES6+)
- Canvas 2D API
- Web Speech API
- LocalStorage

## 📝 待优化

- [ ] 更多动画效果
- [ ] 成就系统
- [ ] 多语言界面
- [ ] 词库导入/导出

## 📄 License

MIT License
```

**Step 2: Commit**

```bash
git add examples/football-vocab/README.md
git commit -m "docs(football-vocab): add README documentation"
```

---

### Task 16: 最终测试和修复

**Step 1: 完整功能测试清单**

- [ ] 页面加载无错误
- [ ] 三种模式正常切换
- [ ] 单词显示正确
- [ ] 选项按钮点击响应
- [ ] 答对/答错动画播放
- [ ] 计时器工作正常
- [ ] 分数统计正确
- [ ] LocalStorage 数据保存
- [ ] 自定义单词添加/删除
- [ ] 发音功能工作
- [ ] 统计界面显示正确
- [ ] 响应式布局正常

**Step 2: 修复发现的问题**

根据测试结果修复问题。

**Step 3: 最终 Commit**

```bash
git add examples/football-vocab/
git commit -m "feat(football-vocab): complete football vocabulary learning game"
```

---

## 实现完成！

**文件位置**: `examples/football-vocab/`
**主要文件**:
- `index.html` - 完整游戏（单文件）
- `README.md` - 项目文档

**功能特性**:
- ✅ 三种游戏模式（训练/射门/闯关）
- ✅ 200个内置词汇
- ✅ 自定义单词
- ✅ 错题本
- ✅ 学习统计
- ✅ 发音功能
- ✅ Canvas 动画
- ✅ 响应式设计
