// 用于存储已翻译的节点，避免重复翻译
const translatedNodes = new WeakSet();

// 添加翻译状态控制
let isTranslating = false;
let shouldStop = false;

// 添加悬停翻译功能
let hoverTimeout;
let currentHoverElement = null;
let isCtrlPressed = false;

// 创建进度条
function createProgressBar() {
    const container = document.createElement('div');
    container.id = 'translation-progress-container';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 10000;
        display: none;
    `;

    const progress = document.createElement('div');
    progress.id = 'translation-progress';
    progress.style.cssText = `
        width: 200px;
        height: 20px;
        background: #f0f0f0;
        border-radius: 10px;
        overflow: hidden;
    `;

    const bar = document.createElement('div');
    bar.id = 'translation-progress-bar';
    bar.style.cssText = `
        width: 0%;
        height: 100%;
        background: #4CAF50;
        transition: width 0.3s;
    `;

    const text = document.createElement('div');
    text.id = 'translation-progress-text';
    text.style.cssText = `
        margin-top: 5px;
        text-align: center;
        font-size: 12px;
    `;

    progress.appendChild(bar);
    container.appendChild(progress);
    container.appendChild(text);
    document.body.appendChild(container);
}

// 更新进度条
function updateProgress(current, total) {
    const container = document.getElementById('translation-progress-container');
    const bar = document.getElementById('translation-progress-bar');
    const text = document.getElementById('translation-progress-text');
    
    if (container && bar && text) {
        container.style.display = 'block';
        const percentage = Math.min((current / total) * 100, 100);
        bar.style.width = `${percentage}%`;
        text.textContent = `翻译进度: ${Math.round(percentage)}% (${current}/${total})`;
    }
}

// 创建悬停翻译提示
function createHoverTip() {
    const tip = document.createElement('div');
    tip.id = 'translation-hover-tip';
    tip.style.cssText = `
        position: fixed;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        z-index: 10000;
        display: none;
    `;
    tip.textContent = '按住 Ctrl 键翻译';
    document.body.appendChild(tip);
    return tip;
}

// 更新提示位置
function updateTipPosition(e) {
    const tip = document.getElementById('translation-hover-tip');
    if (tip) {
        tip.style.left = `${e.clientX + 10}px`;
        tip.style.top = `${e.clientY + 10}px`;
    }
}

// 修改处理悬停翻译的函数
async function handleHoverTranslation(element) {
    if (!element) return;

    // 获取当前节点的父元素
    const parentElement = element.parentElement;
    if (!parentElement) return;

    // 如果已经翻译过，则删除翻译内容
    if (translatedNodes.has(parentElement)) {
        // 查找并删除翻译节点
        const nextElement = parentElement.nextElementSibling;
        if (nextElement && nextElement.classList.contains('translation-container')) {
            nextElement.remove();
            translatedNodes.delete(parentElement);
        }
        return;
    }

    const text = element.textContent.trim();
    if (!shouldTranslateText(text)) return;

    try {
        // 检查字符限制
        const canTranslate = await translationService.checkCharacterLimit(text.length);
        if (!canTranslate.allowed) {
            alert(`本月翻译字符已达到上限（${canTranslate.current}/500000）。\n下个月初重置额度。`);
            return;
        }

        // 显示进度条
        const progressContainer = document.getElementById('translation-progress-container');
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }

        // 翻译文本
        const translatedText = await translationService.translateText(text);
        
        // 更新字符统计
        await translationService.updateCharacterCount(text.length);

        // 创建并插入翻译元素
        const translatedElement = createTranslatedElement(element, translatedText);
        if (translatedElement) {
            parentElement.after(translatedElement);
            translatedNodes.add(parentElement);
        }

        // 延迟隐藏进度条
        setTimeout(() => {
            if (progressContainer) {
                progressContainer.style.display = 'none';
            }
        }, 1000);
    } catch (error) {
        console.error('悬停翻译失败:', error);
    }
}

// 修改事件监听器
document.addEventListener('keydown', (e) => {
    // 只在单独按下 Ctrl 键时触发，忽略其他组合键
    if (e.key === 'Control' && !e.altKey && !e.shiftKey && !e.metaKey) {
        isCtrlPressed = true;
        if (currentHoverElement) {
            const tip = document.getElementById('translation-hover-tip');
            if (tip) {
                // 检查当前元素是否已翻译，显示不同的提示文本
                let parentElement = currentHoverElement.parentElement;
                if (parentElement && translatedNodes.has(parentElement)) {
                    tip.textContent = '按住 Ctrl 键移除翻译';
                } else {
                    tip.textContent = '按住 Ctrl 键翻译';
                }
                tip.style.display = 'block';
                updateTipPosition(e);
            }
        }
    } else {
        // 如果按下了其他键，取消翻译状态
        isCtrlPressed = false;
        const tip = document.getElementById('translation-hover-tip');
        if (tip) {
            tip.style.display = 'none';
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'Control' && isCtrlPressed) {  // 确保是通过我们的逻辑设置的 Ctrl 状态
        isCtrlPressed = false;
        const tip = document.getElementById('translation-hover-tip');
        if (tip) {
            tip.style.display = 'none';
            // 重置提示文本
            tip.textContent = '按住 Ctrl 键翻译';
        }
        // 在松开 Ctrl 键时执行翻译或移除翻译
        if (currentHoverElement) {
            // 获取实际的文本节点
            let textNode = currentHoverElement;
            // 如果当前元素不是文本节点，尝试找到其中的第一个文本节点
            if (currentHoverElement.nodeType !== Node.TEXT_NODE) {
                const walker = document.createTreeWalker(
                    currentHoverElement,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );
                textNode = walker.firstChild();
            }
            if (textNode) {
                handleHoverTranslation(textNode);
            }
        }
    }
});

// 修改 mouseover 事件监听器
document.addEventListener('mouseover', (e) => {
    const target = e.target;
    if (target === currentHoverElement) return;

    currentHoverElement = target;
    clearTimeout(hoverTimeout);

    // 只在单独按住 Ctrl 键时显示提示
    if (isCtrlPressed && !e.altKey && !e.shiftKey && !e.metaKey) {
        const tip = document.getElementById('translation-hover-tip');
        if (tip) {
            // 检查当前元素是否已翻译，显示不同的提示文本
            let parentElement = target.parentElement;
            if (parentElement && translatedNodes.has(parentElement)) {
                tip.textContent = '按住 Ctrl 键移除翻译';
            } else {
                tip.textContent = '按住 Ctrl 键翻译';
            }
            tip.style.display = 'block';
            updateTipPosition(e);
        }
    }
});

document.addEventListener('mouseout', () => {
    currentHoverElement = null;
    clearTimeout(hoverTimeout);
    const tip = document.getElementById('translation-hover-tip');
    if (tip) {
        tip.style.display = 'none';
    }
});

document.addEventListener('mousemove', updateTipPosition);

// 检查文本是否需要翻译（包含中文则不翻译）
function shouldTranslateText(text) {
    // 移除空白字符后检查是否为空
    if (!text || !text.trim()) return false;
    
    // 检查是否包含中文字符
    const chineseRegex = /[\u4e00-\u9fa5]/;
    if (chineseRegex.test(text)) return false;
    
    // 检查是否只包含数字、符号等
    const meaningfulTextRegex = /[a-zA-Z]{2,}/;
    if (!meaningfulTextRegex.test(text)) return false;

    // 检查是否是 Vue 相关的特殊文本
    if (text.includes('{{') || text.includes('}}')) return false;
    if (text.includes('v-') || text.includes('@') || text.includes(':')) return false;

    return true;
}

// 创建翻译后的显示元素
function createTranslatedElement(originalNode, translatedText) {
    try {
        // 检查是否可以安全地操作这个节点
        if (!originalNode || !originalNode.parentElement) {
            return null;
        }

        // 创建一个与原节点的父元素相同类型的元素
        const originalParent = originalNode.parentElement;
        const container = document.createElement(originalParent.tagName);
        
        // 复制所有属性
        Array.from(originalParent.attributes).forEach(attr => {
            try {
                container.setAttribute(attr.name, attr.value);
            } catch (e) {
                // 忽略无法复制的属性
            }
        });

        // 添加translation-container类，但保留原有类名
        container.className = (container.className || '') + ' translation-container';
        
        // 复制原始元素的样式
        const originalStyles = window.getComputedStyle(originalParent);
        
        // 复制所有计算后的样式
        for (let style of originalStyles) {
            try {
                container.style[style] = originalStyles.getPropertyValue(style);
            } catch (e) {
                // 忽略无法复制的样式
            }
        }

        // 如果是链接，确保保留 href
        if (originalParent.tagName.toLowerCase() === 'a' && originalParent.href) {
            container.href = originalParent.href;
            // 复制其他重要的链接属性
            if (originalParent.target) container.target = originalParent.target;
            if (originalParent.rel) container.rel = originalParent.rel;
        }

        // 创建新的文本节点
        const textNode = document.createTextNode(translatedText);
        
        try {
            container.appendChild(textNode);
        } catch (e) {
            console.warn('无法添加文本节点，使用替代方法');
            container.textContent = translatedText;
        }

        return container;
    } catch (error) {
        console.warn('创建翻译元素失败:', error);
        return null;
    }
}

// 翻译页面函数
async function translatePage() {
    if (isTranslating) {
        shouldStop = true;
        return;
    }

    isTranslating = true;
    shouldStop = false;
    const translateButton = document.getElementById('translate-page-button');
    translateButton.textContent = '停止翻译';
    translateButton.style.backgroundColor = '#f44336';

    try {
        // 收集需要翻译的文本节点
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // 检查父元素是否存在
                    if (!node || !node.parentElement) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    // 排除脚本、样式和特殊标签
                    const tagName = node.parentElement.tagName.toLowerCase();
                    if (tagName === 'script' || 
                        tagName === 'style' || 
                        tagName === 'noscript' || 
                        tagName === 'iframe' ||
                        tagName === 'code' ||
                        tagName === 'pre') {
                        return NodeFilter.FILTER_REJECT;
                    }

                    // 检查是否是 Vue 相关元素
                    const className = node.parentElement.className || '';
                    if (typeof className === 'string' && (
                        className.includes('translation-container') ||
                        className.includes('v-') ||
                        className.includes('vue-')
                    )) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    // 检查特殊属性
                    if (node.parentElement.hasAttribute('v-') ||
                        node.parentElement.hasAttribute('@') ||
                        node.parentElement.hasAttribute(':')) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const nodesToTranslate = [];
        const textsToTranslate = [];
        
        while (walker.nextNode()) {
            const node = walker.currentNode;
            const text = node.textContent.trim();
            if (shouldTranslateText(text) && !translatedNodes.has(node)) {
                nodesToTranslate.push(node);
                textsToTranslate.push(text);
            }
        }

        if (textsToTranslate.length === 0) {
            alert('没有找到需要翻译的内容');
            return;
        }

        // 计算总字符数
        const totalChars = textsToTranslate.reduce((sum, text) => sum + text.length, 0);
        
        // 检查字符限制
        const canTranslate = await chrome.runtime.sendMessage({
            action: 'checkCharacterLimit',
            count: totalChars
        });

        if (!canTranslate.allowed) {
            alert(`本月翻译字符已达到上限（${canTranslate.current}/500000）。\n下个月初重置额度。`);
            return;
        }

        console.log(`找到 ${textsToTranslate.length} 个需要翻译的文本，共 ${totalChars} 个字符`);

        // 显示进度条容器
        const container = document.getElementById('translation-progress-container');
        if (container) {
            container.style.display = 'block';
        }

        // 批量翻译
        const translatedTexts = await translationService.batchTranslate(textsToTranslate);

        // 更新字符统计
        await translationService.updateCharacterCount(totalChars);

        // 将翻译结果注入页面
        nodesToTranslate.forEach((node, index) => {
            try {
                const translatedElement = createTranslatedElement(node, translatedTexts[index]);
                if (!translatedElement) return;

                // 获取原始节点的父元素
                const parentElement = node.parentElement;
                if (!parentElement || !parentElement.parentElement) return;

                try {
                    // 尝试在原始元素后面插入翻译
                    parentElement.after(translatedElement);
                } catch (e) {
                    console.warn('无法直接插入翻译元素，尝试替代方法');
                    // 替代方法：使用 insertAdjacentElement
                    try {
                        parentElement.insertAdjacentElement('afterend', translatedElement);
                    } catch (e2) {
                        console.warn('所有插入方法都失败，跳过此节点');
                        return;
                    }
                }

                translatedNodes.add(node);
            } catch (error) {
                console.warn('处理节点失败:', error);
            }
        });

    } catch (error) {
        if (error.message !== '翻译已停止') {
            console.error('翻译过程出错:', error);
            alert('翻译过程出错: ' + error.message);
        }
    } finally {
        isTranslating = false;
        shouldStop = false;
        const translateButton = document.getElementById('translate-page-button');
        translateButton.textContent = '翻译页面';
        translateButton.style.backgroundColor = '#4CAF50';
        
        // 延迟隐藏进度条
        setTimeout(() => {
            const container = document.getElementById('translation-progress-container');
            if (container) {
                container.style.display = 'none';
            }
        }, 2000);
    }
}

// 添加翻译按钮
function addTranslateButton() {
    const button = document.createElement('button');
    button.id = 'translate-page-button';
    button.textContent = '翻译页面';
    button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        padding: 10px 20px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        transition: background-color 0.3s;
    `;
    
    button.addEventListener('click', translatePage);
    document.body.appendChild(button);
}

// 初始化
createProgressBar();
createHoverTip();
addTranslateButton();

// 监听来自后台的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'translate-page') {
        translatePage();
    }
}); 