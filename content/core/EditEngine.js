WPE.EditEngine = class EditEngine {
    constructor() {
        this._bus = window.__EDITOR_EVENT_BUS__;
        this._selector = window.__TEXT_SELECTOR__;
        this._history = window.__ACTION_HISTORY__;
        this._htmlEditor = null;
        this._svgEditor = null;
        this._toolbar = null;
        this._active = false;
        this._currentEdit = null;
        this._abortController = null;

        this._bus.on('history:changed', () => this._broadcastStatus());
    }

    _t(key, params) {
        return window.__WPE_I18N__.t(key, params);
    }

    _broadcastStatus() {
        try {
            chrome.runtime.sendMessage({
                action: 'statusUpdate',
                data: {
                    active: this._active,
                    editCount: this._history.getEditCount(),
                    editableCount: document.querySelectorAll('.wpe-editable').length
                }
            });
        } catch (e) { }
    }

    init(htmlEditor, svgEditor, toolbar) {
        this._htmlEditor = htmlEditor;
        this._svgEditor = svgEditor;
        this._toolbar = toolbar;

        if (htmlEditor) htmlEditor.setEngine(this);
        if (svgEditor) svgEditor.setEngine(this);

        this._setupToolbarEvents();
        this._setupMessageListener();
    }

    activate() {
        if (this._active) return;

        this._active = true;
        const result = this._selector.markEditableElements();

        if (window.__DIFF_INDICATOR__) {
            window.__DIFF_INDICATOR__.init();
        }

        this._toolbar.show();

        this._attachBlockers();
        this._injectTooltipBlocker();
        this._injectLinkButtonBlocker();
        this._removeAllTitles();

        const restored = this._history.restoreFromSession();
        if (restored > 0) {
            window.__TOAST__.info(this._t('toast.restored', { count: restored }));
        }

        const totalEditable = (result.htmlElements?.length || 0) + (result.svgElements?.length || 0);
        if (totalEditable === 0) {
            this._showEmptyHint();
        }

        this._bus.emit('edit:activated');
        this._broadcastStatus();
    }

    _showEmptyHint() {
        const hint = document.createElement('div');
        hint.className = 'wpe-empty-hint';
        hint.setAttribute('data-wpe-root', '');
        hint.innerHTML = `
            <div class="wpe-empty-hint-icon">📝</div>
            <div>${this._t('empty.title')}</div>
            <div class="wpe-empty-hint-text">${this._t('empty.hint')}</div>
        `;
        document.body.appendChild(hint);

        setTimeout(() => {
            if (hint.parentNode) {
                hint.style.transition = 'opacity 0.5s ease';
                hint.style.opacity = '0';
                setTimeout(() => hint.remove(), 500);
            }
        }, 4000);
    }

    deactivate(force = false) {
        if (!this._active) return;

        this._finishCurrentEdit();

        if (!force && this._history.getEditCount() > 0) {
            this._confirmExit();
            return;
        }

        this._doDeactivate();
    }

    _confirmExit() {
        const dialog = window.__CONFIRM_DIALOG__;
        dialog.show(
            this._t('confirm.exit.title'),
            this._t('confirm.exit.message', { count: this._history.getEditCount() }),
            this._t('confirm.exit.ok'),
            this._t('confirm.exit.cancel'),
            {
                saveText: this._t('confirm.exit.save'),
                hint: this._t('confirm.exit.save.hint')
            }
        ).then(result => {
            if (result === 'save') {
                this.exportHTML();
                this._doDeactivate();
            } else if (result === 'ok') {
                this._doDeactivate();
                this._bus.emit('edit:deactivated-via-confirm');
            }
        });
    }

    _doDeactivate() {
        this._active = false;

        this._selector.unmarkEditableElements();

        this._history.saveToSession();

        if (window.__DIFF_INDICATOR__) {
            window.__DIFF_INDICATOR__.destroy();
        }

        this._toolbar.hide();

        this._detachBlockers();
        this._removeTooltipBlocker();
        this._removeLinkButtonBlocker();
        this._restoreTitles();

        this._bus.emit('edit:deactivated');
        this._broadcastStatus();
    }

    _injectTooltipBlocker() {
        if (document.getElementById('wpe-tooltip-blocker')) return;
        const style = document.createElement('style');
        style.id = 'wpe-tooltip-blocker';
        style.textContent = `
            [data-tippy-root]:not(.wpe-format-toolbar *):not(.wpe-toolbar *):not(.wpe-diff-popup *):not(.wpe-modified-marker *),
            .tippy-box:not(.wpe-format-toolbar *):not(.wpe-toolbar *):not(.wpe-diff-popup *),
            .tippy-content:not(.wpe-format-toolbar *):not(.wpe-toolbar *):not(.wpe-diff-popup *),
            [role="tooltip"]:not(.wpe-format-toolbar *):not(.wpe-toolbar *):not(.wpe-diff-popup *),
            .tooltip:not(.wpe-format-toolbar):not(.wpe-format-toolbar *):not(.wpe-toolbar *):not(.wpe-diff-popup *),
            .tooltiptext:not(.wpe-format-toolbar *):not(.wpe-toolbar *):not(.wpe-diff-popup *),
            .popover:not(.wpe-format-toolbar):not(.wpe-format-toolbar *):not(.wpe-toolbar *):not(.wpe-diff-popup *):not(.wpe-modified-marker *),
            .popper:not(.wpe-format-toolbar *):not(.wpe-toolbar *):not(.wpe-diff-popup *),
            [data-popper]:not(.wpe-format-toolbar *):not(.wpe-toolbar *):not(.wpe-diff-popup *),
            .v-popover:not(.wpe-format-toolbar *):not(.wpe-toolbar *):not(.wpe-diff-popup *),
            .el-tooltip__popper:not(.wpe-format-toolbar *):not(.wpe-toolbar *):not(.wpe-diff-popup *),
            .ant-tooltip:not(.wpe-format-toolbar *):not(.wpe-toolbar *):not(.wpe-diff-popup *),
            .rc-tooltip:not(.wpe-format-toolbar *):not(.wpe-toolbar *):not(.wpe-diff-popup *),
            .bs-tooltip:not(.wpe-format-toolbar *):not(.wpe-toolbar *):not(.wpe-diff-popup *),
            .q-tooltip:not(.wpe-format-toolbar *):not(.wpe-toolbar *):not(.wpe-diff-popup *) {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
            }
        `;
        document.head.appendChild(style);
    }

    _injectLinkButtonBlocker() {
        if (document.getElementById('wpe-link-button-blocker')) return;
        const style = document.createElement('style');
        style.id = 'wpe-link-button-blocker';
        style.textContent = `
            a:not(.wpe-toolbar *):not(.wpe-format-toolbar *):not(.wpe-overlay *):not(.wpe-confirm-dialog *):not(.wpe-toast-container *):not(.wpe-diff-popup *):not(.wpe-modified-marker *):not([data-wpe-export]),
            button:not(.wpe-toolbar *):not(.wpe-format-toolbar *):not(.wpe-overlay *):not(.wpe-confirm-dialog *):not(.wpe-toast-container *):not(.wpe-diff-popup *):not(.wpe-modified-marker *):not(.wpe-toolbar-btn):not(.wpe-format-btn):not(.wpe-overlay-btn):not(.wpe-confirm-btn):not(.wpe-diff-popup-close),
            [role="button"]:not(.wpe-toolbar *):not(.wpe-format-toolbar *):not(.wpe-overlay *):not(.wpe-confirm-dialog *):not(.wpe-toast-container *):not(.wpe-diff-popup *):not(.wpe-modified-marker *),
            input[type="submit"]:not(.wpe-toolbar *):not(.wpe-format-toolbar *):not(.wpe-overlay *):not(.wpe-confirm-dialog *),
            input[type="button"]:not(.wpe-toolbar *):not(.wpe-format-toolbar *):not(.wpe-overlay *):not(.wpe-confirm-dialog *),
            input[type="reset"]:not(.wpe-toolbar *):not(.wpe-format-toolbar *):not(.wpe-overlay *):not(.wpe-confirm-dialog *),
            summary:not(.wpe-toolbar *):not(.wpe-format-toolbar *):not(.wpe-overlay *):not(.wpe-confirm-dialog *) {
                cursor: default !important;
            }
            a.wpe-editable:not(.wpe-toolbar *):not(.wpe-format-toolbar *):not(.wpe-overlay *):not(.wpe-confirm-dialog *):not(.wpe-toast-container *):not(.wpe-diff-popup *):not(.wpe-modified-marker *):not([data-wpe-export]),
            button.wpe-editable:not(.wpe-toolbar *):not(.wpe-format-toolbar *):not(.wpe-overlay *):not(.wpe-confirm-dialog *):not(.wpe-toast-container *):not(.wpe-diff-popup *):not(.wpe-modified-marker *):not(.wpe-toolbar-btn):not(.wpe-format-btn):not(.wpe-overlay-btn):not(.wpe-confirm-btn):not(.wpe-diff-popup-close) {
                cursor: text !important;
                text-decoration: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    _removeLinkButtonBlocker() {
        const style = document.getElementById('wpe-link-button-blocker');
        if (style) style.remove();
    }

    _removeTooltipBlocker() {
        const style = document.getElementById('wpe-tooltip-blocker');
        if (style) style.remove();
    }

    _removeAllTitles() {
        const elements = document.querySelectorAll('[title]:not(.wpe-toolbar *):not(.wpe-format-toolbar *):not(.wpe-diff-popup *):not(.wpe-modified-marker)');
        elements.forEach(el => {
            if (el.title) {
                el.dataset.wpeTitleBackup = el.title;
                el.removeAttribute('title');
            }
        });
    }

    _restoreTitles() {
        const elements = document.querySelectorAll('[data-wpe-title-backup]');
        elements.forEach(el => {
            el.title = el.dataset.wpeTitleBackup;
            delete el.dataset.wpeTitleBackup;
        });
    }

    toggle() {
        if (this._active) {
            this.deactivate();
        } else {
            this.activate();
        }
        return this._active;
    }

    isActive() {
        return this._active;
    }

    getHistory() {
        return this._history;
    }

    exportHTML() {
        const clone = document.documentElement.cloneNode(true);

        this._cleanPluginArtifacts(clone);

        const html = clone.outerHTML;
        const doctype = '<!DOCTYPE html>\n';
        const fullHTML = doctype + html;

        const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.setAttribute('data-wpe-export', 'true');

        const currentUrl = window.location.href;
        const filename = currentUrl.startsWith('file:///')
            ? decodeURIComponent(currentUrl.split('/').pop())
            : (document.title || 'edited-page') + '.html';

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this._bus.emit('edit:exported');
        this._history.clearSession();
        window.__TOAST__.success(this._t('toast.exported'));
    }

    _cleanPluginArtifacts(root) {
        const removeSelectors = [
            '.wpe-toolbar',
            '.wpe-toolbar-spacer',
            '.wpe-overlay',
            '.wpe-format-toolbar',
            '.wpe-confirm-dialog',
            '.wpe-toast-container',
            '.wpe-empty-hint',
            '.wpe-modified-marker',
            '.wpe-diff-popup',
            '#wpe-tooltip-blocker',
            '#wpe-link-button-blocker'
        ];
        for (const sel of removeSelectors) {
            root.querySelectorAll(sel).forEach(el => el.remove());
        }

        const classSelectors = [
            '.wpe-editable', '.wpe-text-hint', '.wpe-editing',
            '.wpe-format-visible', '.wpe-format-active', '.wpe-format-arrow-below'
        ];
        for (const sel of classSelectors) {
            root.querySelectorAll(sel).forEach(el => {
                el.classList.remove(sel.substring(1));
                if (el.classList.length === 0) {
                    el.removeAttribute('class');
                }
            });
        }

        const dataAttrSelectors = [
            '[data-wpe-original]', '[data-wpe-modified]', '[data-wpe-export]',
            '[data-wpe-ignore]', '[data-wpe-marker-ref]', '[data-wpe-title-backup]'
        ];
        for (const sel of dataAttrSelectors) {
            root.querySelectorAll(sel).forEach(el => {
                const attrs = Array.from(el.attributes);
                for (const attr of attrs) {
                    if (attr.name.startsWith('data-wpe-')) {
                        el.removeAttribute(attr.name);
                    }
                }
            });
        }

        root.querySelectorAll('[contenteditable]').forEach(el => {
            const val = el.getAttribute('contenteditable');
            if (val === 'true' || val === 'false') {
                el.removeAttribute('contenteditable');
            }
        });

        const styleTags = root.querySelectorAll('style');
        for (const style of styleTags) {
            if (style.textContent.includes('wpe-')) {
                style.remove();
            }
        }

        const linkTags = root.querySelectorAll('link[rel="stylesheet"]');
        for (const link of linkTags) {
            const href = link.getAttribute('href') || '';
            if (href.includes('content.css') || href.includes('wpe-')) {
                link.remove();
            }
        }

    }

    _attachBlockers() {
        if (this._abortController) this._abortController.abort();
        this._abortController = new AbortController();
        const signal = this._abortController.signal;

        document.addEventListener('click', (e) => this._handleClick(e), { capture: true, signal });
        document.addEventListener('keydown', (e) => this._handleKeyDown(e), { capture: true, signal });
        document.addEventListener('submit', (e) => this._handleSubmit(e), { capture: true, signal });
        document.addEventListener('contextmenu', (e) => this._handleContextMenu(e), { capture: true, signal });
        document.addEventListener('mousedown', (e) => this._handleMouseDown(e), { capture: true, signal });
        document.addEventListener('mouseover', (e) => this._handleMouseOver(e), { capture: true, signal });
        document.addEventListener('mouseenter', (e) => this._handleMouseEnter(e), { capture: true, signal });
    }

    _detachBlockers() {
        if (this._abortController) {
            this._abortController.abort();
            this._abortController = null;
        }
    }

    _isOwnUI(target) {
        if (!target || typeof target.closest !== 'function') return false;
        const ownSelectors = [
            '.wpe-toolbar', '.wpe-overlay', '.wpe-editing-overlay',
            '.wpe-confirm-dialog', '.wpe-toast-container', '.wpe-empty-hint',
            '.wpe-format-toolbar', '.wpe-modified-marker', '.wpe-diff-popup',
            '[data-wpe-export]'
        ];
        for (const sel of ownSelectors) {
            try {
                if (target.closest(sel)) return true;
            } catch (e) {
                return false;
            }
        }
        return false;
    }

    _isInteractiveElement(target) {
        if (!target || typeof target.closest !== 'function') return false;
        const interactiveSelectors = [
            'a', 'button', 'summary',
            '[role="button"]', '[role="link"]',
            'input[type="submit"]', 'input[type="button"]', 'input[type="reset"]',
            'input[type="radio"]', 'input[type="checkbox"]'
        ];
        for (const sel of interactiveSelectors) {
            try {
                if (target.closest(sel)) return true;
            } catch (e) {
                return false;
            }
        }
        return false;
    }

    _handleClick(e) {
        if (!this._active) return;

        if (this._isOwnUI(e.target)) return;

        const result = this._selector.getClickedEditable(e.target);

        if (this._isInteractiveElement(e.target)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            if (result) {
                if (this._currentEdit) {
                    if (result.element !== this._currentEdit.element) {
                        this._finishCurrentEdit(false);
                    } else {
                        return;
                    }
                }
                this._currentEdit = result;
                if (result.type === 'html') {
                    this._htmlEditor.startEdit(result.element, e);
                    this._toolbar.setEditingHint(this._t('toolbar.hint.editing.html'));
                } else if (result.type === 'svg') {
                    this._svgEditor.startEdit(result.element, e);
                    this._toolbar.setEditingHint(this._t('toolbar.hint.editing.svg'));
                }
            } else {
                if (this._currentEdit) {
                    this._finishCurrentEdit(true);
                }
            }
            return;
        }

        if (this._currentEdit) {
            if (!result || result.element !== this._currentEdit.element) {
                this._finishCurrentEdit(!result);
            } else {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return;
            }
        }

        if (!result) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            this._clearSelection();
            return;
        }

        this._currentEdit = result;

        if (result.type === 'html') {
            this._htmlEditor.startEdit(result.element, e);
            this._toolbar.setEditingHint(this._t('toolbar.hint.editing.html'));
        } else if (result.type === 'svg') {
            this._svgEditor.startEdit(result.element, e);
            this._toolbar.setEditingHint(this._t('toolbar.hint.editing.svg'));
        }
    }

    _handleKeyDown(e) {
        if (!this._active) return;

        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                this._finishCurrentEdit();
                this._history.undo();
                return;
            }
            if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
                e.preventDefault();
                e.stopPropagation();
                this._finishCurrentEdit();
                this._history.redo();
                return;
            }
            if (e.key.toLowerCase() === 's' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                this._finishCurrentEdit();
                this.exportHTML();
                return;
            }
        }

        if (e.key === 'Escape') {
            if (window.__DIFF_INDICATOR__ && window.__DIFF_INDICATOR__.isPopupOpen()) {
                window.__DIFF_INDICATOR__.closePopup();
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            if (this._currentEdit) {
                const save = this._currentEdit.type === 'html';
                this._finishCurrentEdit(true, save);
                e.preventDefault();
                e.stopPropagation();
            } else {
                this.deactivate();
            }
            return;
        }

        if (e.key === 'Tab' && !this._currentEdit) {
            e.preventDefault();
            e.stopPropagation();
            this._focusNextEditable(!e.shiftKey);
            return;
        }
    }

    _handleSubmit(e) {
        if (!this._active) return;
        if (this._isOwnUI(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
    }

    _handleContextMenu(e) {
        if (!this._active) return;
        if (this._isOwnUI(e.target)) return;
        if (this._currentEdit && this._currentEdit.element.contains(e.target)) return;
        e.preventDefault();
    }

    _handleMouseDown(e) {
        if (!this._active) return;
        if (this._isOwnUI(e.target)) return;
        const result = this._selector.getClickedEditable(e.target);
        if (result) {
            if (this._currentEdit && result.element !== this._currentEdit.element) {
                this._finishCurrentEdit(false);
            }
            if (this._isInteractiveElement(e.target)) {
                e.preventDefault();
            }
            return;
        }
        if (this._isInteractiveElement(e.target)) {
            e.preventDefault();
            e.stopPropagation();
            if (this._currentEdit) {
                this._finishCurrentEdit(true);
            }
            return;
        }
        if (this._currentEdit) {
            this._finishCurrentEdit(true);
        }
        e.preventDefault();
    }

    _handleMouseOver(e) {
        if (!this._active) return;
        if (this._isOwnUI(e.target)) return;

        e.stopPropagation();

        const target = e.target;
        if (!target || target.nodeType !== Node.ELEMENT_NODE) return;
        if (target.title) {
            target.dataset.wpeTitleBackup = target.title;
            target.removeAttribute('title');
        }
    }

    _handleMouseEnter(e) {
        if (!this._active) return;
        if (this._isOwnUI(e.target)) return;
        e.stopPropagation();
    }

    _finishCurrentEdit(clearSelection = true, save = true) {
        if (!this._currentEdit) return;

        if (this._currentEdit.type === 'html') {
            this._htmlEditor.finishEdit(save);
        } else if (this._currentEdit.type === 'svg') {
            this._svgEditor.finishEdit(save);
        }

        this._currentEdit = null;
        this._toolbar.clearEditingHint();
        if (clearSelection) {
            this._clearSelection();
        }
    }

    _clearSelection() {
        const selection = window.getSelection();
        if (selection) {
            selection.removeAllRanges();
        }
        if (document.activeElement && document.activeElement !== document.body) {
            try {
                document.activeElement.blur();
            } catch (e) { }
        }
        if (window.__FORMAT_TOOLBAR__) {
            window.__FORMAT_TOOLBAR__.hide();
            window.__FORMAT_TOOLBAR__.deactivate();
        }
    }

    clearCurrentEdit() {
        this._currentEdit = null;
    }

    _focusNextEditable(forward) {
        const allEditable = document.querySelectorAll('.wpe-editable');
        if (allEditable.length === 0) return;

        const current = document.activeElement;
        let currentIndex = -1;

        for (let i = 0; i < allEditable.length; i++) {
            if (allEditable[i] === current || allEditable[i].contains(current)) {
                currentIndex = i;
                break;
            }
        }

        let nextIndex;
        if (forward) {
            nextIndex = (currentIndex + 1) % allEditable.length;
        } else {
            nextIndex = currentIndex <= 0 ? allEditable.length - 1 : currentIndex - 1;
        }

        const nextEl = allEditable[nextIndex];
        nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const fakeEvent = new MouseEvent('click', {
            clientX: nextEl.getBoundingClientRect().left + 10,
            clientY: nextEl.getBoundingClientRect().top + 10,
            bubbles: true
        });

        if (nextEl.closest && nextEl.closest('svg') && nextEl.tagName.toLowerCase() === 'text') {
            this._currentEdit = { element: nextEl, type: 'svg' };
            this._svgEditor.startEdit(nextEl, fakeEvent);
        } else {
            this._currentEdit = { element: nextEl, type: 'html' };
            this._htmlEditor.startEdit(nextEl, fakeEvent);
        }
    }

    _setupToolbarEvents() {
        this._toolbar.onClickUndo(() => {
            this._finishCurrentEdit();
            const record = this._history.undo();
            if (record) {
                this._bus.emit('edit:undone', record);
            }
        });

        this._toolbar.onClickRedo(() => {
            this._finishCurrentEdit();
            const record = this._history.redo();
            if (record) {
                this._bus.emit('edit:redone', record);
            }
        });

        this._toolbar.onClickReset(() => {
            this._finishCurrentEdit();
            if (this._history.getEditCount() === 0) return;

            const dialog = window.__CONFIRM_DIALOG__;
            dialog.show(
                this._t('confirm.reset.title'),
                this._t('confirm.reset.message', { count: this._history.getEditCount() }),
                this._t('confirm.reset.ok'),
                this._t('confirm.cancel')
            ).then(result => {
                if (result === 'ok') {
                    this._history.resetAll();
                    window.__TOAST__.info(this._t('toast.resetAll'));
                }
            });
        });

        this._toolbar.onClickExport(() => {
            this._finishCurrentEdit();
            this.exportHTML();
        });

        this._bus.on('toolbar:exit', () => {
            this.deactivate();
        });
    }

    _setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.action) {
                case 'ping':
                    sendResponse({ pong: true });
                    return;
                case 'toggleEdit':
                    if (this._active && this._history.getEditCount() > 0) {
                        this._finishCurrentEdit();
                        this._confirmExit();
                        sendResponse({ active: true, pending: true });
                    } else {
                        const active = this.toggle();
                        sendResponse({ active });
                    }
                    break;
                case 'activateEdit':
                    this.activate();
                    sendResponse({ active: true });
                    break;
                case 'deactivateEdit':
                    this.deactivate(true);
                    sendResponse({ active: false });
                    break;
                case 'getStatus':
                    sendResponse({
                        active: this._active,
                        editCount: this._history.getEditCount(),
                        editableCount: document.querySelectorAll('.wpe-editable').length
                    });
                    break;
                case 'exportHTML':
                    this.exportHTML();
                    sendResponse({ success: true });
                    break;
                default:
                    sendResponse({ error: 'Unknown action' });
            }
            return true;
        });
    }
}

WPE.engine = new WPE.EditEngine();
window.__EDIT_ENGINE__ = WPE.engine;
