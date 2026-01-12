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
    const loader = document.getElementById("loader");

    let startDistance = 0;
    let currentScale = 1;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let isPanning = false;
    let lastTapTime = 0;


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

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function applyTransform(img) {
        // если масштаб вернулся к 1 — сбрасываем позицию
        if (currentScale <= 1) {
            currentScale = 1;
            currentX = 0;
            currentY = 0;
        }

        img.style.transform =
            `translate(${currentX}px, ${currentY}px) scale(${currentScale})`;
    }

    preview.addEventListener("touchstart", (e) => {
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
    }, { passive: false });

    preview.addEventListener("touchstart", (e) => {
        const img = preview.querySelector("img");
        if (!img) return;

        // ---- DOUBLE TAP ----
        if (e.touches.length === 1) {
            const now = Date.now();
            const delta = now - lastTapTime;

            if (delta < 300 && delta > 0) {
                e.preventDefault();

                if (currentScale === 1) {
                    currentScale = 2;
                } else {
                    currentScale = 1;
                    currentX = 0;
                    currentY = 0;
                }

                applyTransform(img);
            }

            lastTapTime = now;
        }
    }, { passive: false });


    preview.addEventListener("touchmove", (e) => {
        const img = preview.querySelector("img");
        if (!img) return;

        e.preventDefault();

        // ---- PINCH ZOOM ----
        if (e.touches.length === 2) {
            const newDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );

            let newScale = currentScale * (newDistance / startDistance);
            newScale = clamp(newScale, 1, 4); // max zoom

            currentScale = newScale;
            startDistance = newDistance;

            applyTransform(img);
        }

        // ---- PAN ----
        if (e.touches.length === 1 && isPanning && currentScale > 1) {
            currentX = e.touches[0].clientX - startX;
            currentY = e.touches[0].clientY - startY;

            const maxX = (img.offsetWidth * currentScale - preview.offsetWidth) / 2;
            const maxY = (img.offsetHeight * currentScale - preview.offsetHeight) / 2;

            currentX = clamp(currentX, -maxX, maxX);
            currentY = clamp(currentY, -maxY, maxY);

            applyTransform(img);
        }
    }, { passive: false });

    preview.addEventListener("touchend", (e) => {
        const img = preview.querySelector("img");
        if (!img) return;

        if (e.touches.length === 0) {
            isPanning = false;

            if (currentScale < 1.05) {
                currentScale = 1;
                currentX = 0;
                currentY = 0;
                applyTransform(img);
            }
        }
    });


    // ---- QR modal (button "Предъявить") ----
    function openModal() {
        if (!overlay) return;

        const codeEl = document.getElementById("qrCode");
        if (codeEl) {
            codeEl.textContent = generateQrCode();
        }

        overlay.classList.add("open");
        overlay.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }

    function generateQrCode() {
        return Math.floor(100000 + Math.random() * 900000);
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

            showLoader();

            setTimeout(() => {
                hideLoader();
                openModal();
            }, 700); // задержка перед открытием
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

    function showLoader() {
        if (!loader) return;
        loader.classList.remove("hidden");
        loader.setAttribute("aria-hidden", "false");
    }

    function hideLoader() {
        if (!loader) return;
        loader.classList.add("hidden");
        loader.setAttribute("aria-hidden", "true");
    }

});
