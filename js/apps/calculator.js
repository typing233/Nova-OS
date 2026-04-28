import { NovaApp } from '../core/app-framework.js';

class NovaCalculator extends NovaApp {
    constructor() {
        super();
        this.displayValue = '0';
        this.firstOperand = null;
        this.operator = null;
        this.waitingForSecondOperand = false;
    }

    onMount() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; background: #1a1a2e; padding: 16px;">
                <div id="display" style="
                    background: #252540;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 16px;
                    text-align: right;
                    font-family: 'Consolas', monospace;
                ">
                    <div id="display-history" style="color: rgba(255,255,255,0.5); font-size: 14px; margin-bottom: 8px; min-height: 20px;"></div>
                    <div id="display-value" style="color: #fff; font-size: 32px; font-weight: 300;">${this.displayValue}</div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; flex: 1;">
                    <button class="calc-btn clear" data-action="clear">C</button>
                    <button class="calc-btn function" data-action="sign">±</button>
                    <button class="calc-btn function" data-action="percent">%</button>
                    <button class="calc-btn operator" data-operator="/">÷</button>
                    
                    <button class="calc-btn number" data-number="7">7</button>
                    <button class="calc-btn number" data-number="8">8</button>
                    <button class="calc-btn number" data-number="9">9</button>
                    <button class="calc-btn operator" data-operator="*">×</button>
                    
                    <button class="calc-btn number" data-number="4">4</button>
                    <button class="calc-btn number" data-number="5">5</button>
                    <button class="calc-btn number" data-number="6">6</button>
                    <button class="calc-btn operator" data-operator="-">−</button>
                    
                    <button class="calc-btn number" data-number="1">1</button>
                    <button class="calc-btn number" data-number="2">2</button>
                    <button class="calc-btn number" data-number="3">3</button>
                    <button class="calc-btn operator" data-operator="+">+</button>
                    
                    <button class="calc-btn number zero" data-number="0">0</button>
                    <button class="calc-btn number" data-number=".">.</button>
                    <button class="calc-btn equals" data-action="equals">=</button>
                </div>
            </div>
        `;

        this.styleButtons();
    }

    styleButtons() {
        const style = document.createElement('style');
        style.textContent = `
            .calc-btn {
                border: none;
                border-radius: 8px;
                font-size: 20px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.1s ease;
                font-family: inherit;
            }
            .calc-btn:active {
                transform: scale(0.95);
            }
            .calc-btn.number {
                background: rgba(255,255,255,0.1);
                color: #fff;
            }
            .calc-btn.number:hover {
                background: rgba(255,255,255,0.15);
            }
            .calc-btn.operator {
                background: rgba(99, 102, 241, 0.8);
                color: #fff;
                font-size: 24px;
            }
            .calc-btn.operator:hover {
                background: rgba(99, 102, 241, 1);
            }
            .calc-btn.function {
                background: rgba(255,255,255,0.15);
                color: #fff;
            }
            .calc-btn.function:hover {
                background: rgba(255,255,255,0.2);
            }
            .calc-btn.clear {
                background: rgba(239, 68, 68, 0.7);
                color: #fff;
            }
            .calc-btn.clear:hover {
                background: rgba(239, 68, 68, 0.9);
            }
            .calc-btn.equals {
                background: rgba(34, 197, 94, 0.8);
                color: #fff;
                font-size: 24px;
            }
            .calc-btn.equals:hover {
                background: rgba(34, 197, 94, 1);
            }
            .calc-btn.zero {
                grid-column: span 1;
            }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        this.addEventListener('click', (e) => {
            const btn = e.target.closest('.calc-btn');
            if (!btn) return;

            if (btn.dataset.number !== undefined) {
                this.inputDigit(btn.dataset.number);
            } else if (btn.dataset.operator) {
                this.inputOperator(btn.dataset.operator);
            } else if (btn.dataset.action) {
                this.performAction(btn.dataset.action);
            }

            this.updateDisplay();
        });
    }

    inputDigit(digit) {
        if (this.displayValue === 'Error') {
            this.displayValue = digit === '.' ? '0.' : digit;
            this.waitingForSecondOperand = false;
            return;
        }
        if (this.waitingForSecondOperand) {
            this.displayValue = digit;
            this.waitingForSecondOperand = false;
        } else {
            if (digit === '.') {
                if (this.displayValue.includes('.')) return;
                this.displayValue += '.';
            } else {
                this.displayValue = this.displayValue === '0' ? digit : this.displayValue + digit;
            }
        }
    }

    inputOperator(nextOperator) {
        const inputValue = parseFloat(this.displayValue);

        if (this.operator && this.waitingForSecondOperand) {
            this.operator = nextOperator;
            return;
        }

        if (this.firstOperand === null) {
            this.firstOperand = inputValue;
        } else if (this.operator) {
            const currentValue = this.firstOperand || 0;
            const result = this.calculate(currentValue, inputValue, this.operator);
            
            this.displayValue = String(this.roundResult(result));
            this.firstOperand = result;
        }

        this.waitingForSecondOperand = true;
        this.operator = nextOperator;
    }

    calculate(firstOperand, secondOperand, operator) {
        switch (operator) {
            case '+': return firstOperand + secondOperand;
            case '-': return firstOperand - secondOperand;
            case '*': return firstOperand * secondOperand;
            case '/': return secondOperand !== 0 ? firstOperand / secondOperand : 'Error';
            default: return secondOperand;
        }
    }

    roundResult(result) {
        if (typeof result === 'string') return result;
        return Math.round(result * 1000000000) / 1000000000;
    }

    performAction(action) {
        switch (action) {
            case 'clear':
                this.displayValue = '0';
                this.firstOperand = null;
                this.operator = null;
                this.waitingForSecondOperand = false;
                break;
            case 'sign':
                this.displayValue = String(-parseFloat(this.displayValue));
                break;
            case 'percent':
                this.displayValue = String(parseFloat(this.displayValue) / 100);
                break;
            case 'equals':
                if (this.operator) {
                    const inputValue = parseFloat(this.displayValue);
                    const result = this.calculate(this.firstOperand, inputValue, this.operator);
                    this.displayValue = String(this.roundResult(result));
                    this.firstOperand = null;
                    this.operator = null;
                    this.waitingForSecondOperand = false;
                }
                break;
        }
    }

    updateDisplay() {
        const displayValue = this.querySelector('#display-value');
        const displayHistory = this.querySelector('#display-history');
        
        displayValue.textContent = this.displayValue;
        
        if (this.operator && this.firstOperand !== null) {
            const opSymbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };
            displayHistory.textContent = `${this.firstOperand} ${opSymbols[this.operator] || this.operator}`;
        } else {
            displayHistory.textContent = '';
        }
    }
}

export default NovaCalculator;
