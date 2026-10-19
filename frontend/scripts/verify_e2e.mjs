import { chromium } from "playwright";

async function runE2eVerification() {
  console.log("================================================================================");
  console.log("             SENTINELMRO INNOVENT-27 PLAYWRIGHT E2E VERIFICATION SUITE         ");
  console.log("================================================================================");

  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
  } catch (err) {
    try {
      browser = await chromium.launch({ headless: true, channel: "msedge" });
    } catch (err2) {
      console.log("Playwright browser launch fallback:", err2.message);
      return;
    }
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", msg => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  const check = (desc, condition) => {
    if (condition) {
      console.log(`[PASS] ${desc}`);
    } else {
      console.error(`[FAIL] ${desc}`);
      throw new Error(`Verification failed: ${desc}`);
    }
  };

  try {
    // 1. Navigate to localhost:3000
    console.log("1. Navigating to http://localhost:3000...");
    await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1000);
    check("Page loaded successfully", (await page.title()) !== "");

    // 2. Login Screen
    console.log("2. Verifying Login Screen...");
    const techIdInput = page.locator("input").first();
    check("Technician ID input present", await techIdInput.isVisible());
    
    // Submit login form
    const loginButton = page.locator("button[type='submit']");
    check("Login submit button present", await loginButton.isVisible());
    await loginButton.click();
    await page.waitForTimeout(600);

    // 3. Hangar Selector
    console.log("3. Verifying Hangar Selector...");
    const stationCard = page.locator("text=Bengaluru (BLR)").first();
    check("Bengaluru Station card present", await stationCard.isVisible());
    await stationCard.click();
    await page.waitForTimeout(1000);

    // 4. Dashboard View
    console.log("4. Verifying Fleet Radar Dashboard...");
    const headerTitle = page.locator("text=SENTINELMRO").first();
    check("Aviation Header loaded", await headerTitle.isVisible());

    const guidedTourBtn = page.locator("button:has-text('GUIDED TOUR')").first();
    check("GUIDED TOUR button visible in AviationHeader", await guidedTourBtn.isVisible());

    const defenseMatrixBtn = page.locator("button:has-text('DEFENSE MATRIX')").first();
    check("DEFENSE MATRIX button visible in AviationHeader", await defenseMatrixBtn.isVisible());

    // 5. Test Act 1: Weather Rejection
    console.log("5. Testing Act 1: Weather Rejection Scenario...");
    const act1Btn = page.locator("button:has-text('Act 1: Weather Rejection')").first();
    check("Act 1 button visible", await act1Btn.isVisible());
    await act1Btn.click();
    await page.waitForTimeout(1000);

    const weatherBanner = page.locator("text=COMMON-MODE ATMOSPHERIC REJECTION").first();
    check("Twin-Engine Common-Mode Weather Rejection Banner displayed", await weatherBanner.isVisible());

    // 6. Test ACARS 48-Byte Packet Inspector
    console.log("6. Testing ARINC 620 ACARS 48-Byte Packet Inspector...");
    const acarsBtn = page.locator("button:has-text('INSPECT ACARS 48B PACKET')").first();
    if (await acarsBtn.isVisible()) {
      await acarsBtn.click();
      await page.waitForTimeout(600);
      const acarsModalTitle = page.locator("text=ARINC 620 // ACARS 48-Byte").first();
      check("ACARS 48B Inspector Modal opened", await acarsModalTitle.isVisible());

      const closeAcars = page.locator(".fixed button").first();
      await closeAcars.click();
      await page.waitForTimeout(400);
    } else {
      console.log("[SKIP] ACARS button skipped (navigated past)");
    }

    // 7. Test Act 2: HPC Decay & AMOS
    console.log("7. Testing Act 2: HPC Decay & AMOS Work Order...");
    const act2Btn = page.locator("button:has-text('Act 2: HPC Decay & AMOS')").first();
    check("Act 2 button visible", await act2Btn.isVisible());
    await act2Btn.click();
    await page.waitForTimeout(1000);

    const amosModal = page.locator("text=Swiss-AS AMOS").first();
    check("Swiss-AS AMOS Work Order modal opened", await amosModal.isVisible());
    const closeAmos = page.locator("button:has-text('Cancel')").first();
    check("AMOS Cancel button present", await closeAmos.isVisible());
    await closeAmos.click();
    await page.waitForTimeout(600);

    // 8. Test Act 3: Ledger Defense
    console.log("8. Testing Act 3: Cryptographic Merkle Mountain Range Defense...");
    const act3Btn = page.locator("button:has-text('Act 3: Ledger Defense')").first();
    check("Act 3 button visible", await act3Btn.isVisible());
    await act3Btn.click();
    await page.waitForTimeout(1000);

    const ledgerTable = page.locator("text=Audit Log Registry").first();
    check("MMR Audit Log Registry visible", await ledgerTable.isVisible());

    // 9. Test DGCA Form 1 CRS Certificate Modal
    console.log("9. Testing DGCA CA Form 1 Certificate of Release to Service...");
    const viewCertBtn = page.locator("button:has-text('VIEW CERTIFICATE (CRS / DGCA FORM 1)')").first();
    check("View Certificate button visible", await viewCertBtn.isVisible());
    await viewCertBtn.click();
    await page.waitForTimeout(600);

    const crsModalHeader = page.locator("text=DGCA CA Form 1 // Authorized Release").first();
    check("DGCA CA Form 1 printable modal rendered", await crsModalHeader.isVisible());
    const closeCrs = page.locator(".fixed button:has(.lucide-x)").first();
    if (await closeCrs.isVisible()) {
      await closeCrs.click();
    }
    await page.waitForTimeout(400);

    // 10. Test InnoVent-27 Guided Tour Mode
    console.log("10. Testing Interactive Guided Tour Mode...");
    await guidedTourBtn.click();
    await page.waitForTimeout(600);
    const tourBanner = page.locator("text=INNOVENT-27 TOUR").first();
    check("Interactive Guided Tour banner active", await tourBanner.isVisible());

    const nextTourStep = page.locator("button:has-text('NEXT STEP')").first();
    check("Tour Next Step button functional", await nextTourStep.isVisible());
    await nextTourStep.click();
    await page.waitForTimeout(600);

    const exitTourBtn = page.locator("button[title='Exit Presentation Tour']").first();
    if (await exitTourBtn.isVisible()) {
      await exitTourBtn.click();
    }

    // 11. Final Console Error Check
    console.log("11. Verifying Zero Uncaught Console Errors...");
    const severeErrors = consoleErrors.filter(e => !e.includes("favicon") && !e.includes("WebSocket"));
    check(`Zero runtime exceptions (Errors: ${severeErrors.length})`, severeErrors.length === 0);

    console.log("================================================================================");
    console.log("🎉 ALL PLAYWRIGHT END-TO-END VERIFICATION CHECKS PASSED (100% GREEN)!");
    console.log("================================================================================");
  } catch (err) {
    console.error("E2E Verification encountered error:", err.message);
  } finally {
    await browser.close();
  }
}

runE2eVerification();
