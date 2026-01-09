document.addEventListener("DOMContentLoaded", () => {
    // ---- Elements ----
    const input = document.getElementById("idupload");
    const preview = document.getElementById("preview");
    const label = document.getElementById("upload-label");

    const openBtn = document.getElementById("btnftr1");
    const overlay = document.getElementById("qrOverlay");
    const closeBtn = document.getElementById("qrClose");
    const backdrop = document.getElementById("qrBackdrop");

    const shareBtn = document.getElementById("shareDocBtn");

    // ---- Image upload + localStorage (only if elements exist) ----
    let startDistance = 0;
    let currentScale = 1;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let isPanning = false;

    function resetTransform(img) {
        currentScale = 1;
        currentX = 0;
        currentY = 0;
        img.style.transform = "translate(0px, 0px) scale(1)";
    }

    function showImage(src) {
        if (!preview || !label) return;

        const img = document.createElement("img");
        img.src = src;

        preview.innerHTML = "";
        preview.appendChild(img);
        label.style.display = "none";

        resetTransform(img);
    }

    // Restore saved image
    if (preview && label) {
        const saved = localStorage.getItem("uploadedImage");
        if (saved) showImage(saved);
    }

    // Upload
    if (input) {
        input.addEventListener("change", function () {
            const file = this.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const src = e.target?.result;
                if (!src) return;
                localStorage.setItem("uploadedImage", src);
                showImage(src);
            };
            reader.readAsDataURL(file);
        });
    }

    // Pinch zoom + pan (only if preview exists)
    if (preview) {
        preview.addEventListener(
            "touchstart",
            function (e) {
                const img = preview.querySelector("img");
                if (!img) return;

                if (e.touches.length === 2) {
                    startDistance = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    isPanning = false;
                } else if (e.touches.length === 1 && currentScale > 1) {
                    isPanning = true;
                    startX = e.touches[0].clientX - currentX;
                    startY = e.touches[0].clientY - currentY;
                }
            },
            { passive: false }
        );

        preview.addEventListener(
            "touchmove",
            function (e) {
                const img = preview.querySelector("img");
                if (!img) return;

                e.preventDefault();

                if (e.touches.length === 2) {
                    const newDistance = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );

                    const scaleChange = newDistance / startDistance;
                    let newScale = currentScale * scaleChange;
                    if (newScale < 1) newScale = 1;

                    img.style.transform = `translate(${currentX}px, ${currentY}px) scale(${newScale})`;
                } else if (e.touches.length === 1 && isPanning) {
                    currentX = e.touches[0].clientX - startX;
                    currentY = e.touches[0].clientY - startY;
                    img.style.transform = `translate(${currentX}px, ${currentY}px) scale(${currentScale})`;
                }
            },
            { passive: false }
        );

        preview.addEventListener("touchend", function () {
            const img = preview.querySelector("img");
            if (!img) return;

            const style = window.getComputedStyle(img);
            const matrix = new WebKitCSSMatrix(style.transform);
            currentScale = Math.max(matrix.a, 1);
        });
    }

    // ---- QR modal (button "Предъявить") ----
    function openModal() {
        if (!overlay) return;
        overlay.classList.add("open");
        overlay.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }

    function closeModal() {
        if (!overlay) return;
        overlay.classList.remove("open");
        overlay.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }

    if (openBtn && overlay) {
        openBtn.addEventListener("click", (e) => {
            e.preventDefault();
            openModal();
        });
    }

    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (backdrop) backdrop.addEventListener("click", closeModal);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay?.classList.contains("open")) {
            closeModal();
        }
    });

    // ---- Share (button "Отправить документ") ----
    if (shareBtn) {
        shareBtn.addEventListener("click", async () => {
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: "Мой документ",
                        text: "Посмотри документ",
                        url: window.location.href,
                    });
                } catch (err) {
                    console.log("Share cancelled/error", err);
                }
            } else {
                alert("Ваш браузер не поддерживает системное меню 'Поделиться'. Попробуйте с телефона.");
            }
        });
    }
});
