import { NovaApp } from '../core/app-framework.js';
import vfs from '../core/vfs.js';

class NovaTerminal extends NovaApp {
    constructor() {
        super();
        this.cwd = vfs.getHomeDir();
        this.history = [];
        this.historyIndex = -1;
        this.username = 'nova';
        this.hostname = 'novaos';
    }

    onMount() {
        this.render();
        this.setupEventListeners();
        this.printWelcome();
    }

    render() {
        this.innerHTML = `
            <div class="terminal-container">
                <div class="terminal-output" id="terminal-output"></div>
                <div class="terminal-input-line">
                    <span class="prompt terminal-prompt">
                        <span class="user">${this.username}@${this.hostname}</span>:<span class="path">${this.getDisplayPath()}</span>$ 
                    </span>
                    <input type="text" id="terminal-input" autofocus autocomplete="off" spellcheck="false">
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const input = this.querySelector('#terminal-input');
        
        this.addEventListener('click', () => {
            input.focus();
        });

        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                await this.executeCommand(input.value);
                input.value = '';
                this.historyIndex = this.history.length;
                this.updatePrompt();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (this.historyIndex > 0) {
                    this.historyIndex--;
                    input.value = this.history[this.historyIndex];
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (this.historyIndex < this.history.length - 1) {
                    this.historyIndex++;
                    input.value = this.history[this.historyIndex];
                } else {
                    this.historyIndex = this.history.length;
                    input.value = '';
                }
            } else if (e.key === 'Tab') {
                e.preventDefault();
                await this.autoComplete(input);
            } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.clear();
            }
        });
    }

    getDisplayPath() {
        if (this.cwd === vfs.getHomeDir()) {
            return '~';
        } else if (this.cwd.startsWith(vfs.getHomeDir())) {
            return '~' + this.cwd.slice(vfs.getHomeDir().length);
        }
        return this.cwd;
    }

    updatePrompt() {
        const prompt = this.querySelector('.prompt');
        prompt.innerHTML = `<span class="user">${this.username}@${this.hostname}</span>:<span class="path">${this.getDisplayPath()}</span>$ `;
    }

    printWelcome() {
        const asciiArt = `
   _   _               ___  ____  
  | \\ | | _____   __ _/ _ \\/ ___| 
  |  \\| |/ _ \\\\ \\ / / | | \\___ \\ 
  | |\\  | (_) \\\\ V /| |_| |___) |
  |_| \\_|\\___/ \\_/  \\___/|____/ 
        `;
        
        this.println(asciiArt, 'terminal-ascii-art');
        this.println(`欢迎使用 NovaOS v1.0.0`, 'terminal-welcome');
        this.println(`输入 'help' 查看可用命令`, 'terminal-command-hint');
        this.println('');
    }

    println(text, className = '') {
        const output = this.querySelector('#terminal-output');
        const line = document.createElement('div');
        line.className = 'terminal-line';
        if (className) {
            line.classList.add(className);
        }
        line.textContent = text;
        output.appendChild(line);
        this.scrollToBottom();
    }

    printHTML(html, className = '') {
        const output = this.querySelector('#terminal-output');
        const line = document.createElement('div');
        line.className = 'terminal-line';
        if (className) {
            line.classList.add(className);
        }
        line.innerHTML = html;
        output.appendChild(line);
        this.scrollToBottom();
    }

    scrollToBottom() {
        const output = this.querySelector('#terminal-output');
        output.scrollTop = output.scrollHeight;
    }

    clear() {
        const output = this.querySelector('#terminal-output');
        output.innerHTML = '';
    }

    async executeCommand(commandLine) {
        const trimmed = commandLine.trim();
        
        if (trimmed) {
            this.history.push(trimmed);
        }

        const promptHTML = `<span class="terminal-prompt"><span class="user">${this.username}@${this.hostname}</span>:<span class="path">${this.getDisplayPath()}</span>$ </span><span class="terminal-command">${this.escapeHtml(commandLine)}</span>`;
        this.printHTML(promptHTML);

        if (!trimmed) {
            return;
        }

        const parts = this.parseCommand(trimmed);
        const command = parts[0];
        const args = parts.slice(1);

        try {
            await this.runCommand(command, args);
        } catch (error) {
            this.println(`${command}: ${error.message}`, 'terminal-error');
        }
    }

    parseCommand(line) {
        const result = [];
        let current = '';
        let inQuote = null;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if ((char === '"' || char === "'") && (i === 0 || line[i - 1] !== '\\')) {
                if (inQuote === char) {
                    inQuote = null;
                } else if (inQuote === null) {
                    inQuote = char;
                } else {
                    current += char;
                }
            } else if (char === ' ' && inQuote === null) {
                if (current) {
                    result.push(current);
                    current = '';
                }
            } else {
                current += char;
            }
        }
        
        if (current) {
            result.push(current);
        }
        
        return result;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async runCommand(command, args) {
        switch (command) {
            case 'help':
                await this.cmdHelp(args);
                break;
            case 'ls':
                await this.cmdLs(args);
                break;
            case 'cd':
                await this.cmdCd(args);
                break;
            case 'pwd':
                this.println(this.cwd, 'terminal-info');
                break;
            case 'cat':
                await this.cmdCat(args);
                break;
            case 'echo':
                this.println(args.join(' '));
                break;
            case 'mkdir':
                await this.cmdMkdir(args);
                break;
            case 'touch':
                await this.cmdTouch(args);
                break;
            case 'rm':
                await this.cmdRm(args);
                break;
            case 'clear':
                this.clear();
                break;
            case 'history':
                this.cmdHistory();
                break;
            case 'whoami':
                this.println(this.username, 'terminal-info');
                break;
            case 'date':
                this.println(new Date().toString());
                break;
            case 'uname':
                this.println('NovaOS 1.0.0 x86_64 Browser');
                break;
            default:
                throw new Error(`命令未找到: ${command}。输入 'help' 查看可用命令。`);
        }
    }

    async cmdHelp(args) {
        const helpText = `
可用命令:

  文件系统:
    ls [目录]        列出目录内容
    cd <目录>        切换工作目录
    pwd              显示当前目录
    cat <文件>       显示文件内容
    mkdir <目录>     创建目录
    touch <文件>     创建空文件
    rm [-r] <路径>   删除文件或目录 (-r 递归删除)

  系统:
    help             显示此帮助信息
    clear            清屏
    history          显示命令历史
    whoami           显示当前用户
    date             显示当前日期时间
    uname            显示系统信息
    echo <文本>      输出文本

使用示例:
  ls ~              列出主目录
  cd /home          切换到 /home
  cat welcome.txt   显示文件内容
        `;
        this.println(helpText);
    }

    async cmdLs(args) {
        let targetPath = this.cwd;
        const showAll = args.includes('-a');
        
        const pathArgs = args.filter(a => !a.startsWith('-'));
        if (pathArgs.length > 0) {
            targetPath = vfs._normalizePath(pathArgs[0], this.cwd);
        }

        const stat = await vfs.stat(targetPath);
        if (stat.type !== 'directory') {
            throw new Error(`不是目录: ${targetPath}`);
        }

        const items = await vfs.readDir(targetPath);
        const fileNames = [];
        const dirNames = [];

        for (const item of items) {
            if (!showAll && item.name.startsWith('.')) {
                continue;
            }
            if (item.type === 'directory') {
                dirNames.push(item.name + '/');
            } else {
                fileNames.push(item.name);
            }
        }

        dirNames.sort();
        fileNames.sort();

        if (dirNames.length > 0 || fileNames.length > 0) {
            const allNames = [...dirNames, ...fileNames];
            const maxLen = Math.max(...allNames.map(n => n.length), 20);
            const cols = Math.floor(60 / (maxLen + 2));
            
            let line = '';
            for (let i = 0; i < allNames.length; i++) {
                const name = allNames[i];
                const isDir = dirNames.includes(name);
                const padded = name.padEnd(maxLen + 2);
                
                if (isDir) {
                    line += `\x1b[34m${padded}\x1b[0m`;
                } else {
                    line += padded;
                }
                
                if ((i + 1) % cols === 0 || i === allNames.length - 1) {
                    this.println(line.replace(/\x1b\[[0-9;]*m/g, ''));
                    line = '';
                }
            }
        }
    }

    async cmdCd(args) {
        if (args.length === 0) {
            this.cwd = vfs.getHomeDir();
            return;
        }

        const target = args[0];
        let newPath;

        if (target === '~' || target.startsWith('~/')) {
            newPath = vfs.getHomeDir() + (target.length > 1 ? target.slice(1) : '');
        } else {
            newPath = vfs._normalizePath(target, this.cwd);
        }

        try {
            const stat = await vfs.stat(newPath);
            if (stat.type !== 'directory') {
                throw new Error(`不是目录: ${target}`);
            }
            this.cwd = newPath;
        } catch (error) {
            throw new Error(`目录不存在: ${target}`);
        }
    }

    async cmdCat(args) {
        if (args.length === 0) {
            throw new Error('缺少文件参数');
        }

        for (const filePath of args) {
            const fullPath = vfs._normalizePath(filePath, this.cwd);
            try {
                const content = await vfs.readFile(fullPath);
                this.println(content);
            } catch (error) {
                throw new Error(`无法读取文件: ${filePath}`);
            }
        }
    }

    async cmdMkdir(args) {
        if (args.length === 0) {
            throw new Error('缺少目录参数');
        }

        for (const dirPath of args) {
            const fullPath = vfs._normalizePath(dirPath, this.cwd);
            try {
                await vfs.mkdir(fullPath);
            } catch (error) {
                if (error.message.includes('already exists')) {
                    throw new Error(`目录已存在: ${dirPath}`);
                }
                throw error;
            }
        }
    }

    async cmdTouch(args) {
        if (args.length === 0) {
            throw new Error('缺少文件参数');
        }

        for (const filePath of args) {
            const fullPath = vfs._normalizePath(filePath, this.cwd);
            await vfs.touch(fullPath);
        }
    }

    async cmdRm(args) {
        if (args.length === 0) {
            throw new Error('缺少参数');
        }

        const recursive = args.includes('-r') || args.includes('-rf') || args.includes('-fr');
        const pathArgs = args.filter(a => !a.startsWith('-'));

        if (pathArgs.length === 0) {
            throw new Error('缺少路径参数');
        }

        for (const targetPath of pathArgs) {
            const fullPath = vfs._normalizePath(targetPath, this.cwd);
            try {
                await vfs.rm(fullPath, recursive);
            } catch (error) {
                if (error.message.includes('Directory is not empty')) {
                    throw new Error(`目录不为空，使用 -r 参数递归删除: ${targetPath}`);
                }
                throw new Error(`删除失败: ${targetPath}`);
            }
        }
    }

    cmdHistory() {
        this.history.forEach((cmd, index) => {
            this.println(`  ${index + 1}  ${cmd}`);
        });
    }

    async autoComplete(input) {
        const value = input.value;
        if (!value) return;

        const parts = value.split(/\s+/);
        const lastPart = parts[parts.length - 1] || '';

        const commands = ['help', 'ls', 'cd', 'pwd', 'cat', 'echo', 'mkdir', 'touch', 'rm', 'clear', 'history', 'whoami', 'date', 'uname'];
        
        if (parts.length === 1) {
            const matches = commands.filter(c => c.startsWith(lastPart));
            if (matches.length === 1) {
                input.value = matches[0];
            } else if (matches.length > 1) {
                this.println('');
                this.println(matches.join('  '));
                this.printHTML(`<span class="terminal-prompt"><span class="user">${this.username}@${this.hostname}</span>:<span class="path">${this.getDisplayPath()}</span>$ </span><span class="terminal-command">${this.escapeHtml(value)}</span>`);
            }
            return;
        }

        if (['cd', 'cat', 'rm', 'ls'].includes(parts[0])) {
            let searchPath = lastPart;
            let searchDir = this.cwd;
            let searchPrefix = '';

            if (searchPath.includes('/')) {
                const lastSlash = searchPath.lastIndexOf('/');
                searchPrefix = searchPath.substring(0, lastSlash + 1);
                const partialName = searchPath.substring(lastSlash + 1);
                
                if (searchPrefix.startsWith('/')) {
                    searchDir = searchPrefix.slice(0, -1) || '/';
                } else {
                    searchDir = vfs._normalizePath(searchPrefix.slice(0, -1), this.cwd);
                }
                
                try {
                    const items = await vfs.readDir(searchDir);
                    const matches = items
                        .filter(item => item.name.startsWith(partialName))
                        .map(item => item.name);
                    
                    if (matches.length === 1) {
                        parts[parts.length - 1] = searchPrefix + matches[0];
                        input.value = parts.join(' ');
                    }
                } catch (e) {
                    // Silently ignore errors during tab completion (e.g. unreadable dir)
                }
                try {
                    const items = await vfs.readDir(this.cwd);
                    const matches = items
                        .filter(item => item.name.startsWith(searchPath))
                        .map(item => item.type === 'directory' ? item.name + '/' : item.name);

                    if (matches.length === 1) {
                        parts[parts.length - 1] = matches[0];
                        input.value = parts.join(' ');
                    } else if (matches.length > 1) {
                        this.println('');
                        this.println(matches.join('  '));
                        this.printHTML(`<span class="terminal-prompt"><span class="user">${this.username}@${this.hostname}</span>:<span class="path">${this.getDisplayPath()}</span>$ </span><span class="terminal-command">${this.escapeHtml(value)}</span>`);
                    }
                } catch (e) {
                    // Silently ignore errors during tab completion (e.g. unreadable dir)
                }
            }
        }
    }
}

export default NovaTerminal;
