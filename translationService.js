// 翻译服务类
class TranslationService {
    constructor() {
        this.API_URL = 'https://translation.googleapis.com/language/translate/v2';
    }

    // 获取当前 API Key
    async getApiKey() {
        await window.configManager.init();
        const apiKey = window.configManager.getApiKey();
        if (!apiKey) {
            throw new Error('请先配置 API Key');
        }
        return apiKey;
    }

    // 单个文本翻译
    async translateText(text, targetLang = 'zh') {
        try {
            const apiKey = await this.getApiKey();
            const response = await fetch(`${this.API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    q: text,
                    target: targetLang
                })
            });
            
            const data = await response.json();
            return data.data.translations[0].translatedText;
        } catch (error) {
            console.error('翻译错误:', error);
            throw error;
        }
    }

    // 批量翻译
    async batchTranslate(texts, targetLang = 'zh', batchSize = 50) {
        const apiKey = await this.getApiKey();
        const results = [];
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const batchPromises = [];

            // 将每个批次分成更小的并发请求（每5个一组）
            const concurrentBatchSize = 5;
            for (let j = 0; j < batch.length; j += concurrentBatchSize) {
                const concurrentBatch = batch.slice(j, j + concurrentBatchSize);
                const promise = fetch(`${this.API_URL}?key=${apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        q: concurrentBatch,
                        target: targetLang
                    })
                }).then(response => response.json());
                
                batchPromises.push(promise);
            }

            const batchResults = await Promise.all(batchPromises);
            batchResults.forEach(data => {
                results.push(...data.data.translations.map(t => t.translatedText));
            });
            
            // 更新进度
            if (window.updateProgress) {
                window.updateProgress(Math.min(i + batchSize, texts.length), texts.length);
            }
            
            // 添加延时避免请求过快
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return results;
    }

    // 更新字符统计
    async updateCharacterCount(characters) {
        try {
            const apiKey = await this.getApiKey();
            await chrome.runtime.sendMessage({
                action: 'updateCharacterCount',
                count: characters,
                apiKey: apiKey
            });
        } catch (error) {
            console.warn('更新字符统计失败:', error);
        }
    }

    // 检查字符限制
    async checkCharacterLimit(chars) {
        try {
            const apiKey = await this.getApiKey();
            return await chrome.runtime.sendMessage({
                action: 'checkCharacterLimit',
                count: chars,
                apiKey: apiKey
            });
        } catch (error) {
            console.error('检查字符限制失败:', error);
            throw error;
        }
    }
}

// 使用全局变量导出
window.translationService = new TranslationService(); 