/* ═══════════════════════════════════════════════════════════
   tes-petcounter.js
   Test suite untuk Kiro — Cute Cat Petting Clicker (index.html)
   Pendekatan: load index.html di iframe, simulasi klik, cek DOM
   ═══════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const frame = document.getElementById("app-frame");
  const resultsEl = document.getElementById("results");
  const summaryEl = document.getElementById("summary");

  let passed = 0;
  let failed = 0;
  const failures = [];

  /* ── Util assertion ── */
  function assert(condition, testName, detail) {
    if (condition) {
      passed++;
      addResult(true, testName, detail);
    } else {
      failed++;
      failures.push(testName);
      addResult(false, testName, detail);
    }
  }

  function addResult(isPass, name, detail) {
    const div = document.createElement("div");
    div.className = "test-item " + (isPass ? "test-pass" : "test-fail");
    div.innerHTML =
      '<span class="badge ' + (isPass ? "badge-pass" : "badge-fail") + '">' +
      (isPass ? "✓" : "✗") + "</span>" +
      "<div><strong>" + name + "</strong>" +
      (detail ? '<div class="test-detail">' + detail + "</div>" : "") +
      "</div>";
    resultsEl.appendChild(div);
  }

  function updateSummary() {
    const total = passed + failed;
    const allPass = failed === 0;
    summaryEl.textContent = allPass
      ? "✅ " + passed + "/" + total + " tes LULUS"
      : "❌ " + passed + "/" + total + " lulus, " + failed + " gagal";
    summaryEl.className = allPass ? "pass-bg" : "fail-bg";
  }

  /* ── Util: simulasikan klik pada elemen di dalam iframe ── */
  function clickCat(doc) {
    const cat = doc.getElementById("cat-stage");
    const rect = cat.getBoundingClientRect();
    const evt = new doc.defaultView.MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 3,
    });
    cat.dispatchEvent(evt);
  }

  /* ── Util: baca nilai counter dari DOM ── */
  function getCount(doc) {
    return parseInt(doc.getElementById("pet-count").textContent, 10);
  }

  /* ── Util: baca teks label reaksi ── */
  function getReactionName(doc) {
    return doc.getElementById("reaction-name").textContent.trim();
  }

  /* ── Util: baca label progress ── */
  function getProgressLabel(doc) {
    return doc.getElementById("progress-label").textContent.trim();
  }

  /* ── Util: baca width progress fill (%) ── */
  function getProgressWidth(doc) {
    return doc.getElementById("progress-fill").style.width;
  }

  /* ── Util: baca jumlah entry log ── */
  function getLogCount(doc) {
    return doc.querySelectorAll("#reaction-log .log-entry").length;
  }

  /* ── Util: cek apakah placeholder masih ada ── */
  function hasPlaceholder(doc) {
    return !!doc.querySelector("#reaction-log p.italic");
  }

  /* ── Util: baca badge milestone berdasarkan index ── */
  function getBadgeClass(doc, index) {
    const badges = doc.querySelectorAll("#milestones-grid .milestone-badge");
    return badges[index] ? badges[index].className : "";
  }

  /* ── Util: baca icon tombol sound ── */
  function getSoundIcon(doc) {
    return doc.getElementById("sound-btn").textContent.trim();
  }

  /* ── Util: baca aria-label tombol sound ── */
  function getSoundAriaLabel(doc) {
    return doc.getElementById("sound-btn").getAttribute("aria-label");
  }

  /* ── Util: klik tombol sound ── */
  function clickSoundBtn(doc) {
    doc.getElementById("sound-btn").dispatchEvent(
      new doc.defaultView.MouseEvent("click", { bubbles: true })
    );
  }

  /* ═══════════════════════════════════════════════
     TEST CASES
     ═══════════════════════════════════════════════ */

  function runTests() {
    const doc = frame.contentDocument;

    /* ── Grup 1: Counter dasar ── */
    assert(
      getCount(doc) === 0,
      "1. Counter mulai dari 0 saat fresh load",
      "Expected 0, got " + getCount(doc)
    );

    clickCat(doc);
    assert(
      getCount(doc) === 1,
      "2. Counter bertambah ke 1 setelah 1 klik",
      "Expected 1, got " + getCount(doc)
    );

    for (let i = 0; i < 4; i++) clickCat(doc);
    assert(
      getCount(doc) === 5,
      "3. Counter bertambah ke 5 setelah 5 klik total",
      "Expected 5, got " + getCount(doc)
    );

    const beforeClick = getCount(doc);
    clickCat(doc);
    assert(
      getCount(doc) === beforeClick + 1,
      "4. Counter bertambah tepat +1 per klik",
      "Expected " + (beforeClick + 1) + ", got " + getCount(doc)
    );

    /* ── Grup 2: Label reaksi ── */
    assert(
      getReactionName(doc) !== "— waiting for love —",
      "5. Label reaksi berubah dari placeholder setelah klik",
      "Got: '" + getReactionName(doc) + "'"
    );

    assert(
      getReactionName(doc).length > 0,
      "6. Label reaksi tidak kosong setelah klik",
      "Got empty string"
    );

    /* ── Grup 3: Reaction log ── */
    assert(
      !hasPlaceholder(doc),
      "7. Placeholder log hilang setelah klik pertama",
      "Placeholder masih ada"
    );

    assert(
      getLogCount(doc) === 6,
      "8. Log berisi 6 entry setelah 6 klik",
      "Expected 6, got " + getLogCount(doc)
    );

    /* Klik lebih dari 8x untuk tes cap */
    for (let i = 0; i < 10; i++) clickCat(doc); // total 16 klik
    assert(
      getLogCount(doc) === 8,
      "9. Log tidak pernah melebihi 8 entry (cap 8)",
      "Expected 8, got " + getLogCount(doc)
    );

    /* ── Grup 4: Entry log paling atas = terbaru ── */
    const entries = doc.querySelectorAll("#reaction-log .log-entry");
    const topEntry = entries[0];
    const topCountText = topEntry.querySelector(".ml-auto").textContent;
    const expectedCount = getCount(doc);
    assert(
      topCountText === "#" + expectedCount,
      "10. Entry teratas di log = reaksi terbaru (#" + expectedCount + ")",
      "Expected #" + expectedCount + ", got " + topCountText
    );

    /* ── Grup 5: Progress bar ── */
    const countAfter16 = getCount(doc); // 16
    assert(
      getProgressLabel(doc) === countAfter16 + " / 25",
      "11. Label progress menunjukkan " + countAfter16 + " / 25",
      "Expected '" + countAfter16 + " / 25', got '" + getProgressLabel(doc) + "'"
    );

    /* ── Grup 6: Milestone badge ── */
    /* Badge 0 (First Pets, at:10) harus unlocked karena count=16 */
    assert(
      getBadgeClass(doc, 0).includes("badge-unlocked"),
      "12. Badge 'First Pets!' (10 pets) unlocked",
      "Class: " + getBadgeClass(doc, 0)
    );

    /* Badge 1 (Bonded, at:25) harus masih locked */
    assert(
      getBadgeClass(doc, 1).includes("badge-locked"),
      "13. Badge 'Bonded!' (25 pets) masih locked",
      "Class: " + getBadgeClass(doc, 1)
    );

    /* Klik sampai 25 untuk unlock badge Bonded */
    while (getCount(doc) < 25) clickCat(doc);
    assert(
      getBadgeClass(doc, 1).includes("badge-unlocked"),
      "14. Badge 'Bonded!' unlocked setelah 25 pets",
      "Class: " + getBadgeClass(doc, 1)
    );

    /* Klik sampai 50 untuk unlock badge Best Friends */
    while (getCount(doc) < 50) clickCat(doc);
    assert(
      getBadgeClass(doc, 2).includes("badge-unlocked"),
      "15. Badge 'Best Friends!' unlocked setelah 50 pets",
      "Class: " + getBadgeClass(doc, 2)
    );

    /* ── Grup 7: Progress bar di MAX ── */
    /* Klik sampai 100 */
    while (getCount(doc) < 100) clickCat(doc);
    assert(
      getBadgeClass(doc, 3).includes("badge-unlocked"),
      "16. Badge 'Cat Royalty!' unlocked setelah 100 pets",
      "Class: " + getBadgeClass(doc, 3)
    );

    assert(
      getProgressLabel(doc).includes("MAX"),
      "17. Label progress menampilkan MAX setelah semua milestone",
      "Got: '" + getProgressLabel(doc) + "'"
    );

    assert(
      getProgressWidth(doc) === "100%",
      "18. Progress bar 100% setelah semua milestone",
      "Got: " + getProgressWidth(doc)
    );

    /* ── Grup 8: Tombol sound ── */
    /* Reload iframe untuk reset state */
    const oldSrc = frame.src;
    frame.src = "about:blank";

    frame.onload = function () {
      frame.src = oldSrc;
      frame.onload = function () {
        const doc2 = frame.contentDocument;

        assert(
          getSoundIcon(doc2) === "🔇",
          "19. Tombol sound menampilkan icon muted (🔇) saat fresh load",
          "Got: " + getSoundIcon(doc2)
        );

        clickSoundBtn(doc2);
        assert(
          getSoundIcon(doc2) === "🔊",
          "20. Tombol sound berubah ke icon on (🔊) setelah diklik",
          "Got: " + getSoundIcon(doc2)
        );

        const ariaAfterOn = getSoundAriaLabel(doc2);
        assert(
          ariaAfterOn !== "Toggle sound",
          "21. aria-label tombol sound berubah setelah toggle ON",
          "Got: '" + ariaAfterOn + "'"
        );

        clickSoundBtn(doc2);
        assert(
          getSoundIcon(doc2) === "🔇",
          "22. Tombol sound kembali muted (🔇) setelah klik kedua",
          "Got: " + getSoundIcon(doc2)
        );

        /* ── Grup 9: Counter kembali 0 setelah reload ── */
        assert(
          getCount(doc2) === 0,
          "23. Counter reset ke 0 setelah reload halaman",
          "Expected 0, got " + getCount(doc2)
        );

        /* ── Grup 10: Keyboard accessibility ── */
        const catStage = doc2.getElementById("cat-stage");
        assert(
          catStage.getAttribute("tabindex") === "0",
          "24. Cat stage memiliki tabindex=0 (keyboard focusable)",
          "Got: " + catStage.getAttribute("tabindex")
        );

        assert(
          catStage.getAttribute("role") === "button",
          "25. Cat stage memiliki role=button untuk a11y",
          "Got: " + catStage.getAttribute("role")
        );

        /* Simulasi Enter key */
        const enterEvt = new doc2.defaultView.KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        });
        catStage.dispatchEvent(enterEvt);
        assert(
          getCount(doc2) === 1,
          "26. Klik Enter pada cat yang focus menambah counter +1",
          "Expected 1, got " + getCount(doc2)
        );

        /* Simulasi Space key */
        const spaceEvt = new doc2.defaultView.KeyboardEvent("keydown", {
          key: " ",
          bubbles: true,
          cancelable: true,
        });
        catStage.dispatchEvent(spaceEvt);
        assert(
          getCount(doc2) === 2,
          "27. Klik Space pada cat yang focus menambah counter +1",
          "Expected 2, got " + getCount(doc2)
        );

        /* ── Grup 11: Bubble reaksi muncul ── */
        const bubble = doc2.getElementById("reaction-bubble");
        assert(
          bubble.classList.contains("visible"),
          "28. Reaction bubble muncul (.visible) setelah klik",
          "Classes: " + bubble.className
        );

        const bubbleText = bubble.querySelector(".bubble-inner").textContent;
        assert(
          bubbleText.length > 0,
          "29. Reaction bubble berisi teks reaksi",
          "Got: '" + bubbleText + "'"
        );

        /* ── Selesai ── */
        updateSummary();
        console.log(
          failures.length > 0
            ? "Tes gagal: " + failures.join(", ")
            : "Semua tes lulus!"
        );
      };
    };
  }

  /* ── Tunggu iframe selesai load lalu jalankan tes ── */
  frame.addEventListener("load", function () {
    // Beri sedikit delay agar semua inisialisasi IIFE selesai
    setTimeout(runTests, 300);
  });
})();
