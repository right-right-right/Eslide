WPE.ActionHistory = class ActionHistory {
  constructor() {
    this._records = [];
    this._index = -1;
    this._bus = window.__EDITOR_EVENT_BUS__;
    this._modifiedElements = new Map();
  }

  record(element, oldValue, newValue, type) {
    if (oldValue === newValue) return;

    this._records = this._records.slice(0, this._index + 1);

    const selector = this._buildSelector(element);
    const record = {
      selector,
      oldValue,
      newValue,
      type,
      timestamp: Date.now()
    };

    this._records.push(record);
    this._index = this._records.length - 1;

    const key = selector;
    const originalValue = this._modifiedElements.has(key)
      ? this._modifiedElements.get(key).originalValue
      : oldValue;

    if (!this._modifiedElements.has(key)) {
      this._modifiedElements.set(key, { element, originalValue: oldValue, type });
    }

    this._markElementModified(element, key, originalValue);

    this._bus.emit('history:changed', this.getState());
    this._bus.emit('history:recorded', record);
    this.saveToSession();
  }

  undo() {
    if (!this.canUndo()) return null;

    const record = this._records[this._index];
    this._index--;

    const element = this._findElement(record.selector);
    if (element) {
      if (record.type === 'html') {
        element.innerHTML = record.oldValue;
      } else if (record.type === 'svg') {
        element.textContent = record.oldValue;
      }

      const key = record.selector;
      if (this._modifiedElements.has(key)) {
        const modInfo = this._modifiedElements.get(key);
        const isBackToOriginal = modInfo.type === 'html'
          ? element.innerHTML === modInfo.originalValue
          : element.textContent === modInfo.originalValue;
        if (isBackToOriginal) {
          this._modifiedElements.delete(key);
          this._unmarkElementModified(element, key);
        }
      }
    }

    this._bus.emit('history:changed', this.getState());
    this.saveToSession();
    return record;
  }

  redo() {
    if (!this.canRedo()) return null;

    this._index++;
    const record = this._records[this._index];

    const element = this._findElement(record.selector);
    if (element) {
      if (record.type === 'html') {
        element.innerHTML = record.newValue;
      } else if (record.type === 'svg') {
        element.textContent = record.newValue;
      }
      const originalValue = this._modifiedElements.has(record.selector)
        ? this._modifiedElements.get(record.selector).originalValue
        : record.oldValue;
      if (!this._modifiedElements.has(record.selector)) {
        this._modifiedElements.set(record.selector, { element, originalValue, type: record.type });
      }
      this._markElementModified(element, record.selector, originalValue);
    }

    this._bus.emit('history:changed', this.getState());
    this.saveToSession();
    return record;
  }

  resetAll() {
    if (this._modifiedElements.size === 0) return;

    for (const [key, modInfo] of this._modifiedElements) {
      const element = modInfo.element;
      if (element && document.contains(element)) {
        if (modInfo.type === 'html') {
          element.innerHTML = modInfo.originalValue;
        } else if (modInfo.type === 'svg') {
          element.textContent = modInfo.originalValue;
        }
        this._unmarkElementModified(element, key);
      }
    }

    this._modifiedElements.clear();
    this._records = [];
    this._index = -1;

    this._bus.emit('history:changed', this.getState());
    this._bus.emit('history:reset');
    this.saveToSession();
  }

  canUndo() {
    return this._index >= 0;
  }

  canRedo() {
    return this._index < this._records.length - 1;
  }

  getState() {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      editCount: this._modifiedElements.size,
      totalRecords: this._records.length,
      currentIndex: this._index
    };
  }

  getEditCount() {
    return this._modifiedElements.size;
  }

  _buildSelector(element) {
    if (element.id) return `#${CSS.escape(element.id)}`;

    const path = [];
    let el = element;
    while (el && el !== document.body && el !== document.documentElement) {
      let part = el.tagName.toLowerCase();
      if (el.id) {
        path.unshift('#' + CSS.escape(el.id));
        break;
      }
      const parent = el.parentElement;
      if (parent) {
        const sameTag = Array.from(parent.children).filter(c => c.tagName === el.tagName);
        if (sameTag.length > 1) {
          part += `:nth-of-type(${sameTag.indexOf(el) + 1})`;
        }
      }
      path.unshift(part);
      el = parent;
    }
    return path.join(' > ') || '*';
  }

  _findElement(selector) {
    try {
      return document.querySelector(selector);
    } catch (e) {
      return null;
    }
  }

  _markElementModified(element, selector, originalValue) {
    if (!element) return;
    const modInfo = this._modifiedElements.get(selector);
    const type = modInfo ? modInfo.type : (element.closest && typeof element.closest === 'function' && element.closest('svg') ? 'svg' : 'html');
    const currentValue = element.tagName ? (type === 'svg' ? element.textContent : element.innerHTML) : element.textContent;
    this._bus.emit('element:modified', { element, selector, originalValue, currentValue, type });
  }

  _unmarkElementModified(element, selector) {
    if (!element) return;
    this._bus.emit('element:unmodified', { element, selector });
  }

  revertElement(element) {
    const selector = this._buildSelector(element);
    const modInfo = this._modifiedElements.get(selector);
    if (!modInfo) return;

    if (modInfo.type === 'html') {
      element.innerHTML = modInfo.originalValue;
    } else if (modInfo.type === 'svg') {
      element.textContent = modInfo.originalValue;
    }

    this._records = this._records.filter(r => r.selector !== selector);
    this._index = this._records.length - 1;
    this._modifiedElements.delete(selector);

    this._bus.emit('element:unmodified', { element, selector });
    this._bus.emit('history:changed', this.getState());
    this.saveToSession();
  }

  saveToSession() {
    if (this._modifiedElements.size === 0) {
      sessionStorage.removeItem('wpe_edits');
      chrome.storage.local.remove('wpe_edits');
      return;
    }
    const data = [];
    for (const [selector, modInfo] of this._modifiedElements) {
      const element = this._findElement(selector);
      if (!element) continue;
      data.push({
        selector,
        originalValue: modInfo.originalValue,
        currentValue: modInfo.type === 'html' ? element.innerHTML : element.textContent,
        type: modInfo.type
      });
    }
    const json = JSON.stringify(data);
    const sizeKB = Math.round(json.length / 1024);
    try {
      sessionStorage.setItem('wpe_edits', json);
    } catch (e) {
      sessionStorage.removeItem('wpe_edits');
      if (sizeKB > 4000) {
        this._saveToChromeStorage(json);
      }
    }
  }

  _saveToChromeStorage(json) {
    try {
      chrome.storage.local.set({ wpe_edits: json });
    } catch (e) { }
  }

  restoreFromSession() {
    let data;
    try {
      const raw = sessionStorage.getItem('wpe_edits');
      if (!raw) {
        this._restoreFromChromeStorage();
        return 0;
      }
      data = JSON.parse(raw);
    } catch (e) {
      sessionStorage.removeItem('wpe_edits');
      this._restoreFromChromeStorage();
      return 0;
    }

    if (!Array.isArray(data) || data.length === 0) return 0;

    return this._applyRestoredData(data);
  }

  _restoreFromChromeStorage() {
    try {
      chrome.storage.local.get('wpe_edits', (result) => {
        if (!result.wpe_edits) return;
        try {
          const data = JSON.parse(result.wpe_edits);
          if (Array.isArray(data) && data.length > 0) {
            this._applyRestoredData(data);
          }
        } catch (e) { }
        chrome.storage.local.remove('wpe_edits');
      });
    } catch (e) { }
  }

  _applyRestoredData(data) {
    let restored = 0;
    for (const item of data) {
      const element = this._findElement(item.selector);
      if (!element) continue;

      if (item.type === 'html') {
        if (element.innerHTML === item.currentValue) {
          this._modifiedElements.set(item.selector, { element, originalValue: item.originalValue, type: item.type });
          this._markElementModified(element, item.selector, item.originalValue);
          restored++;
        }
      } else if (item.type === 'svg') {
        if (element.textContent === item.currentValue) {
          this._modifiedElements.set(item.selector, { element, originalValue: item.originalValue, type: item.type });
          this._markElementModified(element, item.selector, item.originalValue);
          restored++;
        }
      }
    }

    if (restored > 0) {
      this._bus.emit('history:changed', this.getState());
    }
    return restored;
  }

  clearSession() {
    sessionStorage.removeItem('wpe_edits');
    chrome.storage.local.remove('wpe_edits');
  }
};

WPE.history = new WPE.ActionHistory();
window.__ACTION_HISTORY__ = WPE.history;
