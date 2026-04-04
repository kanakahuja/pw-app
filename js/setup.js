/* ============================================================
   js/setup.js
============================================================ */
function setBatchAndStart(value, el) {
  // Remove selection from all chips
  document.querySelectorAll(".batch-chip").forEach((c) => {
    c.classList.remove("active", "selected"); // clear both to be safe
  });

  // Select the clicked chip
  el.classList.add("active", "selected"); // add both so nav.js reset works

  const btn = document.getElementById("loginBtn"); // course-setup button
  if (!btn) return;

  btn.disabled = false;
  btn.style.opacity = "1";
  btn.style.cursor = "pointer";
  btn.textContent = `Start with ${value}  →`;

  localStorage.setItem("selectedBatch", value);

  // Bounce feedback
  btn.style.transform = "scale(1.03)";
  setTimeout(() => {
    btn.style.transform = "scale(1)";
  }, 150);
}
