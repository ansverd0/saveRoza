/**
 * КЛАСС ENGINE (МАТЕМАТИЧЕСКИЙ ДВИЖОК ИГРЫ) - ВЕРСИЯ 2.1
 * Исправлен баг округления урона и подкручен баланс инфляции.
 */
export default class Engine {
    constructor(state) {
        this.state = state; 
        this.bossTimer = null;
        this.bossTimeLeft = 30; 
    }

    // --- 1. РАСЧЕТ СИЛЫ КЛИКА (БЕЗ МАТЕМАТИЧЕСКИХ СЛЕПЫХ ЗОН) ---
    getClickPowerPickaxe() {
        const p = this.state.upgrades_mining.pickaxe;
        const h = this.state.upgrades_mining.helmet;
        const d = this.state.upgrades_mining.dynamite;

        // Считаем точные дробные значения, чтобы каждый уровень давал прирост
        const powerPickaxe = p === 0 ? 0 : 1.2 * Math.pow(1.15, p);
        const powerHelmet  = h === 0 ? 0 : 4.5 * Math.pow(1.17, h);
        const powerDynamite = d === 0 ? 0 : 18 * Math.pow(1.19, d);

        let totalPower = 1 + powerPickaxe + powerHelmet + powerDynamite;
        if (this.state.comboCount >= 10) totalPower *= 2; 

        return totalPower; // Возвращаем точное число, UI сам округлит для отображения
    }

    getClickPowerSword() {
        const s = this.state.upgrades_combat.sword;
        const sh = this.state.upgrades_combat.shield;
        const a = this.state.upgrades_combat.armor;

        const powerSword = s === 0 ? 0 : 2.5 * Math.pow(1.16, s);
        const powerShield = sh === 0 ? 0 : 9 * Math.pow(1.18, sh);
        const powerArmor = a === 0 ? 0 : 35 * Math.pow(1.20, a);

        return 1 + powerSword + powerShield + powerArmor;
    }

    // --- 2. РАСЧЕТ ПАССИВНОГО ДОХОДА ---
    getIdleIncome() {
        const w1 = this.state.upgrades_workers.miner_pakhom;
        const w2 = this.state.upgrades_workers.miner_team;
        const w3 = this.state.upgrades_workers.miner_golem;

        // Первый Пахом теперь СРАЗУ дает +1 к доходу, без слепых зон округления
        const incPakhom = w1 === 0 ? 0 : 1 * Math.pow(1.13, w1);
        const incTeam   = w2 === 0 ? 0 : 6 * Math.pow(1.15, w2);
        const incGolem  = w3 === 0 ? 0 : 30 * Math.pow(1.17, w3);

        return (incPakhom + incTeam + incGolem) * this.getOreTierValue();
    }

    getOreTierValue() {
        const cp = this.state.checkpoint;
        if (cp <= 15) return 1;   
        if (cp <= 30) return 5;   
        if (cp <= 45) return 25;  
        return 125;               
    }

    // Расчет стоимости улучшений
    getUpgradeCost(type, currentLevel) {
        const config = {
            pickaxe:      { base: 15,   mult: 1.25 },
            helmet:       { base: 150,  mult: 1.28 },
            dynamite:     { base: 1200, mult: 1.32 },
            sword:        { base: 20,   mult: 1.26 },
            shield:       { base: 200,  mult: 1.30 },
            armor:        { base: 1800, mult: 1.34 },
            miner_pakhom: { base: 40,   mult: 1.28 },
            miner_team:   { base: 400,  mult: 1.32 },
            miner_golem:  { base: 3500, mult: 1.36 }
        };

        const item = config[type];
        if (!item) return 0;
        return Math.floor(item.base * Math.pow(item.mult, currentLevel));
    }

    getWallHP() {
        return Math.floor(12 * Math.pow(1.18, this.state.checkpoint)); // Чуть укрепили стены для стимула качать кирку
    }

    getBossHP() {
        return Math.floor(65 * Math.pow(1.26, this.state.checkpoint));
    }

    startBossTimer(onTick, onLose) {
        if (this.bossTimer) clearInterval(this.bossTimer);
        this.bossTimeLeft = 30; 
        this.state.gameState = 'BOSS_FIGHT';

        this.bossTimer = setInterval(() => {
            this.bossTimeLeft--;
            if (onTick) onTick(this.bossTimeLeft);

            if (this.bossTimeLeft <= 0) {
                this.stopBossTimer();
                this.state.gameState = 'MINING';
                this.state.subLevel = 1; 
                if (onLose) onLose();
            }
        }, 1000);
    }

    stopBossTimer() {
        if (this.bossTimer) {
            clearInterval(this.bossTimer);
            this.bossTimer = null;
        }
    }
}
