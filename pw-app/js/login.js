/* ============================================================
   js/login.js
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const phoneInput = document.getElementById("phoneInput");
  const otpBoxes = Array.from(document.querySelectorAll("#otpRow .otp-box"));
  const continueBtn = document.getElementById("continueBtn");
  const resendBtn = document.getElementById("resendBtn");

  // ── Initial state ──
  if (continueBtn) {
    continueBtn.disabled = true;
    continueBtn.style.opacity = "0.55";
    continueBtn.style.cursor = "not-allowed";
  }

  // ── Phone: digits only, max 10 ──
  if (phoneInput) {
    phoneInput.addEventListener("input", () => {
      phoneInput.value = phoneInput.value.replace(/\D/g, "").slice(0, 10);
    });
  }

  // ── OTP boxes ──
  otpBoxes.forEach((box, i) => {
    box.addEventListener("input", () => {
      box.value = box.value.replace(/\D/g, "").slice(-1);
      box.classList.toggle("filled", !!box.value);
      if (box.value && otpBoxes[i + 1]) otpBoxes[i + 1].focus();
      syncBtn();
    });

    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !box.value && otpBoxes[i - 1]) {
        otpBoxes[i - 1].value = "";
        otpBoxes[i - 1].classList.remove("filled");
        otpBoxes[i - 1].focus();
      }
      if (e.key === "ArrowLeft" && otpBoxes[i - 1]) otpBoxes[i - 1].focus();
      if (e.key === "ArrowRight" && otpBoxes[i + 1]) otpBoxes[i + 1].focus();
    });

    // Paste full OTP into any box
    box.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData)
        .getData("text")
        .replace(/\D/g, "");
      text
        .split("")
        .slice(0, otpBoxes.length)
        .forEach((ch, j) => {
          if (otpBoxes[j]) {
            otpBoxes[j].value = ch;
            otpBoxes[j].classList.add("filled");
          }
        });
      const nextFocus = Math.min(text.length, otpBoxes.length - 1);
      otpBoxes[nextFocus].focus();
      syncBtn();
    });
  });

  // ── Enable Continue only when all 5 OTP digits filled ──
  function syncBtn() {
    if (!continueBtn) return;
    const allFilled = otpBoxes.every((b) => b.value !== "");
    continueBtn.disabled = !allFilled;
    continueBtn.style.opacity = allFilled ? "1" : "0.55";
    continueBtn.style.cursor = allFilled ? "pointer" : "not-allowed";
  }

  // ── Continue button → navigate to course-setup ──
  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      const phone = phoneInput ? phoneInput.value.trim() : "";
      const otp = otpBoxes.map((b) => b.value).join("");

      if (phone.length < 10) {
        showToast("Enter a valid 10-digit mobile number");
        if (phoneInput) phoneInput.focus();
        return;
      }
      if (otp.length !== otpBoxes.length) {
        showToast("Enter the complete OTP");
        return;
      }

      localStorage.setItem("userPhone", phone);

      // Use navigation.js goTo so stagger + sounds fire correctly
      // AFTER
      if (typeof goTo === "function") {
        goTo("course-setup");
      } else {
        // Fallback: manual screen switch
        document.getElementById("login").classList.remove("active");
        document.getElementById("course-setup").classList.add("active");
      }
    });
  }

  // ── Resend OTP: clear boxes + 30s cooldown ──
  if (resendBtn) {
    resendBtn.addEventListener("click", () => {
      if (resendBtn.disabled) return;

      otpBoxes.forEach((b) => {
        b.value = "";
        b.classList.remove("filled");
      });
      if (otpBoxes[0]) otpBoxes[0].focus();
      syncBtn();

      resendBtn.disabled = true;
      resendBtn.style.color = "#aaa";
      let t = 30;
      resendBtn.textContent = `Resend in ${t}s`;

      const iv = setInterval(() => {
        t--;
        if (t <= 0) {
          clearInterval(iv);
          resendBtn.textContent = "Resend OTP";
          resendBtn.style.color = "";
          resendBtn.disabled = false;
        } else {
          resendBtn.textContent = `Resend in ${t}s`;
        }
      }, 1000);
    });
  }
});
