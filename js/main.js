import vfs from './core/vfs.js';
import windowManager from './core/window-manager.js';
import appFramework from './core/app-framework.js';

class NovaOS {
    constructor() {
        this.isInitialized = false;
        this.updateClockInterval = null;
    }

    async init() {
        if (this.isInitialized) return;

        console.log('🚀 NovaOS 正在启动...');

        try {
            await vfs.init();
            console.log('✅ VFS 已初始化');

            windowManager.init();
            console.log('✅ 窗口管理器已初始化');

            await appFramework.init();
            console.log('✅ 应用框架已初始化');

            this.setupDesktop();
            this.setupEventListeners();
            this.startClock();

            this.isInitialized = true;
            console.log('✅ NovaOS 启动完成！');

            await appFramework.launchApp('terminal', { width: 700, height: 450, x: 150, y: 100 });

        } catch (error) {
            console.error('❌ NovaOS 启动失败:', error);
            this.showError('系统启动失败: ' + error.message);
        }
    }

    setupDesktop() {
        this.renderDesktopIcons();
        this.renderStartMenuApps();
        this.updateTaskbar();
    }

    renderDesktopIcons() {
        const desktopIcons = document.getElementById('desktop-icons');
        const installedApps = appFramework.getInstalledApps();

        desktopIcons.innerHTML = installedApps.map(app => `
            <div class="desktop-icon" data-app-id="${app.id}">
                <div class="icon">${app.icon}</div>
                <div class="label">${app.name}</div>
            </div>
        `).join('');

        desktopIcons.querySelectorAll('.desktop-icon').forEach(icon => {
            icon.addEventListener('dblclick', async () => {
                const appId = icon.dataset.appId;
                try {
                    await appFramework.launchApp(appId);
                } catch (error) {
                    this.showError(`无法启动应用: ${error.message}`);
                }
            });
        });
    }

    renderStartMenuApps() {
        const startMenuApps = document.getElementById('start-menu-apps');
        const installedApps = appFramework.getInstalledApps();

        startMenuApps.innerHTML = installedApps.map(app => `
            <div class="app-item" data-app-id="${app.id}">
                <div class="icon">${app.icon}</div>
                <div class="name">${app.name}</div>
            </div>
        `).join('');

        startMenuApps.querySelectorAll('.app-item').forEach(item => {
            item.addEventListener('click', async () => {
                const appId = item.dataset.appId;
                this.toggleStartMenu();
                try {
                    await appFramework.launchApp(appId);
                } catch (error) {
                    this.showError(`无法启动应用: ${error.message}`);
                }
            });
        });
    }

    setupEventListeners() {
        const startButton = document.getElementById('start-button');
        const startMenu = document.getElementById('start-menu');
        const appSearch = document.getElementById('app-search');

        startButton.addEventListener('click', () => {
            this.toggleStartMenu();
        });

        document.addEventListener('click', (e) => {
            if (!startMenu.classList.contains('hidden')) {
                if (!e.target.closest('#start-menu') && !e.target.closest('#start-button')) {
                    this.toggleStartMenu(false);
                }
            }
        });

        appSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const apps = appFramework.getInstalledApps();
            const startMenuApps = document.getElementById('start-menu-apps');

            const filteredApps = apps.filter(app => 
                app.name.toLowerCase().includes(query) || 
                app.description.toLowerCase().includes(query)
            );

            startMenuApps.innerHTML = filteredApps.map(app => `
                <div class="app-item" data-app-id="${app.id}">
                    <div class="icon">${app.icon}</div>
                    <div class="name">${app.name}</div>
                </div>
            `).join('');

            startMenuApps.querySelectorAll('.app-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const appId = item.dataset.appId;
                    this.toggleStartMenu();
                    try {
                        await appFramework.launchApp(appId);
                    } catch (error) {
                        this.showError(`无法启动应用: ${error.message}`);
                    }
                });
            });
        });

        this.taskbarInterval = setInterval(() => this.updateTaskbar(), 200);
    }

    toggleStartMenu(show = null) {
        const startMenu = document.getElementById('start-menu');
        const shouldShow = show === null ? startMenu.classList.contains('hidden') : show;

        if (shouldShow) {
            startMenu.classList.remove('hidden');
            document.getElementById('app-search').focus();
        } else {
            startMenu.classList.add('hidden');
        }
    }

    updateTaskbar() {
        const taskbarApps = document.getElementById('taskbar-apps');
        const runningApps = appFramework.getRunningApps();

        taskbarApps.innerHTML = runningApps.map(app => {
            const isActive = app.state === 'active';
            return `
                <div class="taskbar-app ${isActive ? 'active' : ''}" data-instance-id="${app.instanceId}">
                    <span class="icon">${app.app.icon}</span>
                    <span class="title">${app.app.name}</span>
                </div>
            `;
        }).join('');

        taskbarApps.querySelectorAll('.taskbar-app').forEach(item => {
            item.addEventListener('click', () => {
                const instanceId = item.dataset.instanceId;
                appFramework.focusApp(instanceId);
            });
        });
    }

    startClock() {
        const clockEl = document.getElementById('clock');
        
        const update = () => {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            
            clockEl.textContent = `${hours}:${minutes} ${month}/${day}`;
        };

        update();
        this.updateClockInterval = setInterval(update, 1000);
    }

    showError(message) {
        console.error('NovaOS Error:', message);
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(239, 68, 68, 0.9);
            color: #fff;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 100000;
            backdrop-filter: blur(10px);
            animation: slideIn 0.3s ease;
            max-width: 400px;
        `;
        notification.textContent = '❌ ' + message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    shutdown() {
        if (this.updateClockInterval) {
            clearInterval(this.updateClockInterval);
        }
        if (this.taskbarInterval) {
            clearInterval(this.taskbarInterval);
        }
        console.log('👋 NovaOS 已关闭');
    }
}

const novaOS = new NovaOS();

document.addEventListener('DOMContentLoaded', async () => {
    await novaOS.init();
});

window.NovaOS = novaOS;
window.vfs = vfs;
window.windowManager = windowManager;
window.appFramework = appFramework;

export default novaOS;
