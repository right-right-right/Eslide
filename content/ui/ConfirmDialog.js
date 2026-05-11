WPE.ConfirmDialog = class ConfirmDialog {
    constructor() {
        this._container = null;
        this._visible = false;
        this._resolve = null;
        this._titleEl = null;
        this._messageEl = null;
        this._okBtn = null;
        this._cancelBtn = null;
        this._saveBtn = null;
        this._hintEl = null;
    }

    _ensureDOM() {
        if (this._container) return;
        this._container = document.createElement('div');
        this._container.className = 'wpe-confirm-dialog';
        this._container.setAttribute('data-wpe-root', '');
        this._container.innerHTML = `
            <div class="wpe-confirm-mask"></div>
            <div class="wpe-confirm-box">
                <div class="wpe-confirm-title"></div>
                <div class="wpe-confirm-message"></div>
                <div class="wpe-confirm-hint"></div>
                <div class="wpe-confirm-actions">
                    <button class="wpe-confirm-btn wpe-confirm-cancel">${window.__WPE_I18N__ ? window.__WPE_I18N__.t('confirm.cancel') : '取消'}</button>
                    <button class="wpe-confirm-btn wpe-confirm-save"></button>
                    <button class="wpe-confirm-btn wpe-confirm-ok">${window.__WPE_I18N__ ? window.__WPE_I18N__.t('confirm.ok') : '确认'}</button>
                </div>
            </div>
        `;
        document.body.appendChild(this._container);

        this._titleEl = this._container.querySelector('.wpe-confirm-title');
        this._messageEl = this._container.querySelector('.wpe-confirm-message');
        this._okBtn = this._container.querySelector('.wpe-confirm-ok');
        this._cancelBtn = this._container.querySelector('.wpe-confirm-cancel');
        this._saveBtn = this._container.querySelector('.wpe-confirm-save');
        this._hintEl = this._container.querySelector('.wpe-confirm-hint');

        this._okBtn.addEventListener('click', () => this._resolveResult('ok'));
        this._cancelBtn.addEventListener('click', () => this._resolveResult('cancel'));
        this._saveBtn.addEventListener('click', () => this._resolveResult('save'));
        this._container.querySelector('.wpe-confirm-mask').addEventListener('click', () => this._resolveResult('cancel'));

        this._container.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                this._resolveResult('cancel');
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                this._resolveResult('save');
            }
        });
    }

    show(title, message, okText, cancelText, options = {}) {
        this._ensureDOM();
        this._titleEl.textContent = title || (window.__WPE_I18N__ ? window.__WPE_I18N__.t('confirm.defaultTitle') : '确认操作');
        this._messageEl.textContent = message || '';
        if (okText) this._okBtn.textContent = okText;
        if (cancelText) this._cancelBtn.textContent = cancelText;

        if (options.saveText) {
            this._saveBtn.textContent = options.saveText;
            this._saveBtn.style.display = '';
        } else {
            this._saveBtn.style.display = 'none';
        }

        if (options.hint) {
            this._hintEl.textContent = options.hint;
            this._hintEl.style.display = '';
        } else {
            this._hintEl.style.display = 'none';
        }

        this._visible = true;
        this._container.classList.add('wpe-confirm-visible');

        return new Promise((resolve) => {
            this._resolve = resolve;
            setTimeout(() => this._saveBtn.style.display !== 'none' ? this._saveBtn.focus() : this._okBtn.focus(), 50);
        });
    }

    _resolveResult(result) {
        if (!this._visible) return;
        this._visible = false;
        this._container.classList.remove('wpe-confirm-visible');
        if (this._resolve) {
            this._resolve(result);
            this._resolve = null;
        }
    }

    destroy() {
        if (this._container && this._container.parentNode) {
            this._container.parentNode.removeChild(this._container);
        }
        this._container = null;
        this._titleEl = null;
        this._messageEl = null;
        this._okBtn = null;
        this._cancelBtn = null;
        this._saveBtn = null;
        this._hintEl = null;
    }
}

WPE.confirmDialog = new WPE.ConfirmDialog();
window.__CONFIRM_DIALOG__ = WPE.confirmDialog;
