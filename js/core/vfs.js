const DB_NAME = 'NovaOS_VFS';
const DB_VERSION = 1;
const STORE_NAME = 'files';

const VFS_ERRORS = {
    NOT_FOUND: 'File or directory not found',
    ALREADY_EXISTS: 'File or directory already exists',
    NOT_DIRECTORY: 'Not a directory',
    NOT_FILE: 'Not a file',
    INVALID_PATH: 'Invalid path',
    PERMISSION_DENIED: 'Permission denied'
};

class VFS {
    constructor() {
        this.db = null;
        this.initialized = false;
        this.currentUser = 'nova';
        this.homeDir = `/home/${this.currentUser}`;
    }

    async init() {
        if (this.initialized) return;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                this.initialized = true;
                this._initializeFileSystem().then(resolve).catch(reject);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'path' });
                    store.createIndex('parent', 'parent', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                }
            };
        });
    }

    async _initializeFileSystem() {
        const rootExists = await this.exists('/');
        if (!rootExists) {
            await this._createDirectory('/', null, { owner: 'root', permissions: 0o755 });
            await this._createDirectory('/home', '/', { owner: 'root', permissions: 0o755 });
            await this._createDirectory(this.homeDir, '/home', { owner: this.currentUser, permissions: 0o755 });
            await this._createDirectory('/tmp', '/', { owner: 'root', permissions: 0o777 });
            await this._createDirectory('/bin', '/', { owner: 'root', permissions: 0o755 });
            
            await this.writeFile(
                `${this.homeDir}/welcome.txt`,
                '欢迎使用 NovaOS！\n\n这是一个运行在浏览器中的虚拟桌面系统。\n\n可用命令：\n  - ls: 列出目录内容\n  - cd: 切换目录\n  - pwd: 显示当前目录\n  - cat: 显示文件内容\n  - echo: 输出文本\n  - mkdir: 创建目录\n  - touch: 创建文件\n  - rm: 删除文件或目录\n  - clear: 清屏\n  - help: 显示帮助信息\n',
                { owner: this.currentUser, permissions: 0o644 }
            );
        }
    }

    _normalizePath(path, cwd = '/') {
        if (!path) return cwd;
        
        let absolutePath = path;
        if (!path.startsWith('/')) {
            absolutePath = cwd === '/' ? `/${path}` : `${cwd}/${path}`;
        }

        const parts = absolutePath.split('/').filter(p => p);
        const result = [];

        for (const part of parts) {
            if (part === '..') {
                result.pop();
            } else if (part !== '.' && part !== '') {
                result.push(part);
            }
        }

        return '/' + result.join('/');
    }

    _splitPath(path) {
        const normalized = this._normalizePath(path);
        if (normalized === '/') {
            return { parent: null, name: '/' };
        }
        const parts = normalized.split('/').filter(p => p);
        const name = parts.pop();
        const parent = '/' + parts.join('/');
        return { parent, name };
    }

    async exists(path) {
        const normalized = this._normalizePath(path);
        return new Promise((resolve) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(normalized);
            
            request.onsuccess = () => resolve(!!request.result);
            request.onerror = () => resolve(false);
        });
    }

    async stat(path) {
        const normalized = this._normalizePath(path);
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(normalized);
            
            request.onsuccess = () => {
                if (request.result) {
                    resolve(request.result);
                } else {
                    reject(new Error(VFS_ERRORS.NOT_FOUND));
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    async _createDirectory(path, parent, metadata = {}) {
        const normalized = this._normalizePath(path);
        const { name } = this._splitPath(normalized);

        const dirEntry = {
            path: normalized,
            name: name,
            type: 'directory',
            parent: parent,
            size: 0,
            created: Date.now(),
            modified: Date.now(),
            ...metadata
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(dirEntry);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async mkdir(path, cwd = '/') {
        const normalized = this._normalizePath(path, cwd);
        
        if (await this.exists(normalized)) {
            throw new Error(VFS_ERRORS.ALREADY_EXISTS);
        }

        const { parent, name } = this._splitPath(normalized);
        
        if (parent && !(await this.exists(parent))) {
            throw new Error(VFS_ERRORS.NOT_FOUND + ': Parent directory does not exist');
        }

        const parentStat = parent ? await this.stat(parent) : null;
        if (parent && parentStat.type !== 'directory') {
            throw new Error(VFS_ERRORS.NOT_DIRECTORY);
        }

        await this._createDirectory(normalized, parent, {
            owner: this.currentUser,
            permissions: 0o755
        });
    }

    async writeFile(path, content, metadata = {}, cwd = '/') {
        const normalized = this._normalizePath(path, cwd);
        const { parent, name } = this._splitPath(normalized);

        if (parent && !(await this.exists(parent))) {
            throw new Error(VFS_ERRORS.NOT_FOUND + ': Parent directory does not exist');
        }

        const parentStat = parent ? await this.stat(parent) : null;
        if (parent && parentStat.type !== 'directory') {
            throw new Error(VFS_ERRORS.NOT_DIRECTORY);
        }

        const fileEntry = {
            path: normalized,
            name: name,
            type: 'file',
            parent: parent,
            content: content,
            size: content.length,
            created: Date.now(),
            modified: Date.now(),
            owner: this.currentUser,
            permissions: 0o644,
            ...metadata
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(fileEntry);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async readFile(path, cwd = '/') {
        const normalized = this._normalizePath(path, cwd);
        const stat = await this.stat(normalized);
        
        if (stat.type !== 'file') {
            throw new Error(VFS_ERRORS.NOT_FILE);
        }

        return stat.content || '';
    }

    async readDir(path, cwd = '/') {
        const normalized = this._normalizePath(path, cwd);
        const stat = await this.stat(normalized);
        
        if (stat.type !== 'directory') {
            throw new Error(VFS_ERRORS.NOT_DIRECTORY);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('parent');
            const request = index.getAll(normalized);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async rm(path, recursive = false, cwd = '/') {
        const normalized = this._normalizePath(path, cwd);
        
        if (normalized === '/') {
            throw new Error(VFS_ERRORS.PERMISSION_DENIED + ': Cannot delete root');
        }

        const stat = await this.stat(normalized);

        if (stat.type === 'directory') {
            const children = await this.readDir(normalized);
            if (children.length > 0 && !recursive) {
                throw new Error('Directory is not empty. Use recursive delete.');
            }
            
            if (recursive) {
                for (const child of children) {
                    await this.rm(child.path, true);
                }
            }
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(normalized);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async touch(path, cwd = '/') {
        const normalized = this._normalizePath(path, cwd);
        
        if (await this.exists(normalized)) {
            const stat = await this.stat(normalized);
            if (stat.type === 'file') {
                stat.modified = Date.now();
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction([STORE_NAME], 'readwrite');
                    const store = transaction.objectStore(STORE_NAME);
                    const request = store.put(stat);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            }
        } else {
            await this.writeFile(normalized, '');
        }
    }

    async copy(srcPath, destPath, cwd = '/') {
        const srcNormalized = this._normalizePath(srcPath, cwd);
        const destNormalized = this._normalizePath(destPath, cwd);
        
        const srcStat = await this.stat(srcNormalized);
        
        if (srcStat.type === 'directory') {
            throw new Error('Directory copy not implemented yet');
        }

        const content = await this.readFile(srcNormalized);
        await this.writeFile(destNormalized, content);
    }

    async move(srcPath, destPath, cwd = '/') {
        const srcNormalized = this._normalizePath(srcPath, cwd);
        const destNormalized = this._normalizePath(destPath, cwd);
        
        await this.copy(srcNormalized, destNormalized);
        await this.rm(srcNormalized);
    }

    getHomeDir() {
        return this.homeDir;
    }

    async listAll() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

const vfs = new VFS();
export default vfs;
