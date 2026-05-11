(function () {
    if (window.__WPE_INITIALIZED__) return;
    window.__WPE_INITIALIZED__ = true;

    const engine = window.__EDIT_ENGINE__;
    const htmlEditor = window.__HTML_EDITOR__;
    const svgEditor = window.__SVG_EDITOR__;
    const overlay = window.__OVERLAY__;
    const toolbar = window.__TOOLBAR__;

    svgEditor.setOverlay(overlay);
    engine.init(htmlEditor, svgEditor, toolbar);

    chrome.storage.local.get(['editModeActive'], (result) => {
        if (result.editModeActive) {
            engine.activate();
        }
    });

    const bus = window.__EDITOR_EVENT_BUS__;
    bus.on('edit:activated', () => {
        chrome.storage.local.set({ editModeActive: true });
    });
    bus.on('edit:deactivated', () => {
        chrome.storage.local.set({ editModeActive: false });
    });
})();
