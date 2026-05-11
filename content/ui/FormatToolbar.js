WPE.FormatToolbar = class FormatToolbar {
  constructor() {
    this._container = null;
    this._visible = false;
    this._editingElement = null;
    this._savedRange = null;
    this._pinned = false;
    this._colorInput = null;
    this._colorLabel = null;
    this._colorBar = null;
    this._sizeInput = null;
    this._sizeDropdown = null;
    this._customSizeInput = null;
    this._customSizeBtn = null;
    this._boundSelectionHandler = this._handleSelectionChange.bind(this);
    this._boundScrollHandler = this._handleScroll.bind(this);
    this._domReady = false;
  }

  _ensureDOM() {
    if (this._domReady) return;
    this._domReady = true;
    this._createDOM();
    this._setupButtons();
  }

  _t(key, params) {
    return window.__WPE_I18N__.t(key, params);
  }

  _createDOM() {
    this._container = document.createElement('div');
    this._container.className = 'wpe-format-toolbar';
    this._container.setAttribute('data-wpe-root', '');
    this._container.innerHTML = `
      <div class="wpe-format-inner">
        <button class="wpe-format-btn" data-cmd="bold" title="${this._t('format.bold.title')}">
          <span class="wpe-format-icon" style="font-weight:700">B</span>
        </button>
        <button class="wpe-format-btn" data-cmd="italic" title="${this._t('format.italic.title')}">
          <span class="wpe-format-icon" style="font-style:italic">I</span>
        </button>
        <button class="wpe-format-btn" data-cmd="underline" title="${this._t('format.underline.title')}">
          <span class="wpe-format-icon" style="text-decoration:underline">U</span>
        </button>
        <button class="wpe-format-btn" data-cmd="strikeThrough" title="${this._t('format.strike.title')}">
          <span class="wpe-format-icon" style="text-decoration:line-through">S</span>
        </button>
        <span class="wpe-format-divider"></span>
        <div class="wpe-format-color-wrap" title="${this._t('format.color.title')}">
          <input type="color" class="wpe-format-color-input" value="#000000">
          <span class="wpe-format-color-label">A</span>
          <span class="wpe-format-color-bar"></span>
        </div>
        <span class="wpe-format-divider"></span>
        <div class="wpe-format-size-wrap">
          <input type="text" class="wpe-format-size-input" value="16" title="${this._t('format.size.title')}">
          <div class="wpe-format-size-dropdown">
            <div class="wpe-format-size-option" data-size="10">10px</div>
            <div class="wpe-format-size-option" data-size="11">11px</div>
            <div class="wpe-format-size-option" data-size="12">12px</div>
            <div class="wpe-format-size-option" data-size="13">13px</div>
            <div class="wpe-format-size-option" data-size="14">14px</div>
            <div class="wpe-format-size-option" data-size="15">15px</div>
            <div class="wpe-format-size-option" data-size="16">16px</div>
            <div class="wpe-format-size-option" data-size="18">18px</div>
            <div class="wpe-format-size-option" data-size="20">20px</div>
            <div class="wpe-format-size-option" data-size="22">22px</div>
            <div class="wpe-format-size-option" data-size="24">24px</div>
            <div class="wpe-format-size-option" data-size="28">28px</div>
            <div class="wpe-format-size-option" data-size="32">32px</div>
            <div class="wpe-format-size-option" data-size="36">36px</div>
            <div class="wpe-format-size-option" data-size="40">40px</div>
            <div class="wpe-format-size-option" data-size="48">48px</div>
            <div class="wpe-format-size-option" data-size="56">56px</div>
            <div class="wpe-format-size-option" data-size="64">64px</div>
            <div class="wpe-format-size-option" data-size="72">72px</div>
            <div class="wpe-format-size-option" data-size="96">96px</div>
            <div class="wpe-format-size-custom">
              <input type="number" class="wpe-format-size-custom-input" min="1" max="999" placeholder="${this._t('format.size.custom.placeholder')}">
              <button class="wpe-format-size-custom-btn" title="${this._t('format.size.custom.apply')}">✓</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this._container);

    this._colorInput = this._container.querySelector('.wpe-format-color-input');
    this._colorLabel = this._container.querySelector('.wpe-format-color-label');
    this._colorBar = this._container.querySelector('.wpe-format-color-bar');
    this._sizeInput = this._container.querySelector('.wpe-format-size-input');
    this._sizeDropdown = this._container.querySelector('.wpe-format-size-dropdown');
    this._customSizeInput = this._container.querySelector('.wpe-format-size-custom-input');
    this._customSizeBtn = this._container.querySelector('.wpe-format-size-custom-btn');
  }

  _setupButtons() {
    this._container.addEventListener('mousedown', (e) => {
      if (!e.target || typeof e.target.closest !== 'function') return;
      const btn = e.target.closest('[data-cmd]');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        this._pin();
        const cmd = btn.dataset.cmd;
        document.execCommand(cmd, false, null);
        this._container.classList.add('wpe-format-active');
        this._updateActiveStates();
        this._recordFormatChange();
        this._saveSelection();
        this._updatePosition();
        return;
      }
    });

    this._colorInput.addEventListener('input', (e) => {
      this._pin();
      this._restoreSelection();
      document.execCommand('foreColor', false, e.target.value);
      this._updateColorDisplay(e.target.value);
      this._container.classList.add('wpe-format-active');
      this._recordFormatChange();
      this._saveSelection();
      this._updatePosition();
    });

    this._colorInput.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._saveSelection();
    });

    this._sizeInput.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._saveSelection();
      this._toggleSizeDropdown();
    });

    this._sizeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const val = parseInt(this._sizeInput.value, 10);
        if (val > 0 && val <= 999) {
          this._applyFontSize(val);
        }
      }
    });

    this._sizeInput.addEventListener('blur', () => {
      const val = parseInt(this._sizeInput.value, 10);
      if (val > 0 && val <= 999) {
        this._applyFontSize(val);
      }
    });

    this._sizeDropdown.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    this._sizeDropdown.addEventListener('click', (e) => {
      if (!e.target || typeof e.target.closest !== 'function') return;
      const option = e.target.closest('.wpe-format-size-option');
      if (option) {
        this._pin();
        this._restoreSelection();
        const size = parseInt(option.dataset.size, 10);
        this._applyFontSize(size);
        this._hideSizeDropdown();
        return;
      }

      if (e.target.closest('.wpe-format-size-custom-btn') || e.target === this._customSizeInput) {
        return;
      }
    });

    this._customSizeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const val = parseInt(this._customSizeInput.value, 10);
      if (val > 0 && val <= 999) {
        this._pin();
        this._restoreSelection();
        this._applyFontSize(val);
        this._customSizeInput.value = '';
        this._hideSizeDropdown();
      }
    });

    this._customSizeInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = parseInt(this._customSizeInput.value, 10);
        if (val > 0 && val <= 999) {
          this._pin();
          this._restoreSelection();
          this._applyFontSize(val);
          this._customSizeInput.value = '';
          this._hideSizeDropdown();
        }
      }
    });

    this._customSizeInput.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      this._pin();
      this._saveSelection();
    });

    this._customSizeBtn.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      this._pin();
    });

    document.addEventListener('mousedown', (e) => {
      if (!e.target || typeof e.target.closest !== 'function') {
        this._hideSizeDropdown();
        return;
      }
      if (!e.target.closest('.wpe-format-size-wrap')) {
        this._hideSizeDropdown();
      }
    });
  }

  _applyFontSize(size) {
    const fontSizeMap = {
      '10': '1', '13': '2', '16': '3', '18': '4',
      '24': '5', '32': '6', '48': '7'
    };

    const closestSize = Object.keys(fontSizeMap)
      .map(Number)
      .reduce((prev, curr) => Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev);

    document.execCommand('fontSize', false, fontSizeMap[String(closestSize)] || '3');

    const fontElements = this._editingElement.querySelectorAll('font[size]');
    fontElements.forEach(el => {
      el.removeAttribute('size');
      el.style.fontSize = size + 'px';
    });

    this._sizeInput.value = size;
    this._container.classList.add('wpe-format-active');
    this._recordFormatChange();
    this._saveSelection();
    this._updatePosition();
  }

  _updateColorDisplay(color) {
    if (this._colorBar) {
      this._colorBar.style.background = color;
    }
  }

  _detectCurrentColor() {
    try {
      const color = document.queryCommandValue('foreColor');
      if (color) {
        this._colorInput.value = this._rgbToHex(color);
        this._updateColorDisplay(this._rgbToHex(color));
      }
    } catch (e) {}
  }

  _detectCurrentFontSize() {
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      let node = range.commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

      if (node) {
        const computedSize = window.getComputedStyle(node).fontSize;
        const px = parseFloat(computedSize);
        if (px > 0) {
          this._sizeInput.value = Math.round(px);
        }
      }
    } catch (e) {}
  }

  _rgbToHex(color) {
    if (color.startsWith('#')) return color.length === 4
      ? '#' + color[1]+color[1]+color[2]+color[2]+color[3]+color[3]
      : color;

    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return '#000000';
    const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(match[3], 10).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  _toggleSizeDropdown() {
    const isOpen = this._sizeDropdown.classList.contains('wpe-format-size-dropdown-open');
    if (isOpen) {
      this._hideSizeDropdown();
    } else {
      this._showSizeDropdown();
    }
  }

  _showSizeDropdown() {
    this._sizeDropdown.classList.add('wpe-format-size-dropdown-open');
  }

  _hideSizeDropdown() {
    if (this._sizeDropdown) {
      this._sizeDropdown.classList.remove('wpe-format-size-dropdown-open');
    }
  }

  _pin() {
    this._pinned = true;
    clearTimeout(this._pinTimer);
    this._pinTimer = setTimeout(() => {
      this._pinned = false;
    }, 1500);
  }

  _recordFormatChange() {
    if (window.__HTML_EDITOR__ && window.__HTML_EDITOR__.isEditing()) {
      window.__HTML_EDITOR__.recordFormatChange();
    }
  }

  _saveSelection() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      this._savedRange = selection.getRangeAt(0).cloneRange();
    }
  }

  _restoreSelection() {
    if (!this._savedRange) return;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(this._savedRange);
  }

  activate(editingElement) {
    this._ensureDOM();
    this._editingElement = editingElement;
    document.addEventListener('selectionchange', this._boundSelectionHandler);
    document.addEventListener('scroll', this._boundScrollHandler, true);

    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editingElement.contains(range.commonAncestorContainer)) {
        this.show();
      }
    }
  }

  deactivate() {
    this._editingElement = null;
    this.hide();
    this._hideSizeDropdown();
    document.removeEventListener('selectionchange', this._boundSelectionHandler);
    document.removeEventListener('scroll', this._boundScrollHandler, true);
  }

  destroy() {
    this.deactivate();
    if (this._container && this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    this._container = null;
    this._colorInput = null;
    this._colorLabel = null;
    this._colorBar = null;
    this._sizeInput = null;
    this._sizeDropdown = null;
    this._customSizeInput = null;
    this._customSizeBtn = null;
    this._domReady = false;
  }

  show() {
    if (!this._editingElement) return;
    this._updatePosition();
    this._visible = true;
    this._container.classList.add('wpe-format-visible');
    this._updateActiveStates();
    this._detectCurrentColor();
    this._detectCurrentFontSize();
  }

  hide() {
    this._visible = false;
    if (this._container) {
      this._container.classList.remove('wpe-format-visible', 'wpe-format-active');
    }
  }

  isVisible() {
    return this._visible;
  }

  _handleSelectionChange() {
    if (!this._editingElement) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      if (!this._pinned) {
        this.hide();
      }
      return;
    }

    const range = selection.getRangeAt(0);
    if (!this._editingElement.contains(range.commonAncestorContainer)) {
      if (!this._pinned) {
        this.hide();
      }
      return;
    }

    const text = selection.toString().trim();
    if (text.length === 0) {
      if (!this._pinned) {
        this.hide();
      }
      return;
    }

    this.show();
  }

  _handleScroll() {
    if (this._visible) {
      this._updatePosition();
    }
  }

  _updatePosition() {
    if (!this._container) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const toolbarHeight = this._container.offsetHeight || 42;
    const toolbarWidth = this._container.offsetWidth || 200;

    let top = rect.top + window.scrollY - toolbarHeight - 8;
    let left = rect.left + window.scrollX + rect.width / 2 - toolbarWidth / 2;

    const arrowBelow = top < window.scrollY + 60;
    if (arrowBelow) {
      top = rect.bottom + window.scrollY + 8;
    }

    if (left < 8) left = 8;
    if (left + toolbarWidth > window.innerWidth - 8) {
      left = window.innerWidth - toolbarWidth - 8;
    }

    this._container.style.top = top + 'px';
    this._container.style.left = left + 'px';
    this._container.classList.toggle('wpe-format-arrow-below', arrowBelow);
  }

  _updateActiveStates() {
    if (!this._container) return;
    const btns = this._container.querySelectorAll('[data-cmd]');
    btns.forEach(btn => {
      const cmd = btn.dataset.cmd;
      const active = document.queryCommandState(cmd);
      btn.classList.toggle('wpe-format-btn-active', active);
    });
  }
}

WPE.formatToolbar = new WPE.FormatToolbar();
window.__FORMAT_TOOLBAR__ = WPE.formatToolbar;
