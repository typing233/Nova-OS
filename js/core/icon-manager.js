class IconManager {
    constructor() {
        this.usageStats = new Map();
        this.storageKey = 'novaos_icon_usage';
        this.desktopIconsContainer = null;
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

        appsWithUsage.sort((a, b) => b.usage - a.usage);

        const highUsage = [];
        const mediumUsage = [];
        const lowUsage = [];

        const maxUsage = Math.max(...appsWithUsage.map(a => a.usage), 1);
        
        for (const app of appsWithUsage) {
            const ratio = app.usage / maxUsage;
            if (ratio >= 0.5) {
                highUsage.push(app);
            } else if (ratio >= 0.2) {
                mediumUsage.push(app);
            } else {
                lowUsage.push(app);
            }
        }

        const spiralOrder = this._createSpiralOrder(
            highUsage,
            mediumUsage,
            lowUsage
        );

        return spiralOrder;
    }

    _createSpiralOrder(high, medium, low) {
        const result = [];
        
        const centerHigh = this._distributeFromCenter(high);
        const centerMedium = this._distributeFromCenter(medium);
        const centerLow = this._distributeFromCenter(low);

        result.push(...centerHigh);
        result.push(...centerMedium);
        result.push(...centerLow);

        return result;
    }

    _distributeFromCenter(items) {
        if (items.length === 0) return [];
        if (items.length === 1) return [items[0]];

        const mid = Math.floor(items.length / 2);
        const result = [items[mid]];

        for (let i = 1; i <= mid; i++) {
            if (mid + i < items.length) {
                result.push(items[mid + i]);
            }
            if (mid - i >= 0) {
                result.push(items[mid - i]);
            }
        }

        return result;
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
