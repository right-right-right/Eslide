window.WPE = window.WPE || {};

WPE.I18n = class I18n {
    constructor() {
        this._locale = 'zh-CN';
        this._messages = {};
        this._initMessages();
        this._detectLocale();
    }

    _detectLocale() {
        try {
            const uiLocale = chrome.i18n.getUILanguage();
            if (uiLocale) {
                const lang = uiLocale.toLowerCase();
                if (lang.startsWith('zh')) {
                    this._locale = 'zh-CN';
                } else {
                    this._locale = 'en';
                }
            }
        } catch (e) {
            const navLang = (navigator.language || navigator.userLanguage || 'zh-CN').toLowerCase();
            if (navLang.startsWith('zh')) {
                this._locale = 'zh-CN';
            } else {
                this._locale = 'en';
            }
        }
    }

    t(key, params) {
        const template = this._messages[this._locale]?.[key] || this._messages['en']?.[key] || key;
        if (!params) return template;
        return template.replace(/\{(\w+)\}/g, (_, k) => params[k] !== undefined ? params[k] : `{${k}}`);
    }

    getLocale() {
        return this._locale;
    }

    _initMessages() {
        this._messages['zh-CN'] = {
            'popup.title': '幻灯片文字编辑器',
            'popup.toggle.enter': '进入编辑模式',
            'popup.toggle.exit': '退出编辑模式',
            'popup.export': '⬇ 导出 HTML',
            'popup.export.title': '导出修改后的HTML文件',
            'popup.status.off': '未激活 — 点击上方按钮开始',
            'popup.status.on': '编辑中 — 点击幻灯片文字即可修改',
            'popup.stats.edits': '修改数',
            'popup.stats.editable': '可编辑',
            'popup.tips.title': '📋 操作提示',
            'popup.tips.click': '<kbd>点击</kbd> 幻灯片中的文字即可编辑',
            'popup.tips.undo': '<kbd>Ctrl+Z</kbd> 撤销 · <kbd>Ctrl+Y</kbd> 重做',
            'popup.tips.esc': '<kbd>Esc</kbd> 取消当前编辑 / 退出编辑模式',
            'popup.tips.tab': '<kbd>Tab</kbd> 跳转到下一个可编辑文字',
            'popup.tips.export': '<kbd>Ctrl+S</kbd> 导出 HTML 文件',
            'popup.error.inject': '无法加载编辑器，请刷新幻灯片后重试',
            'popup.error.connect': '无法连接到幻灯片，请刷新后重试',
            'popup.error.export': '导出失败，请刷新后重试',

            'toolbar.title': '编辑模式',
            'toolbar.counter': '已修改 {count} 处',
            'toolbar.counter.zero': '已修改 0 处',
            'toolbar.hint.default': '点击文字编辑 · Ctrl+Z 撤销 · Esc 退出',
            'toolbar.hint.modified': '已修改 {count} 处 · Ctrl+Z 撤销 · Ctrl+S 导出',
            'toolbar.hint.redoable': 'Ctrl+Z 撤销 · Ctrl+Y 重做 · Ctrl+S 导出',
            'toolbar.hint.done': '修改完成 · Ctrl+S 导出 · Esc 退出',
            'toolbar.hint.editing.html': '编辑中 · 选中文本可格式化 · Esc 完成',
            'toolbar.hint.editing.svg': '编辑 SVG 文字 · Enter 确认 · Esc 取消',
            'toolbar.undo.title': '撤销 Ctrl+Z',
            'toolbar.redo.title': '重做 Ctrl+Y',
            'toolbar.reset.title': '全部还原',
            'toolbar.export.title': '导出 HTML Ctrl+S',
            'toolbar.collapse.title': '收起工具栏',
            'toolbar.expand.title': '展开工具栏',
            'toolbar.exit.title': '退出编辑',

            'confirm.cancel': '取消',
            'confirm.ok': '确认',
            'confirm.defaultTitle': '确认操作',
            'confirm.exit.title': '退出编辑模式',
            'confirm.exit.message': '当前有 {count} 处修改尚未保存，退出后修改将丢失。是否保存修改？',
            'confirm.exit.save': '保存并退出',
            'confirm.exit.ok': '直接退出',
            'confirm.exit.cancel': '继续编辑',
            'confirm.exit.save.hint': '💡 保存后，可将新的 HTML 文件替换掉原来的文件即可完成更新',
            'confirm.reset.title': '还原所有修改',
            'confirm.reset.message': '确定要还原全部 {count} 处修改吗？此操作不可撤销。',
            'confirm.reset.ok': '全部还原',
            'confirm.revert.title': '还原修改',
            'confirm.revert.message': '确定要将此元素还原为原始内容吗？',
            'confirm.revert.ok': '还原',

            'format.bold.title': '加粗 Ctrl+B',
            'format.italic.title': '斜体 Ctrl+I',
            'format.underline.title': '下划线 Ctrl+U',
            'format.strike.title': '删除线',
            'format.color.title': '文字颜色',
            'format.size.title': '字号',
            'format.size.custom.placeholder': '自定义',
            'format.size.custom.apply': '应用',

            'overlay.confirm': '✓ 确认',
            'overlay.cancel': '✗ 取消',

            'diff.title': '修改对比',
            'diff.close': '关闭',
            'diff.original': '原始内容',
            'diff.current': '当前内容',
            'diff.revert': '↩ 点击此处还原',

            'toast.restored': '已恢复 {count} 处编辑状态',
            'toast.exported': 'HTML 文件已导出',
            'toast.resetAll': '已还原所有修改',

            'empty.title': '当前幻灯片没有可编辑的文字',
            'empty.hint': '请尝试打开包含文字内容的幻灯片',
        };

        this._messages['en'] = {
            'popup.title': 'Slide Text Editor',
            'popup.toggle.enter': 'Enter Edit Mode',
            'popup.toggle.exit': 'Exit Edit Mode',
            'popup.export': '⬇ Export HTML',
            'popup.export.title': 'Export modified HTML file',
            'popup.status.off': 'Inactive — Click the button above to start',
            'popup.status.on': 'Editing — Click text on the slide to modify',
            'popup.stats.edits': 'Edits',
            'popup.stats.editable': 'Editable',
            'popup.tips.title': '📋 Tips',
            'popup.tips.click': '<kbd>Click</kbd> text on the slide to edit',
            'popup.tips.undo': '<kbd>Ctrl+Z</kbd> Undo · <kbd>Ctrl+Y</kbd> Redo',
            'popup.tips.esc': '<kbd>Esc</kbd> Cancel edit / Exit edit mode',
            'popup.tips.tab': '<kbd>Tab</kbd> Jump to next editable text',
            'popup.tips.export': '<kbd>Ctrl+S</kbd> Export HTML file',
            'popup.error.inject': 'Failed to load editor, please refresh and retry',
            'popup.error.connect': 'Cannot connect to slide, please refresh and retry',
            'popup.error.export': 'Export failed, please refresh and retry',

            'toolbar.title': 'Edit Mode',
            'toolbar.counter': '{count} edits',
            'toolbar.counter.zero': '0 edits',
            'toolbar.hint.default': 'Click text to edit · Ctrl+Z Undo · Esc Exit',
            'toolbar.hint.modified': '{count} edits · Ctrl+Z Undo · Ctrl+S Export',
            'toolbar.hint.redoable': 'Ctrl+Z Undo · Ctrl+Y Redo · Ctrl+S Export',
            'toolbar.hint.done': 'All done · Ctrl+S Export · Esc Exit',
            'toolbar.hint.editing.html': 'Editing · Select text to format · Esc Done',
            'toolbar.hint.editing.svg': 'Editing SVG text · Enter Confirm · Esc Cancel',
            'toolbar.undo.title': 'Undo Ctrl+Z',
            'toolbar.redo.title': 'Redo Ctrl+Y',
            'toolbar.reset.title': 'Reset All',
            'toolbar.export.title': 'Export HTML Ctrl+S',
            'toolbar.collapse.title': 'Collapse Toolbar',
            'toolbar.expand.title': 'Expand Toolbar',
            'toolbar.exit.title': 'Exit Edit',

            'confirm.cancel': 'Cancel',
            'confirm.ok': 'OK',
            'confirm.defaultTitle': 'Confirm',
            'confirm.exit.title': 'Exit Edit Mode',
            'confirm.exit.message': 'You have {count} unsaved edits. Changes will be lost if you exit. Save before exiting?',
            'confirm.exit.save': 'Save & Exit',
            'confirm.exit.ok': 'Exit Without Saving',
            'confirm.exit.cancel': 'Continue Editing',
            'confirm.exit.save.hint': '💡 After saving, you can replace the original HTML file with the new one to update',
            'confirm.reset.title': 'Reset All Changes',
            'confirm.reset.message': 'Reset all {count} edits? This cannot be undone.',
            'confirm.reset.ok': 'Reset All',
            'confirm.revert.title': 'Revert Change',
            'confirm.revert.message': 'Revert this element to its original content?',
            'confirm.revert.ok': 'Revert',

            'format.bold.title': 'Bold Ctrl+B',
            'format.italic.title': 'Italic Ctrl+I',
            'format.underline.title': 'Underline Ctrl+U',
            'format.strike.title': 'Strikethrough',
            'format.color.title': 'Text Color',
            'format.size.title': 'Font Size',
            'format.size.custom.placeholder': 'Custom',
            'format.size.custom.apply': 'Apply',

            'overlay.confirm': '✓ OK',
            'overlay.cancel': '✗ Cancel',

            'diff.title': 'Change Comparison',
            'diff.close': 'Close',
            'diff.original': 'Original',
            'diff.current': 'Current',
            'diff.revert': '↩ Click to revert',

            'toast.restored': 'Restored {count} edits',
            'toast.exported': 'HTML file exported',
            'toast.resetAll': 'All changes have been reset',

            'empty.title': 'No editable text on this slide',
            'empty.hint': 'Try opening a slide with text content',
        };
    }
};

WPE.i18n = new WPE.I18n();
window.__WPE_I18N__ = WPE.i18n;
