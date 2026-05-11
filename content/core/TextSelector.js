WPE.TextSelector = class TextSelector {
    constructor() {
        this._editModeClass = 'wpe-editable';
        this._hintClass = 'wpe-text-hint';
    }

    findHTMLEditableElements(root = document.body) {
        const results = [];
        this._walkTextNodes(root, results);
        return results;
    }

    findSVGEditableElements(root = document.body) {
        const svgTexts = root.querySelectorAll('svg text');
        return Array.from(svgTexts).filter(el => {
            const text = el.textContent.trim();
            return text.length > 0;
        });
    }

    markEditableElements(root = document.body) {
        const htmlElements = this.findHTMLEditableElements(root);
        const svgElements = this.findSVGEditableElements(root);

        htmlElements.forEach(el => {
            el.classList.add(this._editModeClass);
            el.classList.add(this._hintClass);
        });

        svgElements.forEach(el => {
            el.classList.add(this._editModeClass);
            el.classList.add(this._hintClass);
        });

        return { htmlElements, svgElements };
    }

    unmarkEditableElements(root = document.body) {
        const allMarked = root.querySelectorAll(`.${this._editModeClass}`);
        allMarked.forEach(el => {
            el.classList.remove(this._editModeClass);
            el.classList.remove(this._hintClass);
            el.removeAttribute('contenteditable');
            el.removeAttribute('data-wpe-original');
        });
    }

    getClickedEditable(target) {
        if (!target || typeof target.closest !== 'function') return null;
        let editable;
        try {
            editable = target.closest(`.${this._editModeClass}`);
        } catch (e) {
            return null;
        }
        if (!editable) return null;

        if (editable.closest && editable.closest('svg') && editable.tagName.toLowerCase() === 'text') {
            return { element: editable, type: 'svg' };
        }

        return { element: editable, type: 'html' };
    }

    _walkTextNodes(node, results) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            if (text.length > 0) {
                const parent = node.parentElement;
                if (parent && !results.includes(parent)) {
                    if (this._isLeafTextElement(parent)) {
                        results.push(parent);
                    }
                }
            }
            return;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const tag = node.tagName.toLowerCase();
        const skipTags = ['script', 'style', 'noscript', 'iframe', 'svg', 'canvas', 'code', 'pre'];
        if (skipTags.includes(tag)) return;

        if (this._isExcludedElement(node)) return;

        for (let i = 0; i < node.childNodes.length; i++) {
            this._walkTextNodes(node.childNodes[i], results);
        }
    }

    _isLeafTextElement(element) {
        let hasDirectText = false;
        for (const child of element.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
                if (child.textContent.trim().length > 0) {
                    hasDirectText = true;
                }
            }
        }
        if (!hasDirectText) return false;

        const containerTags = ['div', 'section', 'article', 'main', 'aside',
            'header', 'footer', 'nav', 'form', 'table', 'ul', 'ol', 'dl',
            'fieldset', 'details', 'figure'];
        for (const child of element.children) {
            if (containerTags.includes(child.tagName.toLowerCase())) return false;
        }

        return true;
    }

    _isExcludedElement(element) {
        const excludeClasses = ['wpe-overlay', 'wpe-toolbar', 'wpe-editing-overlay'];
        for (const cls of excludeClasses) {
            if (element.classList.contains(cls)) return true;
        }

        if (element.hasAttribute('data-wpe-ignore')) return true;

        return false;
    }
};

WPE.selector = new WPE.TextSelector();
window.__TEXT_SELECTOR__ = WPE.selector;
