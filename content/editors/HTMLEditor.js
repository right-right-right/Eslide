WPE.HTMLEditor = class HTMLEditor {
    constructor() {
        this._engine = null;
        this._bus = window.__EDITOR_EVENT_BUS__;
        this._currentElement = null;
        this._originalHTML = '';
        this._lastRecordedHTML = '';
    }

    setEngine(engine) {
        this._engine = engine;
    }

    startEdit(element, clickEvent) {
        if (this._currentElement) {
            this.finishEdit();
        }

        this._currentElement = element;
        element.dataset.wpeOriginal = element.innerHTML;
        this._originalHTML = element.innerHTML;
        this._lastRecordedHTML = element.innerHTML;

        element.contentEditable = 'true';
        element.classList.add('wpe-editing');
        element.focus();

        this._placeCursor(element, clickEvent);

        element.addEventListener('input', this._onInput);

        if (window.__FORMAT_TOOLBAR__) {
            window.__FORMAT_TOOLBAR__.activate(element);
        }

        this._bus.emit('edit:html:started', { element });
    }

    finishEdit(save = true) {
        if (!this._currentElement) return;

        const element = this._currentElement;

        element.removeEventListener('input', this._onInput);

        if (window.__FORMAT_TOOLBAR__) {
            window.__FORMAT_TOOLBAR__.deactivate();
        }

        element.contentEditable = 'false';
        element.classList.remove('wpe-editing');

        if (save) {
            const newHTML = element.innerHTML;
            if (this._lastRecordedHTML !== newHTML) {
                window.__ACTION_HISTORY__.record(element, this._lastRecordedHTML, newHTML, 'html');
            }
            delete element.dataset.wpeOriginal;
            this._bus.emit('edit:html:finished', {
                element,
                originalHTML: this._originalHTML,
                newHTML
            });
        } else {
            element.innerHTML = this._originalHTML;
            this._bus.emit('edit:html:cancelled', { element });
        }

        this._currentElement = null;
        this._originalHTML = '';
        this._lastRecordedHTML = '';

        if (this._engine) {
            this._engine.clearCurrentEdit();
        }
    }

    isEditing() {
        return !!this._currentElement;
    }

    recordFormatChange() {
        if (!this._currentElement) return;

        const currentHTML = this._currentElement.innerHTML;
        if (this._lastRecordedHTML === currentHTML) return;

        window.__ACTION_HISTORY__.record(this._currentElement, this._lastRecordedHTML, currentHTML, 'html');
        this._lastRecordedHTML = currentHTML;
    }

    _placeCursor(element, clickEvent) {
        const selection = window.getSelection();

        if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (element.contains(range.commonAncestorContainer)) {
                return;
            }
        }

        if (clickEvent && document.caretRangeFromPoint) {
            const range = document.caretRangeFromPoint(clickEvent.clientX, clickEvent.clientY);
            if (range && element.contains(range.startContainer)) {
                selection.removeAllRanges();
                selection.addRange(range);
                return;
            }
        }

        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    _onInput = (e) => {
        this._bus.emit('edit:html:changing', {
            element: this._currentElement,
            html: this._currentElement.innerHTML
        });
    }
}

WPE.htmlEditor = new WPE.HTMLEditor();
window.__HTML_EDITOR__ = WPE.htmlEditor;
