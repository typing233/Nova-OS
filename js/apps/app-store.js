import { NovaApp } from '../core/app-framework.js';
import appFramework from '../core/app-framework.js';

class NovaAppStore extends NovaApp {
    constructor() {
        super();
        this.currentCategory = '全部';
    }

    onMount() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        const apps = [...appFramework.getInstalledApps(), ...appFramework.getAvailableApps()];
        const categories = ['全部', ...new Set(apps.map(a => a.category))];
        
        this.innerHTML = `
            <div class="app-store-container">
                <div class="app-store-header">
                    <h1>🏪 应用商店</h1>
                    <p>发现和安装 NovaOS 应用</p>
                </div>
                <div class="app-store-categories">
                    ${categories.map(cat => `
                        <button class="category-btn ${cat === this.currentCategory ? 'active' : ''}" data-category="${cat}">
                            ${cat}
                        </button>
                    `).join('')}
                </div>
                <div class="app-store-content">
                    <div class="apps-grid">
                        ${this.renderApps(apps)}
                    </div>
                </div>
            </div>
        `;
    }

    renderApps(apps) {
        const filteredApps = this.currentCategory === '全部' 
            ? apps 
            : apps.filter(a => a.category === this.currentCategory);

        return filteredApps.map(app => {
            const isInstalled = appFramework.isInstalled(app.id);
            const isDefault = app.isDefault;
            
            return `
                <div class="app-card" data-app-id="${app.id}">
                    <div class="app-card-header">
                        <div class="app-card-icon">${app.icon}</div>
                        <div class="app-card-info">
                            <div class="app-card-name">${app.name}</div>
                            <div class="app-card-developer">${app.developer}</div>
                        </div>
                    </div>
                    <div class="app-card-description">
                        ${app.description}
                    </div>
                    <div class="app-card-footer">
                        <span class="app-card-category">${app.category}</span>
                        ${isDefault 
                            ? `<button class="app-card-install installed" disabled>已预装</button>`
                            : isInstalled 
                                ? `<button class="app-card-install installed" disabled>已安装</button>`
                                : `<button class="app-card-install" data-action="install">安装</button>`
                        }
                    </div>
                </div>
            `;
        }).join('');
    }

    setupEventListeners() {
        this.addEventListener('click', (e) => {
            const categoryBtn = e.target.closest('.category-btn');
            if (categoryBtn) {
                const category = categoryBtn.dataset.category;
                if (category && category !== this.currentCategory) {
                    this.currentCategory = category;
                    this.render();
                }
                return;
            }

            const installBtn = e.target.closest('[data-action="install"]');
            if (installBtn) {
                const appCard = installBtn.closest('.app-card');
                if (appCard) {
                    const appId = appCard.dataset.appId;
                    this.installApp(appId);
                }
                return;
            }
        });
    }

    async installApp(appId) {
        try {
            const success = appFramework.installApp(appId);
            if (success) {
                const app = appFramework.getApp(appId);
                this.showNotification(`✅ 已安装 ${app.name}`);
                this.render();
                if (window.NovaOS) {
                    window.NovaOS.renderDesktopIcons();
                    window.NovaOS.renderStartMenuApps();
                }
            }
        } catch (error) {
            this.showNotification(`❌ 安装失败: ${error.message}`);
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(99, 102, 241, 0.9);
            color: #fff;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 100000;
            animation: slideIn 0.3s ease;
            backdrop-filter: blur(10px);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

export default NovaAppStore;
