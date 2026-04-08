/**
 * Signature pad utilities for the Document Signing Portal.
 * Uses the HTML5 Canvas API. No external libraries required.
 */

window.signaturePad = (function () {
    let canvas = null;
    let ctx = null;
    let drawing = false;
    let lastX = 0, lastY = 0;

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    return {
        init: function (canvasId) {
            canvas = document.getElementById(canvasId);
            if (!canvas || canvas._padInit) return;
            canvas._padInit = true;
            ctx = canvas.getContext('2d');
            ctx.strokeStyle = '#1f2937';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Mouse events
            canvas.addEventListener('mousedown', (e) => {
                drawing = true;
                const p = getPos(e);
                lastX = p.x; lastY = p.y;
            });
            canvas.addEventListener('mousemove', (e) => {
                if (!drawing) return;
                const p = getPos(e);
                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
                lastX = p.x; lastY = p.y;
            });
            canvas.addEventListener('mouseup', () => { drawing = false; });
            canvas.addEventListener('mouseleave', () => { drawing = false; });

            // Touch events
            canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                drawing = true;
                const p = getPos(e);
                lastX = p.x; lastY = p.y;
            }, { passive: false });
            canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                if (!drawing) return;
                const p = getPos(e);
                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
                lastX = p.x; lastY = p.y;
            }, { passive: false });
            canvas.addEventListener('touchend', () => { drawing = false; });
        },

        clear: function (canvasId) {
            canvas = document.getElementById(canvasId);
            if (!canvas) return;
            ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        },

        reset: function (canvasId) {
            // Call this before destroying/re-creating the canvas element so init runs again
            const el = document.getElementById(canvasId);
            if (el) el._padInit = false;
        },

        getDataUrl: function (canvasId) {
            canvas = document.getElementById(canvasId);
            if (!canvas) return null;
            return canvas.toDataURL('image/png');
        },

        isEmpty: function (canvasId) {
            canvas = document.getElementById(canvasId);
            if (!canvas) return true;
            const pixelBuffer = new Uint32Array(
                canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data.buffer
            );
            return !pixelBuffer.some(color => color !== 0);
        },

        renderTypedSignature: function (name) {
            // Renders typed name as a PNG data URL (without the data:image/png;base64, prefix)
            const offscreen = document.createElement('canvas');
            offscreen.width = 500;
            offscreen.height = 150;
            const octx = offscreen.getContext('2d');
            octx.fillStyle = '#ffffff';
            octx.fillRect(0, 0, offscreen.width, offscreen.height);
            octx.fillStyle = '#1f2937';
            octx.font = '48px "Segoe UI", cursive, sans-serif';
            octx.textBaseline = 'middle';
            octx.textAlign = 'center';
            octx.fillText(name, offscreen.width / 2, offscreen.height / 2, offscreen.width - 20);
            const dataUrl = offscreen.toDataURL('image/png');
            return dataUrl.split(',', 2)[1]; // return only base64 part
        }
    };
})();
