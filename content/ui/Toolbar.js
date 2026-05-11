WPE.Toolbar = class Toolbar {
  constructor() {
    this._container = null;
    this._visible = false;
    this._collapsed = false;
    this._undoBtn = null;
    this._redoBtn = null;
    this._resetBtn = null;
    this._exportBtn = null;
    this._counterEl = null;
    this._hintEl = null;
    this._collapseBtn = null;
    this._setupHistoryListener();
  }

  _t(key, params) {
    return window.__WPE_I18N__.t(key, params);
  }

  _createDOM() {
    if (this._container) return;

    this._container = document.createElement('div');
    this._container.className = 'wpe-toolbar';
    this._container.setAttribute('data-wpe-root', '');
    this._container.innerHTML = `
      <div class="wpe-toolbar-inner">
        <div class="wpe-toolbar-left">
          <span class="wpe-toolbar-status">
            <span class="wpe-toolbar-dot"></span>
            <span class="wpe-toolbar-title">${this._t('toolbar.title')}</span>
          </span>
          <span class="wpe-toolbar-counter">${this._t('toolbar.counter.zero')}</span>
        </div>
        <div class="wpe-toolbar-center">
          <span class="wpe-toolbar-hint">${this._t('toolbar.hint.default')}</span>
        </div>
        <div class="wpe-toolbar-right">
          <div class="wpe-toolbar-btn-group">
            <button class="wpe-toolbar-btn wpe-toolbar-undo" title="${this._t('toolbar.undo.title')}" disabled>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            </button>
            <button class="wpe-toolbar-btn wpe-toolbar-redo" title="${this._t('toolbar.redo.title')}" disabled>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            </button>
            <button class="wpe-toolbar-btn wpe-toolbar-reset" title="${this._t('toolbar.reset.title')}" disabled>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
            </button>
          </div>
          <span class="wpe-toolbar-sep"></span>
          <button class="wpe-toolbar-btn wpe-toolbar-export" title="${this._t('toolbar.export.title')}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button class="wpe-toolbar-btn wpe-toolbar-collapse" title="${this._t('toolbar.collapse.title')}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
          <button class="wpe-toolbar-btn wpe-toolbar-exit" title="${this._t('toolbar.exit.title')}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div class="wpe-toolbar-collapsed-btn" title="${this._t('toolbar.expand.title')}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </div>
    `;

    this._undoBtn = this._container.querySelector('.wpe-toolbar-undo');
    this._redoBtn = this._container.querySelector('.wpe-toolbar-redo');
    this._resetBtn = this._container.querySelector('.wpe-toolbar-reset');
    this._exportBtn = this._container.querySelector('.wpe-toolbar-export');
    this._counterEl = this._container.querySelector('.wpe-toolbar-counter');
    this._hintEl = this._container.querySelector('.wpe-toolbar-hint');
    this._collapseBtn = this._container.querySelector('.wpe-toolbar-collapse');

    this._container.querySelector('.wpe-toolbar-exit')
      .addEventListener('click', () => this._handleExit());

    this._collapseBtn.addEventListener('click', () => this.toggleCollapse());
    this._container.querySelector('.wpe-toolbar-collapsed-btn')
      .addEventListener('click', () => this.toggleCollapse());
  }

  toggleCollapse() {
    this._collapsed = !this._collapsed;
    if (this._container) {
      this._container.classList.toggle('wpe-toolbar-collapsed', this._collapsed);
    }
  }

  isCollapsed() {
    return this._collapsed;
  }

  onClickUndo(fn) { this._ensureDOM(); this._undoBtn.addEventListener('click', fn); }
  onClickRedo(fn) { this._ensureDOM(); this._redoBtn.addEventListener('click', fn); }
  onClickReset(fn) { this._ensureDOM(); this._resetBtn.addEventListener('click', fn); }
  onClickExport(fn) { this._ensureDOM(); this._exportBtn.addEventListener('click', fn); }

  _ensureDOM() {
    if (!this._container) {
      this._createDOM();
    }
  }

  updateHistoryState(state) {
    if (!this._container) return;

    this._undoBtn.disabled = !state.canUndo;
    this._redoBtn.disabled = !state.canRedo;
    this._resetBtn.disabled = state.editCount === 0;

    const count = state.editCount;
    const counterText = count > 0 ? this._t('toolbar.counter', { count }) : this._t('toolbar.counter.zero');

    if (this._counterEl) {
      this._counterEl.textContent = counterText;
      this._counterEl.classList.toggle('wpe-has-changes', count > 0);
    }

    this._updateHint(state);
  }

  _updateHint(state) {
    if (!this._hintEl) return;

    if (this._editingHint) {
      this._hintEl.textContent = this._editingHint;
      return;
    }

    const count = state.editCount;
    if (count === 0) {
      this._hintEl.textContent = this._t('toolbar.hint.default');
    } else if (state.canUndo && !state.canRedo) {
      this._hintEl.textContent = this._t('toolbar.hint.modified', { count });
    } else if (state.canRedo) {
      this._hintEl.textContent = this._t('toolbar.hint.redoable');
    } else {
      this._hintEl.textContent = this._t('toolbar.hint.done');
    }
  }

  setEditingHint(text) {
    this._editingHint = text;
    if (this._hintEl) {
      this._hintEl.textContent = text || this._t('toolbar.hint.default');
    }
  }

  clearEditingHint() {
    this._editingHint = null;
    if (this._hintEl) {
      this._hintEl.textContent = this._t('toolbar.hint.default');
    }
  }

  show() {
    if (!this._container) {
      this._createDOM();
    }
    if (!this._container.parentNode) {
      document.body.insertBefore(this._container, document.body.firstChild);
    }
    this._visible = true;
    this._container.classList.add('wpe-toolbar-visible');
  }

  hide() {
    this._visible = false;
    if (this._container) {
      this._container.classList.remove('wpe-toolbar-visible');
      if (this._container.parentNode) {
        this._container.parentNode.removeChild(this._container);
      }
    }
  }

  isVisible() { return this._visible; }

  setHint(text) {
    if (this._hintEl) this._hintEl.textContent = text;
  }

  destroy() {
    this.hide();
    this._undoBtn = null;
    this._redoBtn = null;
    this._resetBtn = null;
    this._exportBtn = null;
    this._counterEl = null;
    this._hintEl = null;
    this._collapseBtn = null;
    this._container = null;
  }

  _handleExit() {
    window.__EDITOR_EVENT_BUS__.emit('toolbar:exit');
  }

  _setupHistoryListener() {
    const bus = window.__EDITOR_EVENT_BUS__;
    bus.on('history:changed', (s) => this.updateHistoryState(s));
    bus.on('history:reset', () => this.updateHistoryState({ canUndo: false, canRedo: false, editCount: 0 }));
  }
}

WPE.toolbar = new WPE.Toolbar();
window.__TOOLBAR__ = WPE.toolbar;
