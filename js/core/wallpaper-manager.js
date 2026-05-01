class WallpaperManager {
    constructor() {
        this.currentTimeOfDay = null;
        this.currentWeather = null;
        this.updateInterval = null;
        this.workspace = null;
        
        this.weatherTypes = ['sunny', 'cloudy', 'rainy', 'foggy'];
        this.weatherEmojis = {
            sunny: '☀️',
            cloudy: '☁️',
            rainy: '🌧️',
            foggy: '🌫️'
        };
    }

    init() {
        this.workspace = document.getElementById('workspace');
        this._setupTimeOfDay();
        this._setupWeather();
        this.applyWallpaper();
        this.startAutoUpdate();
    }

    _setupTimeOfDay() {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 12) {
            this.currentTimeOfDay = 'morning';
        } else if (hour >= 12 && hour < 18) {
            this.currentTimeOfDay = 'afternoon';
        } else {
            this.currentTimeOfDay = 'night';
        }
    }

    _setupWeather() {
        const randomWeather = this.weatherTypes[Math.floor(Math.random() * this.weatherTypes.length)];
        this.currentWeather = randomWeather;
    }

    getTimeOfDay() {
        return this.currentTimeOfDay;
    }

    getWeather() {
        return this.currentWeather;
    }

    getWeatherEmoji() {
        return this.weatherEmojis[this.currentWeather] || '☀️';
    }

    setWeather(weather) {
        if (this.weatherTypes.includes(weather)) {
            this.currentWeather = weather;
            this.applyWallpaper();
        }
    }

    getWallpaperConfig() {
        const configs = {
            morning: {
                sunny: {
                    background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 50%, #ff9a9e 100%)',
                    overlay: 'linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, transparent 100%)',
                    glow: '0 0 100px rgba(255, 182, 193, 0.3)'
                },
                cloudy: {
                    background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 50%, #d299c2 100%)',
                    overlay: 'linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, transparent 100%)',
                    glow: '0 0 80px rgba(168, 237, 234, 0.2)'
                },
                rainy: {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                    overlay: 'linear-gradient(to bottom, rgba(0,0,50,0.2) 0%, transparent 100%)',
                    glow: '0 0 60px rgba(102, 126, 234, 0.3)'
                },
                foggy: {
                    background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 50%, #a1c4fd 100%)',
                    overlay: 'linear-gradient(to bottom, rgba(255,255,255,0.3) 0%, transparent 100%)',
                    glow: '0 0 120px rgba(207, 222, 243, 0.4)'
                }
            },
            afternoon: {
                sunny: {
                    background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 30%, #c9ffbf 70%, #ffafbd 100%)',
                    overlay: 'linear-gradient(to bottom, rgba(255,255,255,0.05) 0%, transparent 100%)',
                    glow: '0 0 150px rgba(255, 182, 193, 0.4)'
                },
                cloudy: {
                    background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 30%, #fccb90 70%, #d57eeb 100%)',
                    overlay: 'linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, transparent 100%)',
                    glow: '0 0 100px rgba(168, 237, 234, 0.3)'
                },
                rainy: {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 30%, #6B73FF 70%, #000DFF 100%)',
                    overlay: 'linear-gradient(to bottom, rgba(0,0,80,0.25) 0%, transparent 100%)',
                    glow: '0 0 80px rgba(102, 126, 234, 0.4)'
                },
                foggy: {
                    background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 30%, #a1c4fd 70%, #c2e9fb 100%)',
                    overlay: 'linear-gradient(to bottom, rgba(255,255,255,0.25) 0%, transparent 100%)',
                    glow: '0 0 140px rgba(207, 222, 243, 0.35)'
                }
            },
            night: {
                sunny: {
                    background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
                    overlay: 'radial-gradient(ellipse at top, rgba(255,255,255,0.03) 0%, transparent 70%)',
                    glow: '0 0 200px rgba(48, 43, 99, 0.5)'
                },
                cloudy: {
                    background: 'linear-gradient(135deg, #232526 0%, #414345 50%, #232526 100%)',
                    overlay: 'radial-gradient(ellipse at top, rgba(255,255,255,0.05) 0%, transparent 70%)',
                    glow: '0 0 150px rgba(65, 67, 69, 0.4)'
                },
                rainy: {
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                    overlay: 'linear-gradient(to bottom, rgba(0,20,60,0.3) 0%, transparent 100%)',
                    glow: '0 0 180px rgba(15, 52, 96, 0.5)'
                },
                foggy: {
                    background: 'linear-gradient(135deg, #434343 0%, #000000 50%, #232526 100%)',
                    overlay: 'linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, transparent 100%)',
                    glow: '0 0 160px rgba(67, 67, 67, 0.3)'
                }
            }
        };

        const timeConfig = configs[this.currentTimeOfDay] || configs.afternoon;
        return timeConfig[this.currentWeather] || timeConfig.sunny;
    }

    applyWallpaper() {
        if (!this.workspace) return;

        const config = this.getWallpaperConfig();
        
        this.workspace.style.background = config.background;
        this.workspace.style.boxShadow = config.glow;
        this.workspace.style.transition = 'background 2s ease, box-shadow 2s ease';

        this._updateDesktopStyles();
    }

    _updateDesktopStyles() {
        const body = document.body;
        
        if (this.currentTimeOfDay === 'night') {
            body.classList.add('night-mode');
            body.classList.remove('day-mode');
        } else {
            body.classList.add('day-mode');
            body.classList.remove('night-mode');
        }
    }

    startAutoUpdate() {
        this.updateInterval = setInterval(() => {
            const oldTimeOfDay = this.currentTimeOfDay;
            const oldWeather = this.currentWeather;
            
            this._setupTimeOfDay();
            
            if (Math.random() < 0.05) {
                this._setupWeather();
            }

            if (oldTimeOfDay !== this.currentTimeOfDay || oldWeather !== this.currentWeather) {
                this.applyWallpaper();
                this._emitWallpaperChange();
            }
        }, 60000);
    }

    _emitWallpaperChange() {
        const event = new CustomEvent('wallpaper-changed', {
            detail: {
                timeOfDay: this.currentTimeOfDay,
                weather: this.currentWeather
            }
        });
        document.dispatchEvent(event);
    }

    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    forceUpdate() {
        this._setupTimeOfDay();
        this.applyWallpaper();
        this._emitWallpaperChange();
    }
}

const wallpaperManager = new WallpaperManager();
export default wallpaperManager;
