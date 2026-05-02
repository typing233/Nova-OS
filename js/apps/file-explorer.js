import { NovaApp } from '../core/app-framework.js';
import vfs from '../core/vfs.js';
import dragDropManager from '../core/drag-drop-manager.js';

class NovaFileExplorer extends NovaApp {
    constructor() {
        super();
        this.currentPath = vfs.getHomeDir();
    }

    onMount() {
        this.render();
        this.loadCurrentPath();
    }

    render() {
        this.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; background: #1e1e2e; color: #fff; font-family: inherit;">
                <div style="display: flex; align-items: center; padding: 12px 16px; background: #252540; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <button id="btn-back" style="padding: 8px 12px; margin-right: 8px; background: rgba(255,255,255,0.1); border: none; border-radius: 6px; color: #fff; cursor: pointer; font-size: 14px;">
                        ←
                    </button>
                    <div id="path-display" style="flex: 1; padding: 8px 12px; background: rgba(255,255,255,0.05); border-radius: 6px; font-family: monospace; font-size: 13px;">
                        ${this.currentPath}
                    </div>
                </div>
                <div id="file-list" style="flex: 1; padding: 16px; overflow-y: auto;">
                    <div style="color: rgba(255,255,255,0.5);">加载中...</div>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const btnBack = this.querySelector('#btn-back');
        btnBack.addEventListener('click', () => {
            if (this.currentPath !== '/') {
                const parts = this.currentPath.split('/').filter(p => p);
                parts.pop();
                this.currentPath = '/' + parts.join('/');
                this.loadCurrentPath();
            }
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async loadCurrentPath() {
        const pathDisplay = this.querySelector('#path-display');
        const fileList = this.querySelector('#file-list');
        
        pathDisplay.textContent = this.currentPath;
        this.setTitle(`文件管理器 - ${this.currentPath}`);

        try {
            const items = await vfs.readDir(this.currentPath);
            
            if (items.length === 0) {
                fileList.innerHTML = '<div style="color: rgba(255,255,255,0.5); padding: 40px; text-align: center;">文件夹为空</div>';
                return;
            }

            const dirs = items.filter(i => i.type === 'directory').sort((a, b) => a.name.localeCompare(b.name));
            const files = items.filter(i => i.type === 'file').sort((a, b) => a.name.localeCompare(b.name));
            const sortedItems = [...dirs, ...files];

            fileList.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 16px;">
                    ${sortedItems.map(item => `
                        <div class="file-item" data-path="${this.escapeHtml(item.path)}" data-type="${this.escapeHtml(item.type)}" 
                             style="display: flex; flex-direction: column; align-items: center; padding: 16px 8px; border-radius: 8px; cursor: pointer; transition: all 0.2s ease;">
                            <div style="font-size: 32px; margin-bottom: 8px;">
                                ${item.type === 'directory' ? '📁' : this.getFileIcon(item.name)}
                            </div>
                            <div style="color: #fff; font-size: 12px; text-align: center; word-wrap: break-word; max-width: 100px;">
                                ${this.escapeHtml(item.name)}
                            </div>
                            <div style="color: rgba(255,255,255,0.5); font-size: 11px; margin-top: 4px;">
                                ${this.formatSize(item.size)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            fileList.querySelectorAll('.file-item').forEach(item => {
                const path = item.dataset.path;
                const type = item.dataset.type;
                
                item.addEventListener('click', () => {
                    if (type === 'directory') {
                        this.currentPath = path;
                        this.loadCurrentPath();
                    } else {
                        this.openFile(path);
                    }
                });

                item.addEventListener('mouseenter', () => {
                    item.style.background = 'rgba(255,255,255,0.1)';
                });
                item.addEventListener('mouseleave', () => {
                    item.style.background = 'transparent';
                });

                if (type === 'file') {
                    const fileName = path.split('/').pop();
                    dragDropManager.makeDraggable(item, 'file', {
                        path: path,
                        name: fileName,
                        type: 'file'
                    });
                }
            });

        } catch (error) {
            fileList.innerHTML = `<div style="color: #f85149; padding: 20px;">错误: ${error.message}</div>`;
        }
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            'txt': '📄',
            'md': '📝',
            'js': '📜',
            'json': '📋',
            'html': '🌐',
            'css': '🎨',
            'png': '🖼️',
            'jpg': '🖼️',
            'gif': '🖼️',
            'svg': '🖼️',
            'mp3': '🎵',
            'wav': '🎵',
            'mp4': '🎬',
            'zip': '📦',
            'exe': '⚙️',
            'sh': '💻',
            'bat': '💻'
        };
        return icons[ext] || '📄';
    }

    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    async openFile(path) {
        try {
            const content = await vfs.readFile(path);
            alert(`文件内容 (${path}):\n\n${content.substring(0, 500)}${content.length > 500 ? '...' : ''}`);
        } catch (error) {
            alert(`无法打开文件: ${error.message}`);
        }
    }
}

export default NovaFileExplorer;
