class DragDropManager {
    constructor() {
        this.currentDragData = null;
        this.currentDragType = null;
        this.currentDragSource = null;
        this.activeDropTargets = new Map();
        this.dragIndicator = null;
    }

    init() {
        this._createDragIndicator();
        this._setupGlobalListeners();
    }

    _createDragIndicator() {
        this.dragIndicator = document.createElement('div');
        this.dragIndicator.style.cssText = `
            position: fixed;
            z-index: 99999;
            pointer-events: none;
            background: rgba(99, 102, 241, 0.9);
            color: #fff;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-family: inherit;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: none;
            transform: translate(8px, 8px);
        `;
        document.body.appendChild(this.dragIndicator);
    }

    _setupGlobalListeners() {
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            this._handleGlobalDrop(e);
        });

        document.addEventListener('dragstart', (e) => {
            this._handleDragStart(e);
        });

        document.addEventListener('dragend', (e) => {
            this._handleDragEnd(e);
        });

        document.addEventListener('mousemove', (e) => {
            if (this.currentDragData) {
                this._updateDragIndicator(e.clientX, e.clientY);
            }
        });
    }

    _handleDragStart(e) {
        const target = e.target;
        const dragItem = target.closest('[data-drag-type]');
        
        if (dragItem) {
            const dragType = dragItem.dataset.dragType;
            const dragData = dragItem.dataset.dragData;
            
            this.currentDragType = dragType;
            this.currentDragSource = dragItem;
            
            try {
                this.currentDragData = JSON.parse(dragData);
            } catch {
                this.currentDragData = dragData;
            }

            e.dataTransfer.effectAllowed = 'copyMove';
            e.dataTransfer.setData('text/plain', dragData);

            this._showDragIndicator(this._getDragLabel(dragType, this.currentDragData));
        }
    }

    _handleDragEnd(e) {
        this.currentDragData = null;
        this.currentDragType = null;
        this.currentDragSource = null;
        this._hideDragIndicator();
        this._clearAllDropHighlights();
    }

    _handleGlobalDrop(e) {
        const dropTarget = e.target.closest('[data-drop-types]');
        
        if (dropTarget && this.currentDragData) {
            const acceptedTypes = dropTarget.dataset.dropTypes.split(',');
            
            if (acceptedTypes.includes(this.currentDragType)) {
                this._dispatchDropEvent(dropTarget, this.currentDragType, this.currentDragData);
            }
        }
    }

    _getDragLabel(type, data) {
        switch (type) {
            case 'file':
                return `📁 ${data.name || '文件'}`;
            case 'text':
                const preview = typeof data === 'string' ? data : (data.content || '文本');
                return `📝 ${preview.substring(0, 20)}${preview.length > 20 ? '...' : ''}`;
            case 'session':
                return `💾 会话数据`;
            default:
                return '📦 数据';
        }
    }

    _showDragIndicator(label) {
        this.dragIndicator.textContent = label;
        this.dragIndicator.style.display = 'block';
    }

    _hideDragIndicator() {
        this.dragIndicator.style.display = 'none';
    }

    _updateDragIndicator(x, y) {
        this.dragIndicator.style.left = `${x}px`;
        this.dragIndicator.style.top = `${y}px`;

        this._checkDropTargets(x, y);
    }

    _checkDropTargets(x, y) {
        const dropTargets = document.querySelectorAll('[data-drop-types]');
        
        dropTargets.forEach(target => {
            const rect = target.getBoundingClientRect();
            const isOver = x >= rect.left && x <= rect.right && 
                           y >= rect.top && y <= rect.bottom;
            
            if (isOver) {
                const acceptedTypes = target.dataset.dropTypes.split(',');
                if (acceptedTypes.includes(this.currentDragType)) {
                    this._highlightDropTarget(target);
                }
            } else {
                this._unhighlightDropTarget(target);
            }
        });
    }

    _highlightDropTarget(target) {
        target.classList.add('drop-active');
        target.style.outline = '2px dashed #6366f1';
        target.style.outlineOffset = '-2px';
    }

    _unhighlightDropTarget(target) {
        target.classList.remove('drop-active');
        target.style.outline = '';
        target.style.outlineOffset = '';
    }

    _clearAllDropHighlights() {
        const dropTargets = document.querySelectorAll('[data-drop-types]');
        dropTargets.forEach(target => {
            this._unhighlightDropTarget(target);
        });
    }

    _dispatchDropEvent(target, type, data) {
        const event = new CustomEvent('nova-drop', {
            detail: {
                type: type,
                data: data,
                source: this.currentDragSource
            },
            bubbles: true,
            cancelable: true
        });
        
        target.dispatchEvent(event);
    }

    makeDraggable(element, type, data) {
        element.setAttribute('draggable', 'true');
        element.setAttribute('data-drag-type', type);
        element.setAttribute('data-drag-data', typeof data === 'string' ? data : JSON.stringify(data));
        
        element.style.cursor = 'grab';
        
        element.addEventListener('dragstart', (e) => {
            e.dataTransfer.setDragImage(new Image(), 0, 0);
        });
    }

    makeDropTarget(element, acceptedTypes, callback) {
        element.setAttribute('data-drop-types', acceptedTypes.join(','));
        
        element.addEventListener('nova-drop', (e) => {
            const { type, data } = e.detail;
            if (acceptedTypes.includes(type)) {
                callback(type, data);
            }
        });

        element.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
        });
    }

    getCurrentDragData() {
        return {
            type: this.currentDragType,
            data: this.currentDragData,
            source: this.currentDragSource
        };
    }
}

const dragDropManager = new DragDropManager();
export default dragDropManager;
