document.addEventListener('DOMContentLoaded', async function() {
	const translateBtn = document.getElementById('translateBtn');
	const sourceText = document.getElementById('sourceText');
	const targetLang = document.getElementById('targetLang');
	const result = document.getElementById('result');
	let isTranslated = false;  // 添加翻译状态标记

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

	// 修改翻译按钮点击事件
	translateBtn.addEventListener('click', async () => {
		if (isTranslated) {
			// 如果已经翻译，则恢复原文
			result.textContent = '';
			translateBtn.textContent = '翻译';
			translateBtn.style.backgroundColor = '#4CAF50';
			isTranslated = false;
			return;
		}

		const text = sourceText.value.trim();
		if (!text) {
			alert('请输入要翻译的文本');
			return;
		}

		try {
			// 更改按钮状态
			translateBtn.disabled = true;
			translateBtn.textContent = '翻译中...';

			// 使用 translationService 进行翻译
			const translatedText = await window.translationService.translateText(text, targetLang.value);
			
			// 显示翻译结果
			result.textContent = translatedText;

			// 更新按钮状态
			translateBtn.textContent = '显示原文';
			translateBtn.style.backgroundColor = '#FFA500';  // 使用橙色表示可以切换回原文
			isTranslated = true;

			// 翻译完成后更新字符统计
			await updateCharacterCountDisplay();
		} catch (error) {
			result.textContent = '翻译出错: ' + error.message;
			translateBtn.textContent = '重试';
			translateBtn.style.backgroundColor = '#f44336';  // 错误时使用红色
		} finally {
			translateBtn.disabled = false;
		}
	});

	// 添加输入框的回车键监听
	sourceText.addEventListener('keypress', (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {  // 允许Shift+Enter换行
			e.preventDefault();
			translateBtn.click();
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