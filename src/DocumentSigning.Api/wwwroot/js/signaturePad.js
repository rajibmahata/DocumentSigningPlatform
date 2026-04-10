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
        // scaleX/Y == 1.0 when canvas.width was set to offsetWidth at init,
        // but recalculate live so subpixel rounding at init time never accumulates.
        const scaleX = canvas.width  / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
        const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top)  * scaleY
        };
    }

    return {
        init: function (canvasId) {
            canvas = document.getElementById(canvasId);
            if (!canvas || canvas._padInit) return;
            canvas._padInit = true;

            // Use getBoundingClientRect for float-precision sizing (offsetWidth is integer).
            // getPos() also uses getBoundingClientRect live, so mouse & touch coords are
            // always in the same coordinate space.
            const r = canvas.getBoundingClientRect();
            canvas.width  = Math.round(r.width);
            canvas.height = Math.round(r.height);

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
