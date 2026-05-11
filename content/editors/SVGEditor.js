WPE.SVGEditor = class SVGEditor {
    constructor() {
        this._engine = null;
        this._bus = window.__EDITOR_EVENT_BUS__;
        this._overlay = null;
        this._currentElement = null;
        this._originalText = '';
    }

    setEngine(engine) {
        this._engine = engine;
    }

    setOverlay(overlay) {
        this._overlay = overlay;
    }

    startEdit(element, clickEvent) {
        if (this._currentElement) {
            this.finishEdit();
        }

        this._currentElement = element;
        this._originalText = element.textContent;

        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);

        const config = {
            text: element.textContent,
            x: rect.left,
            y: rect.top,
            width: Math.max(rect.width, 50),
            height: Math.max(rect.height, 24),
            fontSize: computedStyle.fontSize || '16px',
            fontFamily: computedStyle.fontFamily || 'inherit',
            fontWeight: computedStyle.fontWeight || 'normal',
            fontStyle: computedStyle.fontStyle || 'normal',
            textAnchor: element.getAttribute('text-anchor') || 'start',
            fill: computedStyle.fill || '#000000',
            textAlign: this._svgAnchorToAlign(element.getAttribute('text-anchor')),
            onConfirm: (newText) => this._confirmEdit(newText),
            onCancel: () => this._cancelEdit()
        };

        element.classList.add('wpe-editing');
        this._overlay.show(config);

        this._bus.emit('edit:svg:started', { element });
    }

    finishEdit(save = true) {
        if (!this._currentElement) return;

        this._currentElement.classList.remove('wpe-editing');

        if (this._overlay && this._overlay.isVisible()) {
            if (save) {
                const newText = this._overlay.getText();
                if (this._originalText !== newText) {
                    window.__ACTION_HISTORY__.record(this._currentElement, this._originalText, newText, 'svg');
                }
                this._currentElement.textContent = newText;
            }
            this._overlay.hide();
        }

        this._currentElement = null;
        this._originalText = '';

        if (this._engine) {
            this._engine.clearCurrentEdit();
        }
    }

    isEditing() {
        return !!this._currentElement;
    }

    _confirmEdit(newText) {
        if (!this._currentElement) return;

        const element = this._currentElement;

        if (this._originalText !== newText) {
            window.__ACTION_HISTORY__.record(element, this._originalText, newText, 'svg');
        }

        element.textContent = newText;

        this._bus.emit('edit:svg:finished', {
            element,
            originalText: this._originalText,
            newText
        });

        element.classList.remove('wpe-editing');
        this._currentElement = null;
        this._originalText = '';

        if (this._engine) {
            this._engine.clearCurrentEdit();
        }
    }

    _cancelEdit() {
        if (!this._currentElement) return;

        this._currentElement.textContent = this._originalText;

        this._bus.emit('edit:svg:cancelled', {
            element: this._currentElement
        });

        this._currentElement.classList.remove('wpe-editing');
        this._currentElement = null;
        this._originalText = '';

        if (this._engine) {
            this._engine.clearCurrentEdit();
        }
    }

    _svgAnchorToAlign(anchor) {
        switch (anchor) {
            case 'start': return 'left';
            case 'middle': return 'center';
            case 'end': return 'right';
            default: return 'left';
        }
    }
}

WPE.svgEditor = new WPE.SVGEditor();
window.__SVG_EDITOR__ = WPE.svgEditor;
