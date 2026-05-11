WPE.DiffIndicator = class DiffIndicator {
    constructor() {
        this._bus = window.__EDITOR_EVENT_BUS__;
        this._markers = new Map();
        this._popupEl = null;
        this._popupKeyHandler = null;
        this._initialized = false;
        this._mutationObserver = null;
        this._clippingAncestorsCache = new Map();
        this._cacheValid = false;
        this._scrollTimer = null;
        this._resizeTimer = null;
        this._intersectionObserver = null;
        this._visibleMarkers = new Set();

        this._boundOnModified = this._onElementModified.bind(this);
        this._boundOnUnmodified = this._onElementUnmodified.bind(this);
        this._boundRemoveAll = this._removeAllMarkers.bind(this);
        this._boundScrollHandler = this._onScroll.bind(this);
        this._boundResizeHandler = this._onResize.bind(this);
    }

    init() {
        if (this._initialized) return;
        this._initialized = true;

        this._bus.on('element:modified', this._boundOnModified);
        this._bus.on('element:unmodified', this._boundOnUnmodified);
        this._bus.on('history:reset', this._boundRemoveAll);

        this._startIntersectionObserver();
        this._startMutationObserver();

        window.addEventListener('scroll', this._boundScrollHandler, true);
        window.addEventListener('resize', this._boundResizeHandler);
    }

    destroy() {
        if (!this._initialized) return;
        this._initialized = false;

        this._removeAllMarkers();
        this._closePopup();

        this._bus.off('element:modified', this._boundOnModified);
        this._bus.off('element:unmodified', this._boundOnUnmodified);
        this._bus.off('history:reset', this._boundRemoveAll);

        this._stopIntersectionObserver();
        this._stopMutationObserver();

        window.removeEventListener('scroll', this._boundScrollHandler, true);
        window.removeEventListener('resize', this._boundResizeHandler);

        clearTimeout(this._scrollTimer);
        clearTimeout(this._resizeTimer);
        this._clippingAncestorsCache.clear();
    }

    _startIntersectionObserver() {
        if (this._intersectionObserver) return;
        this._intersectionObserver = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    const selector = entry.target.getAttribute('data-wpe-marker-ref');
                    if (!selector) continue;
                    if (entry.isIntersecting) {
                        this._visibleMarkers.add(selector);
                    } else {
                        this._visibleMarkers.delete(selector);
                    }
                }
                this._updateVisibleMarkerPositions();
            },
            { rootMargin: '100px', threshold: 0 }
        );
    }

    _stopIntersectionObserver() {
        if (this._intersectionObserver) {
            this._intersectionObserver.disconnect();
            this._intersectionObserver = null;
        }
        this._visibleMarkers.clear();
    }

    _startMutationObserver() {
        if (this._mutationObserver) return;

        this._mutationObserver = new MutationObserver(() => {
            this._cacheValid = false;
            this._schedulePositionUpdate();
        });
        this._mutationObserver.observe(document.body, {
            attributes: true,
            childList: true,
            subtree: true,
            attributeFilter: ['style', 'class', 'transform']
        });
    }

    _stopMutationObserver() {
        if (this._mutationObserver) {
            this._mutationObserver.disconnect();
            this._mutationObserver = null;
        }
    }

    _onScroll() {
        clearTimeout(this._scrollTimer);
        this._scrollTimer = setTimeout(() => {
            this._updateVisibleMarkerPositions();
        }, 16);
    }

    _onResize() {
        clearTimeout(this._resizeTimer);
        this._resizeTimer = setTimeout(() => {
            this._invalidateCache();
            this._updateVisibleMarkerPositions();
        }, 32);
    }

    _schedulePositionUpdate() {
        clearTimeout(this._positionTimer);
        this._positionTimer = setTimeout(() => {
            this._updateVisibleMarkerPositions();
        }, 32);
    }

    _getClippingAncestors(element) {
        if (this._cacheValid && this._clippingAncestorsCache.has(element)) {
            return this._clippingAncestorsCache.get(element);
        }

        const ancestors = [];
        let ancestor = element.parentElement;
        while (ancestor && ancestor !== document.body) {
            const style = window.getComputedStyle(ancestor);
            const overflow = style.overflow || style.overflowX || style.overflowY;
            if (overflow === 'hidden' || overflow === 'clip' || style.contain === 'paint') {
                ancestors.push(ancestor);
            }
            ancestor = ancestor.parentElement;
        }

        this._clippingAncestorsCache.set(element, ancestors);
        return ancestors;
    }

    _invalidateCache() {
        this._cacheValid = false;
        this._clippingAncestorsCache.clear();
    }

    _onElementModified({ element, selector, originalValue, currentValue, type }) {
        if (this._markers.has(selector)) {
            return;
        }

        this._invalidateCache();
        const markerEl = this._createMarkerEl(element, selector, originalValue, currentValue, type);
        this._markers.set(selector, { element, markerEl, originalValue, currentValue, type });

        if (this._intersectionObserver) {
            this._intersectionObserver.observe(element);
        }

        this._updateMarkerPosition(selector);
    }

    _onElementUnmodified({ selector }) {
        this._removeMarker(selector);
    }

    _createMarkerEl(element, selector, originalValue, currentValue, type) {
        const marker = document.createElement('div');
        marker.className = 'wpe-modified-marker';
        marker.setAttribute('data-wpe-marker', selector);

        element.setAttribute('data-wpe-marker-ref', selector);

        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this._showDiffPopup(element, selector, originalValue, currentValue, type);
        });

        document.body.appendChild(marker);
        return marker;
    }

    _isElementVisible(element, rect) {
        if (rect.width === 0 && rect.height === 0) return false;

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (rect.right < -50 || rect.left > vw + 50 || rect.bottom < -50 || rect.top > vh + 50) {
            return false;
        }

        const clippingAncestors = this._getClippingAncestors(element);
        for (const ancestor of clippingAncestors) {
            if (!document.contains(ancestor)) {
                this._invalidateCache();
                return false;
            }
            const ancestorRect = ancestor.getBoundingClientRect();
            if (rect.right < ancestorRect.left || rect.left > ancestorRect.right ||
                rect.bottom < ancestorRect.top || rect.top > ancestorRect.bottom) {
                return false;
            }
        }

        return true;
    }

    _updateMarkerPosition(selector) {
        const entry = this._markers.get(selector);
        if (!entry) return;

        const { element, markerEl } = entry;
        if (!element || !document.contains(element)) {
            this._removeMarker(selector);
            return;
        }

        const rect = element.getBoundingClientRect();
        this._cacheValid = true;

        const visible = this._isElementVisible(element, rect);
        if (!visible) {
            markerEl.style.display = 'none';
            return;
        }

        markerEl.style.display = '';

        const x = rect.left - 16;
        const y = rect.top + rect.height / 2 - 5;

        markerEl.style.left = Math.round(x) + 'px';
        markerEl.style.top = Math.round(y) + 'px';
    }

    _updateVisibleMarkerPositions() {
        for (const selector of this._visibleMarkers) {
            this._updateMarkerPosition(selector);
        }
        for (const [selector] of this._markers) {
            if (!this._visibleMarkers.has(selector)) {
                this._updateMarkerPosition(selector);
            }
        }
    }

    _removeMarker(selector) {
        const entry = this._markers.get(selector);
        if (entry) {
            if (entry.element && this._intersectionObserver) {
                this._intersectionObserver.unobserve(entry.element);
                entry.element.removeAttribute('data-wpe-marker-ref');
            }
            if (entry.markerEl && entry.markerEl.parentNode) {
                entry.markerEl.remove();
            }
        }
        this._markers.delete(selector);
        this._visibleMarkers.delete(selector);
    }

    _removeAllMarkers() {
        for (const [selector] of this._markers) {
            this._removeMarker(selector);
        }
        this._markers.clear();
        this._visibleMarkers.clear();
        this._closePopup();
    }

    _t(key, params) {
        return window.__WPE_I18N__.t(key, params);
    }

    _showDiffPopup(element, selector, originalValue, currentValue, type) {
        this._closePopup();

        const current = this._getDisplayValue(element, type);
        const original = this._getPlainText(originalValue, type);

        const ops = this._computeDiff(original, current);
        const originalHtml = this._buildDiffHtml(ops, 'original');
        const currentHtml = this._buildDiffHtml(ops, 'current');

        const popup = document.createElement('div');
        popup.className = 'wpe-diff-popup';
        popup.setAttribute('data-wpe-root', '');
        popup.innerHTML = `
            <div class="wpe-diff-popup-mask"></div>
            <div class="wpe-diff-popup-box">
                <div class="wpe-diff-popup-header">
                    <span class="wpe-diff-popup-dot"></span>
                    <span class="wpe-diff-popup-title">${this._t('diff.title')}</span>
                    <button class="wpe-diff-popup-close" title="${this._t('diff.close')}">&times;</button>
                </div>
                <div class="wpe-diff-panels">
                    <div class="wpe-diff-panel wpe-diff-panel-original">
                        <div class="wpe-diff-label">${this._t('diff.original')}</div>
                        <div class="wpe-diff-content">${originalHtml}</div>
                        <div class="wpe-diff-hint">${this._t('diff.revert')}</div>
                    </div>
                    <div class="wpe-diff-arrow">&rarr;</div>
                    <div class="wpe-diff-panel wpe-diff-panel-current">
                        <div class="wpe-diff-label">${this._t('diff.current')}</div>
                        <div class="wpe-diff-content">${currentHtml}</div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(popup);
        this._popupEl = popup;

        const mask = popup.querySelector('.wpe-diff-popup-mask');
        const closeBtn = popup.querySelector('.wpe-diff-popup-close');
        const originalPanel = popup.querySelector('.wpe-diff-panel-original');

        const close = () => this._closePopup();

        mask.addEventListener('click', close);
        closeBtn.addEventListener('click', close);

        originalPanel.addEventListener('click', () => {
            this._closePopup();
            const dialog = window.__CONFIRM_DIALOG__;
            dialog.show(
                this._t('confirm.revert.title'),
                this._t('confirm.revert.message'),
                this._t('confirm.revert.ok'),
                this._t('confirm.cancel')
            ).then(result => {
                if (result === 'ok') {
                    window.__ACTION_HISTORY__.revertElement(element);
                }
            });
        });

        this._popupKeyHandler = (e) => {
            if (e.key === 'Escape') {
                close();
            }
        };
        document.addEventListener('keydown', this._popupKeyHandler);
    }

    _closePopup() {
        if (this._popupEl) {
            this._popupEl.remove();
            this._popupEl = null;
        }
        if (this._popupKeyHandler) {
            document.removeEventListener('keydown', this._popupKeyHandler);
            this._popupKeyHandler = null;
        }
    }

    isPopupOpen() {
        return !!this._popupEl;
    }

    closePopup() {
        this._closePopup();
    }

    _getDisplayValue(element, type) {
        if (type === 'html') return element.textContent || '';
        return element.textContent || '';
    }

    _getPlainText(value, type) {
        const temp = document.createElement('div');
        temp.innerHTML = value;
        return temp.textContent || '';
    }

    _escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    _buildDiffHtml(ops, panel) {
        const result = [];
        for (const op of ops) {
            const escaped = this._escapeHTML(op.text);
            if (op.type === 'equal') {
                result.push(escaped);
            } else if (op.type === 'delete' && panel === 'original') {
                result.push(`<span class="wpe-diff-removed">${escaped}</span>`);
            } else if (op.type === 'insert' && panel === 'current') {
                result.push(`<span class="wpe-diff-added">${escaped}</span>`);
            }
        }
        return result.join('');
    }

    _computeDiff(oldText, newText) {
        const n = oldText.length;
        const m = newText.length;

        if (n === 0) return [{ type: 'insert', text: newText }];
        if (m === 0) return [{ type: 'delete', text: oldText }];

        const maxLen = 2000;
        if (n > maxLen || m > maxLen) {
            return this._computeDiffLine(oldText, newText);
        }

        const dp = new Array(n + 1);
        for (let i = 0; i <= n; i++) {
            dp[i] = new Uint16Array(m + 1);
        }

        for (let i = 1; i <= n; i++) {
            for (let j = 1; j <= m; j++) {
                if (oldText[i - 1] === newText[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }

        const ops = [];
        let i = n, j = m;
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && oldText[i - 1] === newText[j - 1]) {
                ops.push({ type: 'equal', text: oldText[i - 1] });
                i--; j--;
            } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
                ops.push({ type: 'insert', text: newText[j - 1] });
                j--;
            } else {
                ops.push({ type: 'delete', text: oldText[i - 1] });
                i--;
            }
        }
        ops.reverse();

        return this._mergeOps(ops);
    }

    _computeDiffLine(oldText, newText) {
        const oldLines = oldText.split('\n');
        const newLines = newText.split('\n');
        const ops = [];

        const maxLen = Math.max(oldLines.length, newLines.length);
        for (let i = 0; i < maxLen; i++) {
            if (i < oldLines.length && i < newLines.length) {
                if (oldLines[i] === newLines[i]) {
                    ops.push({ type: 'equal', text: oldLines[i] + '\n' });
                } else {
                    ops.push({ type: 'delete', text: oldLines[i] + '\n' });
                    ops.push({ type: 'insert', text: newLines[i] + '\n' });
                }
            } else if (i < oldLines.length) {
                ops.push({ type: 'delete', text: oldLines[i] + '\n' });
            } else {
                ops.push({ type: 'insert', text: newLines[i] + '\n' });
            }
        }

        return this._mergeOps(ops);
    }

    _mergeOps(ops) {
        if (ops.length === 0) return ops;

        const merged = [ops[0]];
        for (let i = 1; i < ops.length; i++) {
            const last = merged[merged.length - 1];
            if (last.type === ops[i].type) {
                last.text += ops[i].text;
            } else {
                merged.push({ type: ops[i].type, text: ops[i].text });
            }
        }
        return merged;
    }
}

WPE.diffIndicator = new WPE.DiffIndicator();
window.__DIFF_INDICATOR__ = WPE.diffIndicator;
