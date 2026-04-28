class WindowManager {
    constructor() {
        this.windows = new Map();
        this.zIndexBase = 1000;
        this.currentZIndex = this.zIndexBase;
        this.activeWindowId = null;
        this.workspace = null;
        this.template = null;
        
        this.dragState = {
            isDragging: false,
            windowId: null,
            startX: 0,
            startY: 0,
            startLeft: 0,
            startTop: 0
        };
        
        this.resizeState = {
            isResizing: false,
            windowId: null,
            direction: '',
            startX: 0,
            startY: 0,
            startWidth: 0,
            startHeight: 0,
            startLeft: 0,
            startTop: 0
        };
    }

    init() {
        this.workspace = document.getElementById('workspace');
        this.template = document.getElementById('window-template');
        
        this._setupGlobalEvents();
    }

    _setupGlobalEvents() {
        document.addEventListener('mousemove', (e) => this._handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this._handleMouseUp(e));
        document.addEventListener('mousedown', (e) => this._handleGlobalMouseDown(e));
    }

    _handleGlobalMouseDown(e) {
        const windowEl = e.target.closest('.window');
        if (windowEl) {
            const windowId = windowEl.dataset.windowId;
            this.focusWindow(windowId);
        }
    }

    createWindow(options = {}) {
        const id = options.id || `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const windowData = {
            id: id,
            title: options.title || '未命名窗口',
            icon: options.icon || '◇',
            content: options.content || null,
            x: options.x !== undefined ? options.x : this._getDefaultX(),
            y: options.y !== undefined ? options.y : this._getDefaultY(),
            width: options.width || 800,
            height: options.height || 500,
            minWidth: options.minWidth || 300,
            minHeight: options.minHeight || 200,
            maxWidth: options.maxWidth || Infinity,
            maxHeight: options.maxHeight || Infinity,
            isMinimized: false,
            isMaximized: false,
            isFocused: false,
            zIndex: this._getNextZIndex(),
            beforeMaximize: null,
            onClose: options.onClose || null,
            onMinimize: options.onMinimize || null,
            onMaximize: options.onMaximize || null,
            onFocus: options.onFocus || null
        };

        const clamped = this._clampWindowPosition(windowData, windowData.x, windowData.y);
        windowData.x = clamped.x;
        windowData.y = clamped.y;

        const windowEl = this._createWindowElement(windowData);
        windowData.element = windowEl;
        
        this.windows.set(id, windowData);
        this.workspace.appendChild(windowEl);
        
        this.focusWindow(id);
        
        this._bindWindowEvents(windowData);
        
        return id;
    }

    _createWindowElement(windowData) {
        const templateContent = this.template.content.cloneNode(true);
        const windowEl = templateContent.querySelector('.window');
        
        windowEl.dataset.windowId = windowData.id;
        windowEl.style.left = `${windowData.x}px`;
        windowEl.style.top = `${windowData.y}px`;
        windowEl.style.width = `${windowData.width}px`;
        windowEl.style.height = `${windowData.height}px`;
        windowEl.style.zIndex = windowData.zIndex;
        
        windowEl.querySelector('.window-icon').textContent = windowData.icon;
        windowEl.querySelector('.window-title').textContent = windowData.title;
        
        const contentEl = windowEl.querySelector('.window-content');
        if (windowData.content) {
            if (typeof windowData.content === 'string') {
                contentEl.innerHTML = windowData.content;
            } else if (windowData.content instanceof HTMLElement) {
                contentEl.appendChild(windowData.content);
            }
        }
        
        return windowEl;
    }

    _bindWindowEvents(windowData) {
        const windowEl = windowData.element;
        const header = windowEl.querySelector('.window-header');
        const content = windowEl.querySelector('.window-content');
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.window-controls')) return;
            
            this.dragState = {
                isDragging: true,
                windowId: windowData.id,
                startX: e.clientX,
                startY: e.clientY,
                startLeft: windowData.x,
                startTop: windowData.y
            };
            
            header.classList.add('dragging');
            e.preventDefault();
        });
        
        header.addEventListener('dblclick', (e) => {
            if (e.target.closest('.window-controls')) return;
            this.toggleMaximize(windowData.id);
        });
        
        const resizeHandles = windowEl.querySelectorAll('.resize-handle');
        resizeHandles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                const direction = handle.className
                    .split(' ')
                    .find(cls => cls.startsWith('resize-') && cls !== 'resize-handle');
                
                if (direction) {
                    const dir = direction.replace('resize-', '');
                    this.resizeState = {
                        isResizing: true,
                        windowId: windowData.id,
                        direction: dir,
                        startX: e.clientX,
                        startY: e.clientY,
                        startWidth: windowData.width,
                        startHeight: windowData.height,
                        startLeft: windowData.x,
                        startTop: windowData.y
                    };
                    e.preventDefault();
                }
            });
        });
        
        const btnMinimize = windowEl.querySelector('.btn-minimize');
        const btnMaximize = windowEl.querySelector('.btn-maximize');
        const btnClose = windowEl.querySelector('.btn-close');
        
        btnMinimize.addEventListener('click', () => this.minimizeWindow(windowData.id));
        btnMaximize.addEventListener('click', () => this.toggleMaximize(windowData.id));
        btnClose.addEventListener('click', () => this.closeWindow(windowData.id));
    }

    _clampWindowPosition(windowData, x, y) {
        const workspaceRect = this.workspace.getBoundingClientRect();
        const HEADER_HEIGHT = 36;
        const MIN_VISIBLE_WIDTH = 100;
        const MIN_VISIBLE_HEIGHT = HEADER_HEIGHT;
        
        let newX = x;
        let newY = y;
        
        newX = Math.max(newX, -windowData.width + MIN_VISIBLE_WIDTH);
        newX = Math.min(newX, workspaceRect.width - MIN_VISIBLE_WIDTH);
        
        newY = Math.max(newY, -HEADER_HEIGHT + 10);
        newY = Math.min(newY, workspaceRect.height - MIN_VISIBLE_HEIGHT);
        
        return { x: newX, y: newY };
    }

    _handleMouseMove(e) {
        if (this.dragState.isDragging) {
            const windowData = this.windows.get(this.dragState.windowId);
            if (!windowData || windowData.isMaximized) return;
            
            const deltaX = e.clientX - this.dragState.startX;
            const deltaY = e.clientY - this.dragState.startY;
            
            let newX = this.dragState.startLeft + deltaX;
            let newY = this.dragState.startTop + deltaY;
            
            const clamped = this._clampWindowPosition(windowData, newX, newY);
            
            windowData.x = clamped.x;
            windowData.y = clamped.y;
            
            windowData.element.style.left = `${windowData.x}px`;
            windowData.element.style.top = `${windowData.y}px`;
        }
        
        if (this.resizeState.isResizing) {
            const windowData = this.windows.get(this.resizeState.windowId);
            if (!windowData || windowData.isMaximized) return;
            
            const deltaX = e.clientX - this.resizeState.startX;
            const deltaY = e.clientY - this.resizeState.startY;
            const dir = this.resizeState.direction;
            
            let newWidth = this.resizeState.startWidth;
            let newHeight = this.resizeState.startHeight;
            let newLeft = this.resizeState.startLeft;
            let newTop = this.resizeState.startTop;
            
            if (dir.includes('e')) {
                newWidth = Math.max(windowData.minWidth, Math.min(windowData.maxWidth, this.resizeState.startWidth + deltaX));
            }
            if (dir.includes('w')) {
                const maxShrink = this.resizeState.startWidth - windowData.minWidth;
                const actualDeltaX = Math.min(deltaX, maxShrink);
                newWidth = this.resizeState.startWidth - actualDeltaX;
                newLeft = this.resizeState.startLeft + actualDeltaX;
            }
            if (dir.includes('s')) {
                newHeight = Math.max(windowData.minHeight, Math.min(windowData.maxHeight, this.resizeState.startHeight + deltaY));
            }
            if (dir.includes('n')) {
                const maxShrink = this.resizeState.startHeight - windowData.minHeight;
                const actualDeltaY = Math.min(deltaY, maxShrink);
                newHeight = this.resizeState.startHeight - actualDeltaY;
                newTop = this.resizeState.startTop + actualDeltaY;
            }
            
            windowData.width = newWidth;
            windowData.height = newHeight;
            windowData.x = newLeft;
            windowData.y = newTop;
            
            windowData.element.style.width = `${newWidth}px`;
            windowData.element.style.height = `${newHeight}px`;
            windowData.element.style.left = `${newLeft}px`;
            windowData.element.style.top = `${newTop}px`;
        }
    }

    _handleMouseUp(e) {
        if (this.dragState.isDragging) {
            const windowData = this.windows.get(this.dragState.windowId);
            if (windowData) {
                const header = windowData.element.querySelector('.window-header');
                header.classList.remove('dragging');
            }
            this.dragState.isDragging = false;
            this.dragState.windowId = null;
        }
        
        this.resizeState.isResizing = false;
        this.resizeState.windowId = null;
    }

    focusWindow(windowId) {
        const windowData = this.windows.get(windowId);
        if (!windowData) return;
        
        if (windowData.isMinimized) {
            this.restoreWindow(windowId);
            return;
        }
        
        if (this.activeWindowId && this.activeWindowId !== windowId) {
            const prevWindow = this.windows.get(this.activeWindowId);
            if (prevWindow) {
                prevWindow.isFocused = false;
                prevWindow.element.classList.remove('focused');
            }
        }
        
        windowData.zIndex = this._getNextZIndex();
        windowData.element.style.zIndex = windowData.zIndex;
        windowData.isFocused = true;
        windowData.element.classList.add('focused');
        this.activeWindowId = windowId;
        
        if (windowData.onFocus) {
            windowData.onFocus(windowId);
        }
    }

    minimizeWindow(windowId) {
        const windowData = this.windows.get(windowId);
        if (!windowData) return;
        
        windowData.isMinimized = true;
        windowData.element.style.display = 'none';
        
        if (this.activeWindowId === windowId) {
            this.activeWindowId = null;
        }
        
        if (windowData.onMinimize) {
            windowData.onMinimize(windowId);
        }
    }

    restoreWindow(windowId) {
        const windowData = this.windows.get(windowId);
        if (!windowData) return;
        
        windowData.isMinimized = false;
        windowData.element.style.display = 'flex';
        
        this.focusWindow(windowId);
    }

    maximizeWindow(windowId) {
        const windowData = this.windows.get(windowId);
        if (!windowData || windowData.isMaximized) return;
        
        windowData.beforeMaximize = {
            x: windowData.x,
            y: windowData.y,
            width: windowData.width,
            height: windowData.height
        };
        
        const workspaceRect = this.workspace.getBoundingClientRect();
        
        windowData.x = 0;
        windowData.y = 0;
        windowData.width = workspaceRect.width;
        windowData.height = workspaceRect.height;
        windowData.isMaximized = true;
        
        windowData.element.classList.add('maximized');
        windowData.element.style.left = '0px';
        windowData.element.style.top = '0px';
        windowData.element.style.width = `${workspaceRect.width}px`;
        windowData.element.style.height = `${workspaceRect.height}px`;
        
        if (windowData.onMaximize) {
            windowData.onMaximize(windowId, true);
        }
    }

    unmaximizeWindow(windowId) {
        const windowData = this.windows.get(windowId);
        if (!windowData || !windowData.isMaximized || !windowData.beforeMaximize) return;
        
        const state = windowData.beforeMaximize;
        windowData.x = state.x;
        windowData.y = state.y;
        windowData.width = state.width;
        windowData.height = state.height;
        windowData.isMaximized = false;
        
        windowData.element.classList.remove('maximized');
        windowData.element.style.left = `${state.x}px`;
        windowData.element.style.top = `${state.y}px`;
        windowData.element.style.width = `${state.width}px`;
        windowData.element.style.height = `${state.height}px`;
        
        if (windowData.onMaximize) {
            windowData.onMaximize(windowId, false);
        }
    }

    toggleMaximize(windowId) {
        const windowData = this.windows.get(windowId);
        if (!windowData) return;
        
        if (windowData.isMaximized) {
            this.unmaximizeWindow(windowId);
        } else {
            this.maximizeWindow(windowId);
        }
    }

    closeWindow(windowId) {
        const windowData = this.windows.get(windowId);
        if (!windowData) return;
        
        if (windowData.onClose) {
            const shouldClose = windowData.onClose(windowId);
            if (shouldClose === false) return;
        }
        
        windowData.element.remove();
        this.windows.delete(windowId);
        
        if (this.activeWindowId === windowId) {
            this.activeWindowId = null;
        }
    }

    setWindowContent(windowId, content) {
        const windowData = this.windows.get(windowId);
        if (!windowData) return;
        
        const contentEl = windowData.element.querySelector('.window-content');
        contentEl.innerHTML = '';
        
        if (typeof content === 'string') {
            contentEl.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            contentEl.appendChild(content);
        }
    }

    setWindowTitle(windowId, title) {
        const windowData = this.windows.get(windowId);
        if (!windowData) return;
        
        windowData.title = title;
        const titleEl = windowData.element.querySelector('.window-title');
        titleEl.textContent = title;
    }

    getWindow(windowId) {
        return this.windows.get(windowId);
    }

    getAllWindows() {
        return Array.from(this.windows.values());
    }

    getActiveWindow() {
        return this.activeWindowId ? this.windows.get(this.activeWindowId) : null;
    }

    _getDefaultX() {
        const workspaceRect = this.workspace?.getBoundingClientRect();
        const offset = this.windows.size * 30;
        return 100 + (offset % 200);
    }

    _getDefaultY() {
        const offset = this.windows.size * 30;
        return 50 + (offset % 150);
    }

    _getNextZIndex() {
        return ++this.currentZIndex;
    }
}

const windowManager = new WindowManager();
export default windowManager;
