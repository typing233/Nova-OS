import windowManager from './window-manager.js';
import appFramework from './app-framework.js';
import dragDropManager from './drag-drop-manager.js';
import iconManager from './icon-manager.js';
import wallpaperManager from './wallpaper-manager.js';
import vfs from './vfs.js';

class DebugPanel {
    constructor() {
        this.isVisible = false;
        this.panelElement = null;
        this.updateInterval = null;
    }

    init() {
        this._createPanel();
        this._setupKeyboardShortcut();
        this._setupDropTarget();
    }

    _createPanel() {
        this.panelElement = document.createElement('div');
        this.panelElement.id = 'debug-panel';
        this.panelElement.innerHTML = `
            <div class="debug-panel-header">
                <span class="debug-panel-title">🔧 系统调试面板</span>
                <button class="debug-panel-close" id="debug-panel-close">×</button>
            </div>
            <div class="debug-panel-content">
                <div class="debug-section">
                    <div class="debug-section-header">📊 系统状态</div>
                    <div class="debug-section-content" id="debug-system-status">
                        <div class="debug-item">
                            <span class="debug-label">内存占用:</span>
                            <span class="debug-value" id="debug-memory">计算中...</span>
                        </div>
                        <div class="debug-item">
                            <span class="debug-label">当前时间:</span>
                            <span class="debug-value" id="debug-time">-</span>
                        </div>
                        <div class="debug-item">
                            <span class="debug-label">运行时间:</span>
                            <span class="debug-value" id="debug-uptime">-</span>
                        </div>
                    </div>
                </div>

                <div class="debug-section">
                    <div class="debug-section-header">🪟 窗口树</div>
                    <div class="debug-section-content" id="debug-window-tree">
                        加载中...
                    </div>
                </div>

                <div class="debug-section">
                    <div class="debug-section-header">📋 运行进程</div>
                    <div class="debug-section-content" id="debug-process-list">
                        加载中...
                    </div>
                </div>

                <div class="debug-section">
                    <div class="debug-section-header">💾 会话管理</div>
                    <div class="debug-section-content">
                        <div class="debug-actions">
                            <button class="debug-btn" id="debug-export-session">📤 导出当前会话</button>
                            <button class="debug-btn" id="debug-import-session">📥 导入会话文件</button>
                        </div>
                        <div class="debug-hint">
                            💡 提示: 您也可以直接将会话 JSON 文件拖放到此面板来恢复会话
                        </div>
                        <div class="debug-drop-zone" id="debug-drop-zone">
                            <span>📁 拖放会话文件到此处</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.panelElement.style.display = 'none';
        document.body.appendChild(this.panelElement);

        this._setupPanelListeners();
        this.startAutoUpdate();
    }

    _setupPanelListeners() {
        const closeBtn = this.panelElement.querySelector('#debug-panel-close');
        closeBtn.addEventListener('click', () => this.hide());

        const exportBtn = this.panelElement.querySelector('#debug-export-session');
        exportBtn.addEventListener('click', () => this._exportSession());

        const importBtn = this.panelElement.querySelector('#debug-import-session');
        importBtn.addEventListener('click', () => this._importSession());
    }

    _setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    _setupDropTarget() {
        const dropZone = this.panelElement.querySelector('#debug-drop-zone');
        
        dragDropManager.makeDropTarget(dropZone, ['session', 'text'], (type, data) => {
            if (type === 'session') {
                this._importSessionFromData(data);
            } else if (type === 'text') {
                try {
                    const sessionData = typeof data === 'string' ? JSON.parse(data) : data;
                    this._importSessionFromData(sessionData);
                } catch (e) {
                    this._showMessage('无效的会话数据', 'error');
                }
            }
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');

            const files = e.dataTransfer?.files;
            if (files && files.length > 0) {
                const file = files[0];
                if (file.type === 'application/json' || file.name.endsWith('.json')) {
                    const text = await file.text();
                    try {
                        const sessionData = JSON.parse(text);
                        this._importSessionFromData(sessionData);
                    } catch (err) {
                        this._showMessage('无法解析会话文件: ' + err.message, 'error');
                    }
                } else {
                    this._showMessage('请拖放 JSON 文件', 'error');
                }
            }
        });
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    show() {
        this.isVisible = true;
        this.panelElement.style.display = 'block';
        this._updateAll();
    }

    hide() {
        this.isVisible = false;
        this.panelElement.style.display = 'none';
    }

    startAutoUpdate() {
        this.updateInterval = setInterval(() => {
            if (this.isVisible) {
                this._updateAll();
            }
        }, 1000);
    }

    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    _updateAll() {
        this._updateSystemStatus();
        this._updateWindowTree();
        this._updateProcessList();
    }

    _updateSystemStatus() {
        const memoryEl = this.panelElement.querySelector('#debug-memory');
        const timeEl = this.panelElement.querySelector('#debug-time');
        const uptimeEl = this.panelElement.querySelector('#debug-uptime');

        if (performance?.memory) {
            const usedMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
            const totalMB = (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2);
            memoryEl.textContent = `${usedMB} MB / ${totalMB} MB`;
        } else {
            memoryEl.textContent = '不支持 (仅 Chrome)';
        }

        const now = new Date();
        timeEl.textContent = now.toLocaleString('zh-CN');

        const uptime = Math.floor(performance.now() / 1000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = uptime % 60;
        uptimeEl.textContent = `${hours}h ${minutes}m ${seconds}s`;
    }

    _updateWindowTree() {
        const windowTreeEl = this.panelElement.querySelector('#debug-window-tree');
        const windows = windowManager.getAllWindows();
        const activeWindow = windowManager.getActiveWindow();

        if (windows.length === 0) {
            windowTreeEl.innerHTML = '<div class="debug-empty">没有打开的窗口</div>';
            return;
        }

        windowTreeEl.innerHTML = windows.map(w => `
            <div class="debug-tree-item ${w.isFocused ? 'active' : ''}" data-window-id="${w.id}">
                <span class="debug-tree-icon">${w.icon}</span>
                <span class="debug-tree-title">${w.title}</span>
                <span class="debug-tree-meta">
                    ${w.isMinimized ? '⭕ 最小化' : ''}
                    ${w.isMaximized ? '⬜ 最大化' : ''}
                    ${w.isFocused ? '🔵 激活' : ''}
                </span>
                <span class="debug-tree-position">
                    ${w.x},${w.y} (${w.width}x${w.height})
                </span>
            </div>
        `).join('');
    }

    _updateProcessList() {
        const processListEl = this.panelElement.querySelector('#debug-process-list');
        const runningApps = appFramework.getRunningApps();

        if (runningApps.length === 0) {
            processListEl.innerHTML = '<div class="debug-empty">没有运行中的进程</div>';
            return;
        }

        processListEl.innerHTML = runningApps.map(app => `
            <div class="debug-process-item ${app.state === 'active' ? 'active' : ''}">
                <span class="debug-process-icon">${app.app.icon}</span>
                <div class="debug-process-info">
                    <span class="debug-process-name">${app.app.name}</span>
                    <span class="debug-process-id">PID: ${app.instanceId}</span>
                </div>
                <span class="debug-process-state ${app.state}">${app.state}</span>
            </div>
        `).join('');
    }

    _exportSession() {
        const sessionData = this._captureSessionState();
        const jsonString = JSON.stringify(sessionData, null, 2);
        
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `novaos-session-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this._showMessage('会话已导出成功!', 'success');
    }

    _captureSessionState() {
        const windows = windowManager.getAllWindows();
        const runningApps = appFramework.getRunningApps();

        const windowsState = windows.map(w => ({
            id: w.id,
            title: w.title,
            icon: w.icon,
            x: w.x,
            y: w.y,
            width: w.width,
            height: w.height,
            isMinimized: w.isMinimized,
            isMaximized: w.isMaximized,
            isFocused: w.isFocused,
            zIndex: w.zIndex
        }));

        const appsState = runningApps.map(app => ({
            instanceId: app.instanceId,
            appId: app.appId,
            app: {
                id: app.app.id,
                name: app.app.name,
                icon: app.app.icon,
                description: app.app.description
            },
            state: app.state,
            windowId: app.windowId
        }));

        const iconUsage = iconManager ? iconManager.getAllStats() : {};

        return {
            version: '1.0',
            timestamp: new Date().toISOString(),
            windows: windowsState,
            apps: appsState,
            iconUsage: iconUsage,
            system: {
                timeOfDay: wallpaperManager?.getTimeOfDay() || 'afternoon',
                weather: wallpaperManager?.getWeather() || 'sunny'
            }
        };
    }

    _importSession() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const text = await file.text();
                try {
                    const sessionData = JSON.parse(text);
                    this._importSessionFromData(sessionData);
                } catch (err) {
                    this._showMessage('无法解析会话文件: ' + err.message, 'error');
                }
            }
        });
        
        input.click();
    }

    async _importSessionFromData(sessionData) {
        try {
            if (sessionData.iconUsage && iconManager) {
                for (const [appId, count] of Object.entries(sessionData.iconUsage)) {
                    iconManager.usageStats.set(appId, count);
                }
                iconManager._saveUsageStats();
            }

            if (sessionData.system && wallpaperManager) {
                if (sessionData.system.weather) {
                    wallpaperManager.setWeather(sessionData.system.weather);
                }
            }

            this._showMessage('会话已恢复! (窗口状态需要重新打开应用)', 'success');
            
            if (sessionData.apps && sessionData.apps.length > 0) {
                this._showMessage(`会话包含 ${sessionData.apps.length} 个应用，您可以手动重新打开它们`, 'info');
            }

        } catch (err) {
            this._showMessage('恢复会话失败: ' + err.message, 'error');
        }
    }

    _showMessage(message, type = 'info') {
        const existing = document.querySelector('.debug-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `debug-toast ${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 999999;
            font-size: 14px;
            font-family: inherit;
            animation: slideIn 0.3s ease;
            ${type === 'success' ? 'background: rgba(34, 197, 94, 0.9); color: #fff;' : ''}
            ${type === 'error' ? 'background: rgba(239, 68, 68, 0.9); color: #fff;' : ''}
            ${type === 'info' ? 'background: rgba(59, 130, 246, 0.9); color: #fff;' : ''}
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

const debugPanel = new DebugPanel();
export default debugPanel;
