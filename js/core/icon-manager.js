class IconManager {
    constructor() {
        this.usageStats = new Map();
        this.storageKey = 'novaos_icon_usage';
        this.desktopIconsContainer = null;
        
        this.iconWidth = 80;
        this.iconHeight = 90;
        this.iconGap = 20;
        this.cellWidth = this.iconWidth + this.iconGap;
        this.cellHeight = this.iconHeight + this.iconGap;
    }

    init() {
        this.desktopIconsContainer = document.getElementById('desktop-icons');
        this._loadUsageStats();
    }

    _loadUsageStats() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                for (const [appId, count] of Object.entries(data)) {
                    this.usageStats.set(appId, count);
                }
            }
        } catch (e) {
            console.warn('Failed to load icon usage stats:', e);
        }
    }

    _saveUsageStats() {
        try {
            const data = {};
            for (const [appId, count] of this.usageStats.entries()) {
                data[appId] = count;
            }
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save icon usage stats:', e);
        }
    }

    recordAppLaunch(appId) {
        const current = this.usageStats.get(appId) || 0;
        this.usageStats.set(appId, current + 1);
        this._saveUsageStats();
    }

    getUsageCount(appId) {
        return this.usageStats.get(appId) || 0;
    }

    sortAppsByUsage(apps) {
        const appsWithUsage = apps.map(app => ({
            ...app,
            usage: this.getUsageCount(app.id)
        }));

        appsWithUsage.sort((a, b) => {
            if (b.usage !== a.usage) {
                return b.usage - a.usage;
            }
            return a.id.localeCompare(b.id);
        });

        return appsWithUsage;
    }

    _generateSpiralGrid(maxItems) {
        const positions = [];
        const visited = new Set();
        let x = 0, y = 0;
        let dx = 0, dy = -1;
        let layer = 0;

        for (let i = 0; i < maxItems * 4; i++) {
            const key = `${x},${y}`;
            if (!visited.has(key)) {
                visited.add(key);
                positions.push({ x, y });
                if (positions.length >= maxItems) break;
            }

            if (x === y || (x < 0 && x === -y) || (x > 0 && x === 1 - y)) {
                const temp = dx;
                dx = -dy;
                dy = temp;
                
                if (dx === 1 && dy === 0) {
                    layer++;
                }
            }

            x += dx;
            y += dy;
        }

        return positions;
    }

    calculateIconPositions(apps, containerWidth, containerHeight) {
        const sortedApps = this.sortAppsByUsage(apps);
        const positions = this._generateSpiralGrid(sortedApps.length);

        const totalWidth = Math.max(...positions.map(p => p.x)) * this.cellWidth + this.iconWidth;
        const totalHeight = Math.max(...positions.map(p => p.y)) * this.cellHeight + this.iconHeight;

        const minX = Math.min(...positions.map(p => p.x));
        const minY = Math.min(...positions.map(p => p.y));

        const offsetX = (containerWidth - totalWidth) / 2 - minX * this.cellWidth;
        const offsetY = 30;

        return sortedApps.map((app, index) => {
            const pos = positions[index] || { x: 0, y: index };
            return {
                ...app,
                position: {
                    left: offsetX + pos.x * this.cellWidth,
                    top: offsetY + pos.y * this.cellHeight,
                    gridX: pos.x,
                    gridY: pos.y
                }
            };
        });
    }

    getGridDimensions(numItems) {
        const positions = this._generateSpiralGrid(numItems);
        const xs = positions.map(p => p.x);
        const ys = positions.map(p => p.y);
        
        return {
            minX: Math.min(...xs),
            maxX: Math.max(...xs),
            minY: Math.min(...ys),
            maxY: Math.max(...ys),
            width: (Math.max(...xs) - Math.min(...xs)) * this.cellWidth + this.iconWidth,
            height: (Math.max(...ys) - Math.min(...ys)) * this.cellHeight + this.iconHeight
        };
    }

    getAllStats() {
        const stats = {};
        for (const [appId, count] of this.usageStats.entries()) {
            stats[appId] = count;
        }
        return stats;
    }

    resetStats() {
        this.usageStats.clear();
        localStorage.removeItem(this.storageKey);
    }
}

const iconManager = new IconManager();
export default iconManager;
