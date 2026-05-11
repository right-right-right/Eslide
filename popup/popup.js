const i18nMessages = {
    'zh-CN': {
        'popup.toggle.enter': '进入编辑模式',
        'popup.toggle.exit': '退出编辑模式',
        'popup.status.off': '未激活 — 点击上方按钮开始',
        'popup.status.on': '编辑中 — 点击幻灯片文字即可修改',
        'popup.error.inject': '无法加载编辑器，请刷新幻灯片后重试',
        'popup.error.connect': '无法连接到幻灯片，请刷新后重试',
        'popup.error.restricted': '此幻灯片不支持编辑（浏览器内部页面无法注入脚本）',
        'popup.error.export': '导出失败，请刷新后重试',
        'popup.export.title': '导出修改后的HTML文件',
        'popup.title': '幻灯片文字编辑器',
        'popup.export': '导出 HTML',
        'popup.stats.edits': '修改数',
        'popup.stats.editable': '可编辑',
        'popup.tips.title': '操作提示',
        'popup.tips.click': '<kbd>点击</kbd> 幻灯片中的文字即可编辑',
        'popup.tips.undo': '<kbd>Ctrl+Z</kbd> 撤销 · <kbd>Ctrl+Y</kbd> 重做',
        'popup.tips.esc': '<kbd>Esc</kbd> 取消当前编辑 / 退出编辑模式',
        'popup.tips.tab': '<kbd>Tab</kbd> 跳转到下一个可编辑文字',
        'popup.tips.export': '<kbd>Ctrl+S</kbd> 导出 HTML 文件'
    },
    'en': {
        'popup.toggle.enter': 'Enter Edit Mode',
        'popup.toggle.exit': 'Exit Edit Mode',
        'popup.status.off': 'Inactive — Click the button above to start',
        'popup.status.on': 'Editing — Click text on the slide to modify',
        'popup.error.inject': 'Failed to load editor, please refresh and retry',
        'popup.error.connect': 'Cannot connect to slide, please refresh and retry',
        'popup.error.restricted': 'This slide cannot be edited (browser internal pages are restricted)',
        'popup.error.export': 'Export failed, please refresh and retry',
        'popup.export.title': 'Export modified HTML file',
        'popup.title': 'Slide Text Editor',
        'popup.export': 'Export HTML',
        'popup.stats.edits': 'Edits',
        'popup.stats.editable': 'Editable',
        'popup.tips.title': 'Tips',
        'popup.tips.click': '<kbd>Click</kbd> text on the slide to edit',
        'popup.tips.undo': '<kbd>Ctrl+Z</kbd> Undo · <kbd>Ctrl+Y</kbd> Redo',
        'popup.tips.esc': '<kbd>Esc</kbd> Cancel edit / Exit edit mode',
        'popup.tips.tab': '<kbd>Tab</kbd> Jump to next editable text',
        'popup.tips.export': '<kbd>Ctrl+S</kbd> Export HTML file'
    }
};

function detectLocale() {
    try {
        const uiLocale = chrome.i18n.getUILanguage();
        if (uiLocale) {
            const lang = uiLocale.toLowerCase();
            if (lang.startsWith('zh')) return 'zh-CN';
            return 'en';
        }
    } catch (e) { }
    const navLang = (navigator.language || navigator.userLanguage || 'zh-CN').toLowerCase();
    if (navLang.startsWith('zh')) return 'zh-CN';
    return 'en';
}

function t(key, params) {
    const locale = detectLocale();
    const template = i18nMessages[locale]?.[key] || i18nMessages['en']?.[key] || key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, k) => params[k] !== undefined ? params[k] : `{${k}}`);
}

function applyI18nToDocument() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        el.innerHTML = t(key);
    });
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
        const attrDef = el.getAttribute('data-i18n-attr');
        const [attr, key] = attrDef.split(':');
        if (attr && key) {
            el.setAttribute(attr, t(key));
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    applyI18nToDocument();

    const toggleBtn = document.getElementById('toggleBtn');
    const exportBtn = document.getElementById('exportBtn');
    const statusBar = document.getElementById('statusBar');
    const editStats = document.getElementById('editStats');
    const editCountValue = document.getElementById('editCountValue');
    const editableCountValue = document.getElementById('editableCountValue');
    const toggleBtnText = toggleBtn.querySelector('.toggle-btn-text');
    const versionText = document.getElementById('versionText');

    try {
        versionText.textContent = 'v' + chrome.runtime.getManifest().version;
    } catch (e) {
        versionText.textContent = '';
    }

    let isActive = false;
    let scriptsInjected = false;

    const CONTENT_SCRIPT_FILES = [
        'content/core/I18n.js',
        'content/core/EventBus.js',
        'content/core/TextSelector.js',
        'content/core/ActionHistory.js',
        'content/core/EditEngine.js',
        'content/editors/HTMLEditor.js',
        'content/editors/SVGEditor.js',
        'content/ui/Overlay.js',
        'content/ui/FormatToolbar.js',
        'content/ui/ConfirmDialog.js',
        'content/ui/Toast.js',
        'content/ui/Toolbar.js',
        'content/ui/DiffIndicator.js',
        'content/index.js'
    ];

    function updateUI(active, editCount, editableCount) {
        isActive = active;
        if (active) {
            toggleBtn.className = 'toggle-btn toggle-btn-on';
            toggleBtnText.textContent = t('popup.toggle.exit');
            exportBtn.disabled = false;
            statusBar.className = 'status-bar status-on';
            statusBar.querySelector('.status-text').textContent = t('popup.status.on');
            editStats.style.display = 'flex';
            if (editCount !== undefined) editCountValue.textContent = editCount;
            if (editableCount !== undefined) editableCountValue.textContent = editableCount;
        } else {
            toggleBtn.className = 'toggle-btn toggle-btn-off';
            toggleBtnText.textContent = t('popup.toggle.enter');
            exportBtn.disabled = true;
            statusBar.className = 'status-bar status-off';
            statusBar.querySelector('.status-text').textContent = t('popup.status.off');
            editStats.style.display = 'none';
        }
    }

    async function getCurrentTab() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab;
    }

    const RESTRICTED_URL_PATTERNS = [
        /^chrome:\/\//i,
        /^chrome-extension:\/\//i,
        /^devtools:\/\//i,
        /^edge:\/\//i,
        /^about:/i,
        /^https:\/\/chrome\.google\.com\/webstore/i
    ];

    function isRestrictedUrl(url) {
        if (!url) return true;
        return RESTRICTED_URL_PATTERNS.some(pattern => pattern.test(url));
    }

    async function ensureScriptsInjected(tabId, tabUrl) {
        if (isRestrictedUrl(tabUrl)) {
            return 'restricted';
        }

        if (scriptsInjected) return true;

        try {
            const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
            if (response && response.pong) {
                scriptsInjected = true;
                return true;
            }
        } catch (e) { }

        try {
            await chrome.scripting.insertCSS({
                target: { tabId },
                files: ['content/content.css']
            });

            await chrome.scripting.executeScript({
                target: { tabId },
                files: CONTENT_SCRIPT_FILES
            });

            scriptsInjected = true;
            await new Promise(resolve => setTimeout(resolve, 150));
            return true;
        } catch (e) {
            console.error('[WPE] Script injection failed:', e);
        }

        return false;
    }

    async function sendMessageToTab(tabId, message) {
        try {
            return await chrome.tabs.sendMessage(tabId, message);
        } catch (e) {
            return null;
        }
    }

    async function queryStatus() {
        try {
            const tab = await getCurrentTab();
            if (!tab || !tab.id) return;

            if (isRestrictedUrl(tab.url)) {
                statusBar.querySelector('.status-text').textContent = t('popup.error.restricted');
                return;
            }

            const response = await sendMessageToTab(tab.id, { action: 'getStatus' });
            if (response && typeof response.active !== 'undefined') {
                scriptsInjected = true;
                updateUI(response.active, response.editCount, response.editableCount);
            }
        } catch (e) { }
    }

    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'statusUpdate') {
            const { active, editCount, editableCount } = message.data;
            updateUI(active, editCount, editableCount);
        }
    });

    toggleBtn.addEventListener('click', async () => {
        try {
            const tab = await getCurrentTab();
            if (!tab || !tab.id) return;

            const injected = await ensureScriptsInjected(tab.id, tab.url);
            if (injected === 'restricted') {
                statusBar.querySelector('.status-text').textContent = t('popup.error.restricted');
                return;
            }
            if (!injected) {
                statusBar.querySelector('.status-text').textContent = t('popup.error.inject');
                return;
            }

            const response = await sendMessageToTab(tab.id, { action: 'toggleEdit' });
            if (response && typeof response.active !== 'undefined') {
                updateUI(response.active);
            }
        } catch (e) {
            statusBar.querySelector('.status-text').textContent = t('popup.error.connect');
        }
    });

    exportBtn.addEventListener('click', async () => {
        try {
            const tab = await getCurrentTab();
            if (!tab || !tab.id) return;

            await sendMessageToTab(tab.id, { action: 'exportHTML' });
        } catch (e) {
            statusBar.querySelector('.status-text').textContent = t('popup.error.export');
        }
    });

    queryStatus();
});
