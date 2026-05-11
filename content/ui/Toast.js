WPE.Toast = class Toast {
    constructor() {
        this._container = null;
    }

    _ensureDOM() {
        if (this._container) return;
        this._container = document.createElement('div');
        this._container.className = 'wpe-toast-container';
        this._container.setAttribute('data-wpe-root', '');
        document.body.appendChild(this._container);
    }

    show(message, type = 'info', duration = 2500) {
        this._ensureDOM();
        const toast = document.createElement('div');
        toast.className = `wpe-toast wpe-toast-${type}`;
        toast.textContent = message;

        this._container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('wpe-toast-out');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, duration);
    }

    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    destroy() {
        if (this._container && this._container.parentNode) {
            this._container.parentNode.removeChild(this._container);
        }
        this._container = null;
    }
}

WPE.toast = new WPE.Toast();
window.__TOAST__ = WPE.toast;
