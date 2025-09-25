// 共享JavaScript功能 - 所有模块通用

// 高亮JS初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化代码高亮
    if (typeof hljs !== 'undefined') {
        hljs.highlightAll();
    }

    // 同步主题
    syncThemeFromParent();

    // 监听主题变化
    setupThemeListener();
});

/**
 * 代码复制功能
 * @param {HTMLElement} button - 复制按钮元素
 */
function copyCode(button) {
    const codeBlock = button.closest('.code-block').querySelector('code');
    const text = codeBlock.textContent;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
            showCopySuccess(button);
        }).catch(function() {
            // 降级到传统方法
            fallbackCopy(text, button);
        });
    } else {
        // 降级到传统方法
        fallbackCopy(text, button);
    }
}

/**
 * 显示复制成功状态
 * @param {HTMLElement} button - 按钮元素
 */
function showCopySuccess(button) {
    const originalText = button.textContent;
    const originalBg = button.style.backgroundColor;

    button.textContent = '已复制';
    button.style.backgroundColor = '#10b981';

    setTimeout(() => {
        button.textContent = originalText;
        button.style.backgroundColor = originalBg;
    }, 2000);
}

/**
 * 降级复制方法（兼容性）
 * @param {string} text - 要复制的文本
 * @param {HTMLElement} button - 按钮元素
 */
function fallbackCopy(text, button) {
    // 创建临时文本区域
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);

    try {
        textarea.select();
        document.execCommand('copy');
        showCopySuccess(button);
    } catch (err) {
        console.error('复制失败:', err);
        // 可以在这里显示错误提示
        button.textContent = '复制失败';
        setTimeout(() => {
            button.textContent = '复制';
        }, 2000);
    } finally {
        document.body.removeChild(textarea);
    }
}

/**
 * 从父窗口同步主题
 */
function syncThemeFromParent() {
    try {
        if (window.parent && window.parent !== window) {
            const parentTheme = window.parent.document.body.getAttribute('data-theme');
            if (parentTheme) {
                document.body.setAttribute('data-theme', parentTheme);
                updateHighlightTheme(parentTheme);
            }
        }
    } catch (error) {
        // 跨域访问限制，忽略错误
        console.log('无法访问父窗口主题设置');
    }
}

/**
 * 设置主题监听器
 */
function setupThemeListener() {
    try {
        if (window.parent && window.parent !== window) {
            // 监听父窗口的主题变化
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                        const newTheme = window.parent.document.body.getAttribute('data-theme');
                        document.body.setAttribute('data-theme', newTheme || '');
                        updateHighlightTheme(newTheme);
                    }
                });
            });

            observer.observe(window.parent.document.body, {
                attributes: true,
                attributeFilter: ['data-theme']
            });
        }
    } catch (error) {
        // 跨域访问限制，忽略错误
        console.log('无法监听父窗口主题变化');
    }
}

/**
 * 更新代码高亮主题
 * @param {string} theme - 主题名称
 */
function updateHighlightTheme(theme) {
    const highlightTheme = document.getElementById('highlight-theme');
    if (highlightTheme) {
        if (theme === 'dark') {
            highlightTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
        } else {
            highlightTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
        }
    }
}

/**
 * 滚动到指定元素
 * @param {string} selector - CSS选择器
 * @param {number} offset - 偏移量（可选）
 */
function scrollToElement(selector, offset = 80) {
    const element = document.querySelector(selector);
    if (element) {
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

/**
 * 切换元素的显示/隐藏状态
 * @param {string} selector - CSS选择器
 * @param {string} displayType - 显示类型（可选，默认为'block'）
 */
function toggleElement(selector, displayType = 'block') {
    const element = document.querySelector(selector);
    if (element) {
        if (element.style.display === 'none' || !element.style.display) {
            element.style.display = displayType;
        } else {
            element.style.display = 'none';
        }
    }
}

/**
 * 检查元素是否在视窗内
 * @param {HTMLElement} element - 要检查的元素
 * @returns {boolean} 是否在视窗内
 */
function isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 限制时间（毫秒）
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 暴露全局函数
window.copyCode = copyCode;
window.scrollToElement = scrollToElement;
window.toggleElement = toggleElement;
window.isElementInViewport = isElementInViewport;
window.debounce = debounce;
window.throttle = throttle;