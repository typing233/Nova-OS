import windowManager from './window-manager.js';
import vfs from './vfs.js';

class NovaApp extends HTMLElement {
    constructor() {
        super();
        this._appId = null;
        this._windowId = null;
        this._isInitialized = false;
    }

    get appId() {
        return this._appId;
    }

    get windowId() {
        return this._windowId;
    }

    get system() {
        return {
            vfs: vfs,
            windowManager: windowManager,
            appFramework: appFramework
        };
    }

    connectedCallback() {
        if (!this._isInitialized) {
            this._isInitialized = true;
            this.onMount();
        }
    }

    disconnectedCallback() {
        this.onUnmount();
    }

    onMount() {}

    onUnmount() {}

    setTitle(title) {
        if (this._windowId) {
            windowManager.setWindowTitle(this._windowId, title);
        }
    }

    close() {
        if (this._windowId) {
            windowManager.closeWindow(this._windowId);
        }
    }

    minimize() {
        if (this._windowId) {
            windowManager.minimizeWindow(this._windowId);
        }
    }

    maximize() {
        if (this._windowId) {
            windowManager.toggleMaximize(this._windowId);
        }
    }

    static get tagName() {
        return this.name
            .replace(/([A-Z])/g, '-$1')
            .toLowerCase()
            .slice(1);
    }
}

class AppFramework {
    constructor() {
        this.registry = new Map();
        this.installedApps = new Map();
        this.runningApps = new Map();
        this._nextInstanceId = 1;
    }

    async init() {
        await this._loadInstalledApps();
    }

    async _loadInstalledApps() {
        const installedAppsList = [
            {
                id: 'terminal',
                name: '终端',
                description: 'NovaOS 命令行终端',
                icon: '⌘',
                category: '系统',
                developer: 'NovaOS Team',
                tagName: 'nova-terminal',
                module: '../apps/terminal.js',
                isDefault: true
            },
            {
                id: 'app-store',
                name: '应用商店',
                description: '发现和安装新应用',
                icon: '🏪',
                category: '系统',
                developer: 'NovaOS Team',
                tagName: 'nova-app-store',
                module: '../apps/app-store.js',
                isDefault: true
            },
            {
                id: 'file-explorer',
                name: '文件管理器',
                description: '浏览和管理文件',
                icon: '📁',
                category: '工具',
                developer: 'NovaOS Team',
                tagName: 'nova-file-explorer',
                module: '../apps/file-explorer.js',
                isDefault: true
            },
            {
                id: 'text-editor',
                name: '文本编辑器',
                description: '简单的文本编辑工具',
                icon: '📝',
                category: '工具',
                developer: 'NovaOS Team',
                tagName: 'nova-text-editor',
                module: '../apps/text-editor.js',
                isDefault: true
            },
            {
                id: 'calculator',
                name: '计算器',
                description: '简单的计算工具',
                icon: '🔢',
                category: '工具',
                developer: 'NovaOS Team',
                tagName: 'nova-calculator',
                module: '../apps/calculator.js',
                isDefault: true
            }
        ];

        for (const app of installedAppsList) {
            this.installedApps.set(app.id, app);
        }

        const availableAppsList = [
            {
                id: 'browser',
                name: '浏览器',
                description: '简单的网页浏览应用',
                icon: '🌐',
                category: '网络',
                developer: 'NovaOS Community',
                tagName: 'nova-browser',
                module: '../apps/browser.js',
                isDefault: false
            },
            {
                id: 'notes',
                name: '记事本',
                description: '快速记录想法',
                icon: '📋',
                category: '效率',
                developer: 'NovaOS Community',
                tagName: 'nova-notes',
                module: '../apps/notes.js',
                isDefault: false
            },
            {
                id: 'clock',
                name: '时钟',
                description: '显示时间和闹钟',
                icon: '⏰',
                category: '工具',
                developer: 'NovaOS Community',
                tagName: 'nova-clock',
                module: '../apps/clock.js',
                isDefault: false
            }
        ];

        for (const app of availableAppsList) {
            this.registry.set(app.id, app);
        }
    }

    async loadApp(appId) {
        const app = this.installedApps.get(appId) || this.registry.get(appId);
        if (!app) {
            throw new Error(`App not found: ${appId}`);
        }

        if (!customElements.get(app.tagName)) {
            try {
                const module = await import(app.module);
                const AppClass = module.default;
                
                if (AppClass && AppClass.prototype instanceof NovaApp) {
                    customElements.define(app.tagName, AppClass);
                }
            } catch (error) {
                console.warn(`Failed to load app module: ${appId}`, error);
            }
        }

        return app;
    }

    async launchApp(appId, options = {}) {
        const app = await this.loadApp(appId);
        if (!app) {
            throw new Error(`Failed to load app: ${appId}`);
        }

        const instanceId = `${appId}_${this._nextInstanceId++}`;
        
        const appElement = document.createElement(app.tagName);
        appElement._appId = appId;
        appElement._instanceId = instanceId;

        const windowId = windowManager.createWindow({
            id: `window_${instanceId}`,
            title: app.name,
            icon: app.icon,
            content: appElement,
            width: options.width || 800,
            height: options.height || 500,
            x: options.x,
            y: options.y,
            onClose: () => this._onAppWindowClose(instanceId),
            onMinimize: () => this._onAppWindowMinimize(instanceId),
            onFocus: () => this._onAppWindowFocus(instanceId)
        });

        appElement._windowId = windowId;

        const runningInstance = {
            instanceId: instanceId,
            appId: appId,
            app: app,
            windowId: windowId,
            element: appElement,
            state: 'active'
        };

        this.runningApps.set(instanceId, runningInstance);

        return {
            instanceId,
            windowId,
            appId
        };
    }

    _onAppWindowClose(instanceId) {
        const instance = this.runningApps.get(instanceId);
        if (instance) {
            this.runningApps.delete(instanceId);
        }
    }

    _onAppWindowMinimize(instanceId) {
        const instance = this.runningApps.get(instanceId);
        if (instance) {
            instance.state = 'minimized';
        }
    }

    _onAppWindowFocus(instanceId) {
        const instance = this.runningApps.get(instanceId);
        if (instance) {
            instance.state = 'active';
        }
    }

    closeApp(instanceId) {
        const instance = this.runningApps.get(instanceId);
        if (instance) {
            windowManager.closeWindow(instance.windowId);
        }
    }

    focusApp(instanceId) {
        const instance = this.runningApps.get(instanceId);
        if (instance) {
            windowManager.focusWindow(instance.windowId);
        }
    }

    getInstalledApps() {
        return Array.from(this.installedApps.values());
    }

    getAvailableApps() {
        return Array.from(this.registry.values());
    }

    getRunningApps() {
        return Array.from(this.runningApps.values());
    }

    getApp(appId) {
        return this.installedApps.get(appId) || this.registry.get(appId);
    }

    isInstalled(appId) {
        return this.installedApps.has(appId);
    }

    installApp(appId) {
        const app = this.registry.get(appId);
        if (!app) {
            throw new Error(`App not found in registry: ${appId}`);
        }

        this.installedApps.set(appId, { ...app, isDefault: true });
        this.registry.delete(appId);

        return true;
    }

    uninstallApp(appId) {
        const app = this.installedApps.get(appId);
        if (!app || app.isDefault) {
            throw new Error(`Cannot uninstall app: ${appId}`);
        }

        const runningInstances = Array.from(this.runningApps.entries())
            .filter(([_, instance]) => instance.appId === appId);
        
        for (const [instanceId, _] of runningInstances) {
            this.closeApp(instanceId);
        }

        this.registry.set(appId, { ...app, isDefault: false });
        this.installedApps.delete(appId);

        return true;
    }

    registerApp(appDefinition) {
        const appId = appDefinition.id;
        if (this.registry.has(appId) || this.installedApps.has(appId)) {
            throw new Error(`App already registered: ${appId}`);
        }

        this.registry.set(appId, appDefinition);
        return true;
    }
}

const appFramework = new AppFramework();

export { NovaApp, appFramework };
export default appFramework;
