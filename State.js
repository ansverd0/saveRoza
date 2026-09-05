/**
 * КЛАСС STATE (ИСТОЧНИК ПРАВДЫ)
 * Чистый Vanilla JS (ES6). Без фреймворков и сторонних импортов.
 */
export default class State {
    constructor() {
        this.gold = 0;
        this.checkpoint = 1;       // Текущий чекпоинт (1-50)
        this.subLevel = 1;         // Номер стены на текущем чекпоинте (1-5)
        this.gameState = 'MINING';  // Текущая фаза: 'MINING', 'BOSS_WAIT', 'BOSS_FIGHT'
        
        // Комбо-система для виральности (ТикТок ASMR)
        this.comboCount = 0;       // Текущее количество последовательных кликов
        this.lastClickTime = 0;    // Метка времени последнего клика (ms)

        // ВКЛАДКА 1: ИНСТРУМЕНТЫ ДОБЫЧИ
        this.upgrades_mining = {
            pickaxe: 0,
            helmet: 0,
            dynamite: 0
        };
        
        // ВКЛАДКА 2: БОЕВОЕ СНАРЯЖЕНИЕ
        this.upgrades_combat = {
            sword: 0,
            shield: 0,
            armor: 0
        };
        
        // ВКЛАДКА 3: НАЕМНИКИ И АВТОМАТИЗАЦИЯ
        this.upgrades_workers = {
            miner_pakhom: 0,
            miner_team: 0,
            miner_golem: 0
        };
        
        // Слот боевых расходников
        this.boosts = {
            ragePotion: 0
        };
    }
}

