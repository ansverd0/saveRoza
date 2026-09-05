import State from './State.js';
import Engine from './Engine.js';

class UI {
    constructor() {
        this.state = new State();
        this.engine = new Engine(this.state);
        this.currentBlockHP = this.engine.getWallHP();
        
        // Кэш для отслеживания количества работяг (защита от лагов анимации)
        this.lastWorkersCount = ""; 
        this.init();
    }

    init() {
        this.registerClickEvents();
        this.registerKeyboardEvents();
        this.startGameLoops();
        this.updateUI();
        this.renderShop(); 
        this.checkStoryDialogue(); 
    }

    // --- 1. РЕГИСТРАЦИЯ КЛИКОВ И НАЖАТИЙ ---
    registerClickEvents() {
        const conveyorContainer = document.getElementById('ui-conveyor');
        conveyorContainer.addEventListener('click', (e) => this.handleCoreClick(e));
        
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                tabButtons.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        const btnBoss = document.getElementById('btn-start-boss');
        btnBoss.addEventListener('click', () => this.startBossBattle());
    }

    // БИНД НА ПРОБЕЛ (Пункт 26 плейтеста)
    registerKeyboardEvents() {
        window.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault(); // Запрещаем прокрутку страницы пробелом
                
                // Симулируем клик по центру активного блока
                const activeBlock = document.querySelector('.block.active-target');
                if (activeBlock) {
                    const rect = activeBlock.getBoundingClientRect();
                    const fakeEvent = {
                        clientX: rect.left + rect.width / 2,
                        clientY: rect.top + rect.height / 2
                    };
                    this.handleCoreClick(fakeEvent);
                }
            }
        });
    }

    // --- 2. ЛОГИКА ИГРОВОГО КЛИКА ---
    handleCoreClick(e) {
        if (!document.getElementById('ui-dialogue-overlay').classList.contains('hidden')) return;
        const now = Date.now();
        if (now - this.state.lastClickTime < 300) {
            this.state.comboCount++;
        } else {
            this.state.comboCount = 0;
        }
        this.state.lastClickTime = now;
        
        // Показываем счетчик комбо при клике
        const comboUi = document.getElementById('ui-combo');
        if (comboUi) comboUi.style.opacity = '1';
        
        const heroImg = document.getElementById('ui-hero-img');
        if (heroImg) {
            heroImg.src = 'assets/images/hero_strike.png';
            setTimeout(() => { heroImg.src = 'assets/images/hero_idle.png'; }, 100);
        }
        
        let damage = 0;
        if (this.state.gameState === 'MINING') {
            damage = this.engine.getClickPowerPickaxe();
            this.spawnParticles(e, 'gray');
            this.state.gold += 1 * this.engine.getOreTierValue(); 
        } else if (this.state.gameState === 'BOSS_FIGHT') {
            damage = this.engine.getClickPowerSword();
            this.spawnParticles(e, 'red');
        }
        
        this.currentBlockHP = Math.max(0, this.currentBlockHP - damage); // Фикс отрицательного ХП (Пункт 3)
        this.spawnDamageText(e, damage);
        
        if (this.currentBlockHP <= 0) {
            this.handleBlockDestruction();
        }
        this.updateUI();
    }

    handleBlockDestruction() {
        if (this.state.gameState === 'MINING') {
            this.state.gold += 5 * this.engine.getOreTierValue(); 
            this.state.subLevel++;
            if (this.state.subLevel > 5) {
                this.state.gameState = 'BOSS_WAIT';
            } else {
                this.currentBlockHP = this.engine.getWallHP();
            }
        } else if (this.state.gameState === 'BOSS_FIGHT') {
            this.state.gold += 25 * this.engine.getOreTierValue();
            this.engine.stopBossTimer();
            
            // ПРОВЕРКА ФИНАЛА ИГРЫ И ЭКРАНА ПОБЕДЫ
            if (this.state.checkpoint >= 50) {
                this.showVictoryScreen();
                return;
            }
            this.state.checkpoint++;
            this.state.subLevel = 1;
            this.state.gameState = 'MINING';
            this.currentBlockHP = this.engine.getWallHP();
            this.checkStoryDialogue();
        }
        const conveyor = document.getElementById('ui-conveyor');
        conveyor.classList.add('shift-effect');
        setTimeout(() => conveyor.classList.remove('shift-effect'), 80);
        this.updateUI();
    }

    // --- 3. СЮЖЕТНЫЕ ПОП-АПЫ ВМЕСТО ALERT ---
    showVictoryScreen() {
        const overlay = document.getElementById('ui-dialogue-overlay');
        const textElem = document.getElementById('ui-dialogue-text');
        const closeBtn = document.getElementById('ui-dialogue-close');
        textElem.innerHTML = "🎉 <b>ПОБЕДА!</b> 🎉<br><br>Вы уничтожили Кристалл Горы и добыли Сердце Надежды! Роза спасена, а ваша деревня вошла в историю шахтерского дела! Спасибо за игру!";
        overlay.classList.remove('hidden');
        closeBtn.textContent = "ИГРАТЬ СНОВА";
        closeBtn.onclick = () => { window.location.reload(); };
    }

    showBossDefeatScreen() {
        const overlay = document.getElementById('ui-dialogue-overlay');
        const textElem = document.getElementById('ui-dialogue-text');
        const closeBtn = document.getElementById('ui-dialogue-close');
        textElem.innerHTML = "💀 <b>ВРЕМЯ ИСТЕКЛО!</b> 💀<br><br>Монстр оказался слишком силен. Вы вынуждены отступить на верхние слои, чтобы прокачать экипировку и нанять больше работяг!";
        overlay.classList.remove('hidden');
        closeBtn.textContent = "ВЕРНУТЬСЯ НА ФАРМ";
        closeBtn.onclick = () => { overlay.classList.add('hidden'); };
    }

    checkStoryDialogue() {
        const dialogs = {
            1: "Староста: «Быстрее, парень! Розе всё хуже, только Кристалл Надежды спасет её жизнь! Жми ПРОБЕЛ или кликай мышкой по завалам справа, чтобы добывать золото!»",
            5: "Герой: «Стены становятся крепче... Но я прорублю этот чертов коридор!»",
            15: "Торговец: «Ого, отличная руда! На такую я подберу тебе снаряжение получше! Ценность руды увеличилась в 5 раз!»",
            25: "Староста: «Ты прошел половину пути! Деревня молится за тебя и Розу!»",
            45: "Герой: «Я вижу сияние впереди... Держись, любимая, я уже близко!»"
        };
        const currentCheckpoint = this.state.checkpoint;
        if (dialogs[currentCheckpoint]) {
            const overlay = document.getElementById('ui-dialogue-overlay');
            const textElem = document.getElementById('ui-dialogue-text');
            const closeBtn = document.getElementById('ui-dialogue-close');
            textElem.textContent = dialogs[currentCheckpoint];
            closeBtn.textContent = "ПОНЯТНО";
            overlay.classList.remove('hidden');
            closeBtn.onclick = () => { overlay.classList.add('hidden'); };
        }
    }
    startBossBattle() {
        this.currentBlockHP = this.engine.getBossHP();
        // Фикс отображения 0с на старте (Пункт 10 плейтеста)
        const timerBoss = document.getElementById('ui-boss-timer');
        if (timerBoss) timerBoss.textContent = "30с";
        
        this.updateUI();
        this.engine.startBossTimer(
            (timeLeft) => {
                document.getElementById('ui-boss-timer').textContent = `${timeLeft}с`;
            },
            () => {
                this.currentBlockHP = this.engine.getWallHP();
                this.showBossDefeatScreen(); // Красивый поп-ап вместо alert
                this.updateUI();
            }
        );
        this.updateUI();
    }

    // --- 4. СОКРАЩЕНИЕ БОЛЬШИХ ЧИСЕЛ БУКВАМИ (Пункт 24 плейтеста) ---
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'м';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'к';
        return Math.floor(num).toString();
    }

    startGameLoops() {
        // Каждые 2 секунды начисляем доход от работяг
        setInterval(() => {
            const passiveIncome = this.engine.getIdleIncome() * 2;
            if (passiveIncome > 0) {
                this.state.gold += passiveIncome;
                this.updateUI();
            }
        }, 2000);

        // Таймер проверки затухания комбо каждые 100мс (Пункт 5)
        setInterval(() => {
            if (Date.now() - this.state.lastClickTime > 1500) {
                const comboUi = document.getElementById('ui-combo');
                if (comboUi) comboUi.style.opacity = '0'; // Скрываем комбо при неактивности
                this.state.comboCount = 0;
            }
        }, 100);
    }

    renderShop() {
        const shopData = {
            mining: [
                { id: 'pickaxe', name: 'Кирка', desc: 'Характеристика: +к силе клика стен', baseKey: 'upgrades_mining' },
                { id: 'helmet', name: 'Каска шахтера', desc: 'Характеристика: +к силе клика стен', baseKey: 'upgrades_mining', req: { id: 'pickaxe', lvl: 5, name: 'Кирка' } },
                { id: 'dynamite', name: 'Связка динамита', desc: 'Характеристика: +к силе клика стен', baseKey: 'upgrades_mining', req: { id: 'helmet', lvl: 5, name: 'Каска' } }
            ],
            combat: [
                { id: 'sword', name: 'Меч', desc: 'Характеристика: +к урону по боссам', baseKey: 'upgrades_combat' },
                { id: 'shield', name: 'Щит', desc: 'Характеристика: +к урону по боссам', baseKey: 'upgrades_combat', req: { id: 'sword', lvl: 5, name: 'Меч' } },
                { id: 'armor', name: 'Доспех', desc: 'Характеристика: +к урону по боссам', baseKey: 'upgrades_combat', req: { id: 'shield', lvl: 5, name: 'Щит' } }
            ],
            workers: [
                                { id: 'miner_pakhom', name: 'Дед Пахом', desc: 'Характеристика: пассивный доход золота', baseKey: 'upgrades_workers' },
                { id: 'miner_team', name: 'Бригада парней', desc: 'Характеристика: пассивный доход золота', baseKey: 'upgrades_workers', req: { id: 'miner_pakhom', lvl: 5, name: 'Пахома' } },
                { id: 'miner_golem', name: 'Магический голем', desc: 'Характеристика: пассивный доход золота', baseKey: 'upgrades_workers', req: { id: 'miner_team', lvl: 5, name: 'Бригаду' } }
            ]
        };

        Object.keys(shopData).forEach(tab => {
            const panel = document.getElementById(`panel-${tab}`);
            if (!panel) return;
            panel.innerHTML = '';

            shopData[tab].forEach(item => {
                const currentLevel = this.state[item.baseKey][item.id];
                const cost = this.engine.getUpgradeCost(item.id, currentLevel);

                let isLocked = false;
                let lockReason = item.desc;

                if (item.req) {
                    const parentLevel = this.state[item.baseKey][item.req.id];
                    if (parentLevel < item.req.lvl) {
                        isLocked = true;
                        lockReason = `[Требуется ${item.req.name} Ур. ${item.req.lvl}]`;
                    }
                }

                const card = document.createElement('div');
                card.className = `shop-card ${isLocked ? 'locked' : 'available'}`;

                card.innerHTML = `
                    <div class="card-info">
                        <h3>${item.name} (Ур. ${currentLevel})</h3>
                        <p>${lockReason}</p>
                    </div>
                    <button class="buy-btn" ${isLocked || this.state.gold < cost ? 'disabled' : ''}>
                        ${this.formatNumber(cost)} 🪙
                    </button>
                `;

                if (!isLocked) {
                    card.querySelector('.buy-btn').addEventListener('click', () => this.buyUpgrade(item.baseKey, item.id, cost));
                }

                panel.appendChild(card);
            });
        });
    }

    buyUpgrade(baseKey, id, cost) {
        if (this.state.gold >= cost) {
            this.state.gold -= cost;
            this.state[baseKey][id]++;
            this.updateUI();
        }
    }
    // --- 5. ВИЗУАЛЬНЫЕ ЭФФЕКТЫ (ПАРТИКЛЫ) ---
    spawnParticles(e, color) {
        const stage = document.querySelector('.stage');
        if (!stage) return;
        const rect = stage.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        for (let i = 0; i < 4; i++) {
            const p = document.createElement('div');
            p.style.position = 'absolute';
            p.style.left = `${x}px`;
            p.style.top = `${y}px`;
            p.style.width = '6px';
            p.style.height = '6px';
            p.style.backgroundColor = color === 'red' ? '#e74c3c' : '#7f8c8d';
            p.style.borderRadius = '2px';
            p.style.pointerEvents = 'none';
            p.style.zIndex = '100';

            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 2;
            let velX = Math.cos(angle) * speed;
            let velY = Math.sin(angle) * speed - 3;

            stage.appendChild(p);

            const anim = setInterval(() => {
                velY += 0.2;
                p.style.left = `${parseFloat(p.style.left) + velX}px`;
                p.style.top = `${parseFloat(p.style.top) + velY}px`;

                if (parseFloat(p.style.top) > rect.height) {
                    clearInterval(anim);
                    p.remove();
                }
            }, 16);

            setTimeout(() => { clearInterval(anim); p.remove(); }, 600);
        }
    }

    spawnDamageText(e, damage) {
        const stage = document.querySelector('.stage');
        if (!stage) return;
        const rect = stage.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const text = document.createElement('div');
        text.className = 'damage-pop';
        text.textContent = `-${Math.ceil(damage)} HP`; 
        text.style.position = 'absolute';
        text.style.left = `${x}px`;
        text.style.top = `${y}px`;
        text.style.color = this.state.gameState === 'BOSS_FIGHT' ? '#e74c3c' : '#fff';
        text.style.fontWeight = 'bold';
        text.style.pointerEvents = 'none';
        text.style.transition = 'all 0.4s ease-out';
        text.style.zIndex = '101';

        stage.appendChild(text);

        setTimeout(() => {
            text.style.transform = `translateY(-40px) scale(1.2)`;
            text.style.opacity = '0';
        }, 10);

        setTimeout(() => text.remove(), 400);
    }

    switchTab(tabName) {
        const panels = document.querySelectorAll('.tab-panel');
        panels.forEach(p => p.classList.remove('active'));
        const activePanel = document.getElementById(`panel-${tabName}`);
        if (activePanel) activePanel.classList.add('active');
    }
    // --- 6. СВЕРХОПТИМИЗИРОВАННЫЙ ОБНОВИТЕЛЬ UI ---
    updateUI() {
        document.getElementById('ui-gold').textContent = this.formatNumber(this.state.gold);
        document.getElementById('ui-checkpoint').textContent = this.state.checkpoint;
        
        const subUi = document.getElementById('ui-sublevel');
        if (subUi) {
            subUi.textContent = this.state.gameState === 'BOSS_FIGHT' ? 'БОСС' : `${Math.min(5, this.state.subLevel)}`;
        }
        
        // Округляем дробную математическую силу для красивого вывода (Пункт 3, 7)
        document.getElementById('ui-pick-power').textContent = this.formatNumber(Math.ceil(this.engine.getClickPowerPickaxe()));
        document.getElementById('ui-sword-power').textContent = this.formatNumber(Math.ceil(this.engine.getClickPowerSword()));
        document.getElementById('ui-idle-income').textContent = this.formatNumber(this.engine.getIdleIncome());

        const comboUi = document.getElementById('ui-combo');
        if (comboUi) {
            comboUi.textContent = `COMBO x${this.state.comboCount}`;
            if (this.state.comboCount >= 25) {
                comboUi.style.color = '#e74c3c';
                document.querySelector('.game-world').classList.add('screen-shake');
            } else if (this.state.comboCount >= 10) {
                comboUi.style.color = '#f1c40f';
                document.querySelector('.game-world').classList.remove('screen-shake');
            } else {
                comboUi.style.color = '#2ecc71'; // Лайтовый зеленый комбо (Пункт 4)
                document.querySelector('.game-world').classList.remove('screen-shake');
            }
        }

        const btnBoss = document.getElementById('btn-start-boss');
        const timerBoss = document.getElementById('ui-boss-timer');

        if (btnBoss && timerBoss) {
            if (this.state.gameState === 'BOSS_WAIT') {
                btnBoss.classList.remove('hidden');
                timerBoss.classList.add('hidden');
            } else if (this.state.gameState === 'BOSS_FIGHT') {
                btnBoss.classList.add('hidden');
                timerBoss.classList.remove('hidden');
            } else {
                btnBoss.classList.add('hidden');
                timerBoss.classList.add('hidden');
            }
        }

                const activeBlock = document.querySelector('.block.active-target');
        if (activeBlock) {
            const maxHP = this.state.gameState === 'BOSS_FIGHT' ? this.engine.getBossHP() : this.engine.getWallHP();
            const percent = (this.currentBlockHP / maxHP) * 100;
            activeBlock.querySelector('.hp-fill').style.width = `${percent}%`;
            
            // Вывод красивого округленного ХП (Пункт 12 плейтеста)
            activeBlock.querySelector('.hp-text').textContent = `${this.formatNumber(this.currentBlockHP)}/${this.formatNumber(maxHP)} HP`;
            
            // ДИНАМИЧЕСКАЯ СМЕНА ТЕКСТУР КУБОВ ПО ТЗ
            const blockSpriteContainer = activeBlock.querySelector('.block-sprite');
            if (blockSpriteContainer) {
                blockSpriteContainer.innerHTML = ''; // Очищаем старый текст
                
                const blockImg = document.createElement('img');
                blockImg.style.width = '70px'; // Сделали кубики крупнее по плейтесту
                blockImg.style.height = '70px';
                blockImg.style.imageRendering = 'pixelated'; // Защита от мыла
                
                if (this.state.gameState === 'BOSS_FIGHT') {
                    // На 50 чекпоинте — Кристалл, на остальных боссах — Монстр
                    blockImg.src = this.state.checkpoint >= 50 ? 'assets/images/block_crystal.png' : 'assets/images/block_boss.png';
                } else {
                    const cp = this.state.checkpoint;
                    if (cp <= 15) {
                        blockImg.src = 'assets/images/block_stone.png';     // Камень (1-15)
                    } else if (cp <= 30) {
                        blockImg.src = 'assets/images/block_iron.png';      // Железо (16-30)
                    } else if (cp <= 45) {
                        blockImg.src = 'assets/images/block_gold.png';      // Золото (31-45)
                    } else {
                        blockImg.src = 'assets/images/block_diamond.png';   // Алмаз (46-50)
                    }
                }
                blockSpriteContainer.appendChild(blockImg);
            }
        }


                // ДИНАМИЧЕСКИЙ СПАВН РАБОТЯГ НА ТРОПЕ (ИСПРАВЛЕННЫЙ БАГ)
        const squadContainer = document.getElementById('ui-workers-squad');
        if (squadContainer) {
            const pakhomCount = this.state.upgrades_workers.miner_pakhom;
            const teamCount = this.state.upgrades_workers.miner_team;
            const golemCount = this.state.upgrades_workers.miner_golem;
            const currentString = `${pakhomCount}-${teamCount}-${golemCount}`;

            if (this.lastWorkersCount !== currentString) {
                this.lastWorkersCount = currentString;
                squadContainer.innerHTML = '';

                // 1. РЕНДЕРИМ ДЕДОВ ПАХОМОВ (КАРТИНКИ)
                const pakhomSprites = pakhomCount >= 25 ? 3 : (pakhomCount >= 10 ? 2 : (pakhomCount >= 1 ? 1 : 0));
                for (let i = 0; i < pakhomSprites; i++) {
                    const w = document.createElement('div'); // ОБЪЯВЛЯЕМ КОНТЕЙНЕР
                    w.className = 'worker-mini-sprite';
                    
                    const img = document.createElement('img');
                    img.src = 'assets/images/worker_pakhom.png';
                    img.style.width = '32px'; 
                    img.style.height = '32px';
                    img.style.imageRendering = 'pixelated';
                    
                    w.appendChild(img);
                    squadContainer.appendChild(w);
                }

                                // 2. РЕНДЕРИМ СИЛЬНЫХ ПАРНЕЙ (ТЕПЕРЬ КАРТИНКИ)
                const teamSprites = teamCount >= 25 ? 2 : (teamCount >= 1 ? 1 : 0);
                for (let i = 0; i < teamSprites; i++) {
                    const w = document.createElement('div');
                    w.className = 'worker-mini-sprite';
                    
                    const img = document.createElement('img');
                    img.src = 'assets/images/worker_team.png';
                    img.style.width = '34px'; // Чуть крупнее деда Пахома
                    img.style.height = '34px';
                    img.style.imageRendering = 'pixelated';
                    
                    w.appendChild(img);
                    squadContainer.appendChild(w);
                }


                // 3. РЕНДЕРИМ МАГАЗИННЫХ ГОЛЕМОВ (КАРТИНКИ)
                const golemSprites = golemCount >= 25 ? 2 : (golemCount >= 1 ? 1 : 0);
                for (let i = 0; i < golemSprites; i++) {
                    const w = document.createElement('div'); // ОБЪЯВЛЯЕМ КОНТЕЙНЕР
                    w.className = 'worker-mini-sprite';
                    
                    const img = document.createElement('img');
                    img.src = 'assets/images/worker_golem.png';
                    img.style.width = '42px'; // Голем пусть будет чуть крупнее деда!
                    img.style.height = '42px';
                    img.style.imageRendering = 'pixelated';
                    
                    w.appendChild(img);
                    squadContainer.appendChild(w);
                }
            }
        }


        this.renderShop();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.Game = new UI();
});
