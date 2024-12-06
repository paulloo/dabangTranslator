document.addEventListener('DOMContentLoaded', async function() {
  const translateBtn = document.getElementById('translateBtn');
  const sourceText = document.getElementById('sourceText');
  const targetLang = document.getElementById('targetLang');
  const result = document.getElementById('result');

  // 初始化配置
  await window.configManager.init();
  
  // 显示当前配置
  const apiKeyInput = document.getElementById('apiKey');
  apiKeyInput.value = window.configManager.getApiKey();

  // 保存配置
  document.getElementById('saveConfig').addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      alert('请输入有效的 API Key');
      return;
    }

    await window.configManager.setApiKey(apiKey);
    alert('配置已保存');
  });

  translateBtn.addEventListener('click', async () => {
    const text = sourceText.value;
    const target = targetLang.value;
    
    try {
      // 这里使用 Google 翻译 API，你需要替换成你的 API key
      const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=AIzaSyCg9ir8FIN72Ulx_tWB-SmtPAyw61nEu8k`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          target: target
        })
      });
      
      const data = await response.json();
      result.textContent = data.data.translations[0].translatedText;
      
      // 翻译完成后更新显示
      await updateCharacterCountDisplay();
    } catch (error) {
      result.textContent = '翻译出错: ' + error.message;
    }
  });

  // 更新字符统计显示
  updateCharacterCountDisplay();
});

// 添加字符统计显示功能
async function updateCharacterCountDisplay() {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'getCharacterCount'
        });

        if (response.error) {
            console.error('获取字符统计失败:', response.error);
            return;
        }

        const count = response.count;
        const percentage = (count / 500000) * 100;
        
        document.getElementById('progress-fill').style.width = `${percentage}%`;
        document.getElementById('char-count').textContent = 
            `已使用：${count.toLocaleString()}/500000`;
    } catch (error) {
        console.error('更新字符统计显示失败:', error);
    }
} 