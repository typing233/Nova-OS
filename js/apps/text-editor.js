import { NovaApp } from '../core/app-framework.js';
import vfs from '../core/vfs.js';
import dragDropManager from '../core/drag-drop-manager.js';

class NovaTextEditor extends NovaApp {
    constructor() {
        super();
        this.currentFile = null;
        this.isModified = false;
    }

    onMount() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; background: #1e1e2e; color: #fff; font-family: inherit;">
                <div style="display: flex; align-items: center; padding: 8px 16px; background: #252540; border-bottom: 1px solid rgba(255,255,255,0.1); gap: 8px;">
                    <button id="btn-new" style="padding: 6px 12px; background: rgba(99, 102, 241, 0.2); border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 6px; color: #a5b4fc; cursor: pointer; font-size: 13px;">
                        新建
                    </button>
                    <button id="btn-open" style="padding: 6px 12px; background: rgba(255,255,255,0.1); border: none; border-radius: 6px; color: #fff; cursor: pointer; font-size: 13px;">
                        打开
                    </button>
                    <button id="btn-save" style="padding: 6px 12px; background: rgba(255,255,255,0.1); border: none; border-radius: 6px; color: #fff; cursor: pointer; font-size: 13px;">
                        保存
                    </button>
                    <div id="status-indicator" style="flex: 1; text-align: right; font-size: 12px; color: rgba(255,255,255,0.5);">
                        无标题
                    </div>
                </div>
                <div style="flex: 1; position: relative; padding: 0;">
                    <textarea id="editor" placeholder="开始输入..." style="
                        width: 100%;
                        height: 100%;
                        background: transparent;
                        border: none;
                        color: #e6edf3;
                        font-family: 'Consolas', 'Monaco', monospace;
                        font-size: 14px;
                        line-height: 1.6;
                        padding: 16px;
                        resize: none;
                        outline: none;
                    "></textarea>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const btnNew = this.querySelector('#btn-new');
        const btnOpen = this.querySelector('#btn-open');
        const btnSave = this.querySelector('#btn-save');
        const editor = this.querySelector('#editor');

        btnNew.addEventListener('click', () => this.newFile());
        btnOpen.addEventListener('click', () => this.openFile());
        btnSave.addEventListener('click', () => this.saveFile());

        editor.addEventListener('input', () => {
            this.isModified = true;
            this.updateStatus();
        });

        this._setupDragDrop(editor);
    }

    _setupDragDrop(editor) {
        dragDropManager.makeDropTarget(this, ['file', 'text'], async (type, data) => {
            if (type === 'file') {
                try {
                    const content = await vfs.readFile(data.path);
                    editor.value = content;
                    this.currentFile = data.path;
                    this.isModified = false;
                    this.updateStatus();
                } catch (error) {
                    alert(`无法打开文件: ${error.message}`);
                }
            } else if (type === 'text') {
                const text = typeof data === 'string' ? data : (data.content || '');
                const start = editor.selectionStart;
                const end = editor.selectionEnd;
                const before = editor.value.substring(0, start);
                const after = editor.value.substring(end);
                editor.value = before + text + after;
                editor.selectionStart = start + text.length;
                editor.selectionEnd = start + text.length;
                this.isModified = true;
                this.updateStatus();
            }
        });

        editor.addEventListener('dragstart', (e) => {
            const selectedText = editor.value.substring(
                editor.selectionStart,
                editor.selectionEnd
            );
            
            if (selectedText) {
                dragDropManager.makeDraggable(e.target, 'text', {
                    content: selectedText
                });
            }
        });
    }

    newFile() {
        if (this.isModified) {
            if (!confirm('文件已修改，是否放弃更改？')) {
                return;
            }
        }
        this.currentFile = null;
        this.isModified = false;
        this.querySelector('#editor').value = '';
        this.updateStatus();
    }

    async openFile() {
        const path = prompt('请输入文件路径:', vfs.getHomeDir() + '/');
        if (!path) return;

        try {
            const content = await vfs.readFile(path);
            this.querySelector('#editor').value = content;
            this.currentFile = path;
            this.isModified = false;
            this.updateStatus();
        } catch (error) {
            alert(`无法打开文件: ${error.message}`);
        }
    }

    async saveFile() {
        let path = this.currentFile;
        
        if (!path) {
            path = prompt('请输入保存路径:', vfs.getHomeDir() + '/untitled.txt');
            if (!path) return;
        }

        try {
            const content = this.querySelector('#editor').value;
            await vfs.writeFile(path, content);
            this.currentFile = path;
            this.isModified = false;
            this.updateStatus();
            alert('保存成功！');
        } catch (error) {
            alert(`保存失败: ${error.message}`);
        }
    }

    updateStatus() {
        const status = this.querySelector('#status-indicator');
        const filename = this.currentFile ? this.currentFile.split('/').pop() : '无标题';
        status.textContent = `${filename}${this.isModified ? ' •' : ''}`;
    }
}

export default NovaTextEditor;
