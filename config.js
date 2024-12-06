// 默认配置
const defaultConfig = {
    API_KEY: window.env?.API_KEY || '',
    API_URL: 'https://translation.googleapis.com/language/translate/v2'
};

// 配置管理类
class ConfigManager {
    constructor() {
        this.config = { ...defaultConfig };
    }

    async init() {
        try {
            const stored = await chrome.storage.local.get('translationConfig');
            if (stored.translationConfig) {
                this.config = { ...defaultConfig, ...stored.translationConfig };
            } else {
                // 如果没有存储的配置，使用环境变量中的默认值
                this.config = { ...defaultConfig };
                await this.saveConfig();
            }
        } catch (error) {
            console.error('加载配置失败:', error);
        }
    }

    async setApiKey(key) {
        this.config.API_KEY = key;
        await this.saveConfig();
    }

    getApiKey() {
        return this.config.API_KEY;
    }

    async saveConfig() {
        try {
            await chrome.storage.local.set({
                translationConfig: this.config
            });
        } catch (error) {
            console.error('保存配置失败:', error);
        }
    }
}

window.configManager = new ConfigManager(); 