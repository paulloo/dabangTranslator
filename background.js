chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "translateSelection",
    title: "翻译选中文本",
    contexts: ["selection"]
  });
  
  chrome.contextMenus.create({
    id: "translatePage",
    title: "翻译整个页面",
    contexts: ["page"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translateSelection") {
    const selectedText = info.selectionText;
    // 在这里处理选中文本的翻译
    // 可以打开弹出窗口并填入选中的文本
    chrome.windows.create({
      url: `popup.html?text=${encodeURIComponent(selectedText)}`,
      type: 'popup',
      width: 400,
      height: 300
    });
  } else if (info.menuItemId === "translatePage") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        // 触发页面翻译
        document.dispatchEvent(new CustomEvent('translate-page'));
      }
    });
  }
}); 

// 修改字符统计相关功能
const MONTHLY_CHAR_LIMIT = 500000;

// 获取当前月份的key
function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}`;
}

// 重置字符统计
async function resetCharacterCount(apiKey) {
    const currentMonth = getCurrentMonthKey();
    const storageKey = `characterCount_${apiKey}`;
    await chrome.storage.local.set({ 
        [storageKey]: {
            month: currentMonth,
            count: 0
        }
    });
}

// 获取字符统计
async function getCharacterCount(apiKey) {
    const storageKey = `characterCount_${apiKey}`;
    const data = await chrome.storage.local.get(storageKey);
    const currentMonth = getCurrentMonthKey();
    
    // 如果是新的月份或新的API key，重置计数
    if (!data[storageKey] || data[storageKey].month !== currentMonth) {
        await resetCharacterCount(apiKey);
        return 0;
    }
    
    return data[storageKey].count;
}

// 更新字符统计
async function updateCharacterCount(apiKey, newChars) {
    const currentCount = await getCharacterCount(apiKey);
    const currentMonth = getCurrentMonthKey();
    const storageKey = `characterCount_${apiKey}`;
    
    await chrome.storage.local.set({
        [storageKey]: {
            month: currentMonth,
            count: currentCount + newChars
        }
    });
}

// 检查字符限制
async function checkCharacterLimit(apiKey, newChars) {
    const currentCount = await getCharacterCount(apiKey);
    return {
        allowed: (currentCount + newChars) <= MONTHLY_CHAR_LIMIT,
        current: currentCount,
        limit: MONTHLY_CHAR_LIMIT
    };
}

// 修改消息监听器
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateCharacterCount') {
        updateCharacterCount(message.apiKey, message.count)
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error }));
        return true;
    }
    
    if (message.action === 'checkCharacterLimit') {
        checkCharacterLimit(message.apiKey, message.count)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ allowed: false, error }));
        return true;
    }

    if (message.action === 'getCharacterCount') {
        getCharacterCount(message.apiKey)
            .then(count => sendResponse({ count }))
            .catch(error => sendResponse({ error }));
        return true;
    }
});

// 添加定时检查，每月重置
chrome.alarms.create('resetCharacterCount', {
    periodInMinutes: 60 * 24 // 每天检查一次
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'resetCharacterCount') {
        getCharacterCount(); // 这会在需要时自动重置
    }
}); 