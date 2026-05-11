WPE.Overlay = class Overlay {
    constructor() {
        this._container = null;
        this._textarea = null;
        this._visible = false;
        this._config = null;
    }

    _ensureDOM() {
        if (this._container) return;
        this._container = document.createElement('div');
        this._container.className = 'wpe-overlay';
        this._container.setAttribute('data-wpe-root', '');
        this._container.innerHTML = `
      <div class="wpe-overlay-mask" data-wpe-action="cancel"></div>
      <div class="wpe-overlay-editor">
        <textarea class="wpe-overlay-textarea" rows="1"></textarea>
        <div class="wpe-overlay-actions">
          <button class="wpe-overlay-btn wpe-overlay-btn-confirm" data-wpe-action="confirm">${window.__WPE_I18N__ ? window.__WPE_I18N__.t('overlay.confirm') : '✓ 确认'}</button>
          <button class="wpe-overlay-btn wpe-overlay-btn-cancel" data-wpe-action="cancel">${window.__WPE_I18N__ ? window.__WPE_I18N__.t('overlay.cancel') : '✗ 取消'}</button>
        </div>
      </div>
    `;
        document.body.appendChild(this._container);

        this._textarea = this._container.querySelector('.wpe-overlay-textarea');

        this._container.addEventListener('click', (e) => {
            const action = e.target.dataset.wpeAction;
            if (action === 'confirm') {
                this._handleConfirm();
            } else if (action === 'cancel') {
                this._handleCancel();
            }
        });

        this._textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this._handleConfirm();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this._handleCancel();
            }
        });

        this._textarea.addEventListener('input', () => {
            this._autoResize();
        });
    }

    show(config) {
        this._ensureDOM();
        this._config = config;
        this._visible = true;

        this._textarea.value = config.text;
        this._textarea.style.fontSize = config.fontSize;
        this._textarea.style.fontFamily = config.fontFamily;
        this._textarea.style.fontWeight = config.fontWeight;
        this._textarea.style.fontStyle = config.fontStyle;
        this._textarea.style.color = config.fill;
        this._textarea.style.textAlign = config.textAlign;

        const editorEl = this._container.querySelector('.wpe-overlay-editor');
        editorEl.style.left = config.x + 'px';
        editorEl.style.top = config.y + 'px';
        editorEl.style.minWidth = config.width + 'px';

        this._container.classList.add('wpe-overlay-visible');

        setTimeout(() => {
            this._textarea.focus();
            this._textarea.select();
            this._autoResize();
        }, 50);
    }

    hide() {
        this._visible = false;
        this._config = null;
        if (this._container) {
            this._container.classList.remove('wpe-overlay-visible');
            this._textarea.value = '';
        }
    }

    isVisible() {
        return this._visible;
    }

    getText() {
        return this._textarea ? this._textarea.value : '';
    }

    _handleConfirm() {
        if (this._config && this._config.onConfirm) {
            this._config.onConfirm(this._textarea.value);
        }
        this.hide();
    }

    _handleCancel() {
        if (this._config && this._config.onCancel) {
            this._config.onCancel();
        }
        this.hide();
    }

    _autoResize() {
        if (!this._textarea) return;
        this._textarea.style.height = 'auto';
        this._textarea.style.height = (this._textarea.scrollHeight) + 'px';
    }

    destroy() {
        this.hide();
        if (this._container && this._container.parentNode) {
            this._container.parentNode.removeChild(this._container);
        }
        this._container = null;
        this._textarea = null;
    }
}

WPE.overlay = new WPE.Overlay();
window.__OVERLAY__ = WPE.overlay;
