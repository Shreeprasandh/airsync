import { chromium } from "playwright";
import fs from "fs";
import path from "path";

async function inspectAllViews() {
  console.log("================================================================================");
  console.log("       SENTINELMRO FULL SPECTRUM DEEP UI & SYSTEM AUDIT BENCHMARK        ");
  console.log("================================================================================");

  const screenshotDir = path.resolve("./audit_screenshots");
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
  } catch {
    browser = await chromium.launch({ headless: true, channel: "msedge" });
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const issuesFound = [];
  const warnings = [];

  page.on("console", msg => {
    const text = msg.text();
    if (msg.type() === "error") {
      if (!text.includes("favicon") && !text.includes("WebSocket")) {
        issuesFound.push(`[Console Error] ${text}`);
      }
    } else if (msg.type() === "warning") {
      if (!text.includes("hydration") && !text.includes("React DevTools")) {
        warnings.push(`[Console Warning] ${text}`);
      }
    }
  });

  page.on("pageerror", err => {
    issuesFound.push(`[Page Crash/Exception] ${err.message}`);
  });

  const check = (feature, condition, detail = "") => {
    if (condition) {
      console.log(`[PASS] ${feature}`);
    } else {
      console.error(`[FAIL] ${feature}: ${detail}`);
      issuesFound.push(`[Feature Failure] ${feature}: ${detail}`);
    }
  };

  try {
    // 1. Boot Login View
    console.log("\n[VIEW 1] Testing Login Screen & Brand Elements...");
    await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${screenshotDir}/01_login_screen.png` });

    const techInput = page.locator("input").first();
    check("Technician Input Visible", await techInput.isVisible());
    const loginBtn = page.locator("button[type='submit']");
    check("Login Button Functional", await loginBtn.isVisible());
    
    // Check for placeholder text or generic AI phrases
    const loginText = await page.textContent("body");
    if (loginText.includes("Lorem ipsum") || loginText.includes("placeholder")) {
      issuesFound.push("[Aesthetic] Login screen contains placeholder/dummy text.");
    }

    await loginBtn.click();
    await page.waitForTimeout(800);

    // 2. Hangar Selector View
    console.log("\n[VIEW 2] Testing Hangar Station Selector...");
    await page.screenshot({ path: `${screenshotDir}/02_hangar_selector.png` });
    const blrCard = page.locator("text=Bengaluru (BLR)").first();
    const bomCard = page.locator("text=Mumbai (BOM)").first();
    const delCard = page.locator("text=Delhi (DEL)").first();
    check("BLR Mega-MRO Card Present", await blrCard.isVisible());
    check("BOM Station Card Present", await bomCard.isVisible());
    check("DEL Station Card Present", await delCard.isVisible());

    await blrCard.click();
    await page.waitForTimeout(1200);

    // 3. Regional Fleet Dashboard
    console.log("\n[VIEW 3] Testing Regional Flight Radar Fleet Dashboard...");
    await page.screenshot({ path: `${screenshotDir}/03_fleet_dashboard.png` });
    
    const radarTitle = page.locator("text=Air India Fleet").first();
    check("Fleet Radar Title Rendered", await radarTitle.isVisible());

    // Check for aircraft status cards
    const planeCards = page.locator("button:has-text('AI-101'), button:has-text('AI-202')");
    check("Aircraft Fleet Cards Present", (await planeCards.count()) > 0);

    // 4. Asset Detail (Turbofan Gas Path Blueprint)
    console.log("\n[VIEW 4] Testing Asset Detail / Turbofan Blueprint...");
    const firstPlane = page.locator("button:has-text('AI-101')").first();
    if (await firstPlane.isVisible()) {
      await firstPlane.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${screenshotDir}/04_asset_detail.png` });

      const blueprintHeader = page.locator("text=Propulsion System & Sensor Array").first();
      check("Turbofan Propulsion Blueprint Rendered", await blueprintHeader.isVisible());

      const egtSensor = page.locator("text=T48").first();
      check("C-MAPSS Sensor T48 Displayed", await egtSensor.isVisible());
    }

    // 5. Sentinel Gateway / MMR Ledger View
    console.log("\n[VIEW 5] Testing Sentinel Gateway & Cryptographic Ledger...");
    const ledgerTabBtn = page.locator("button:has-text('Audit DAG'), button:has-text('Ledger'), button:has-text('SENTINEL GATEWAY')").first();
    if (await ledgerTabBtn.isVisible()) {
      await ledgerTabBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${screenshotDir}/05_sentinel_gateway.png` });

      const mmrAuditTable = page.locator("text=Audit Log Registry").first();
      check("MMR Audit Log Table Rendered", await mmrAuditTable.isVisible());

      const rootHashEl = page.locator("text=Root Hash").first();
      check("Merkle Mountain Range Root Displayed", await rootHashEl.isVisible());
    }

    // 6. Test Modals Interactivity
    console.log("\n[VIEW 6] Testing Modals & Action Hooks...");

    // A. ACARS 48B Packet Modal
    const acarsBtn = page.locator("button:has-text('INSPECT ACARS 48B PACKET'), button:has-text('ACARS 48-BYTE')").first();
    if (await acarsBtn.isVisible()) {
      await acarsBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${screenshotDir}/06_acars_modal.png` });
      check("ACARS Modal Rendered", await page.locator("text=ARINC 620").first().isVisible());
      const closeBtn = page.locator(".fixed button").first();
      await closeBtn.click();
      await page.waitForTimeout(400);
    }

    // B. SAC-008 Defense Matrix Modal
    const matrixBtn = page.locator("button:has-text('DEFENSE MATRIX')").first();
    if (await matrixBtn.isVisible()) {
      await matrixBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${screenshotDir}/07_defense_matrix_modal.png` });
      check("Defense Matrix Modal Rendered", await page.locator("text=DO-178C").first().isVisible());
      
      // Test question tab clicking
      const q2Tab = page.locator("button:has-text('Anti-Blockchain')").first();
      if (await q2Tab.isVisible()) {
        await q2Tab.click();
        await page.waitForTimeout(300);
        check("Defense Matrix Q2 Tab Selectable", await page.locator("text=Peter Todd").first().isVisible());
      }
      const closeMatrix = page.locator(".fixed button:has(.lucide-x)").first();
      await closeMatrix.click();
      await page.waitForTimeout(400);
    }

    // C. DGCA Form 1 CRS Certificate Modal
    const crsBtn = page.locator("button:has-text('VIEW CERTIFICATE (CRS / DGCA FORM 1)')").first();
    if (await crsBtn.isVisible()) {
      await crsBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${screenshotDir}/08_crs_certificate_modal.png` });
      check("DGCA Form 1 CRS Modal Rendered", await page.locator("text=DIRECTORATE GENERAL OF CIVIL AVIATION").first().isVisible());
      
      const downloadBtn = page.locator("button:has-text('DOWNLOAD PDF'), a:has-text('DOWNLOAD PDF')").first();
      check("CRS PDF Download Button Active", await downloadBtn.isVisible());
      const closeCrs = page.locator(".fixed button:has(.lucide-x)").first();
      await closeCrs.click();
      await page.waitForTimeout(400);
    }

    // D. Cryptographic Tamper Diff Modal
    const tamperBtn = page.locator("button:has-text('INSPECT BIT-DIFF'), button:has-text('TAMPER DIFF')").first();
    if (await tamperBtn.isVisible()) {
      await tamperBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${screenshotDir}/09_tamper_diff_modal.png` });
      check("Tamper Diff Modal Rendered", await page.locator("text=Peter Todd MMR Mismatch").first().isVisible());
      const closeTamper = page.locator(".fixed button:has(.lucide-x)").first();
      await closeTamper.click();
      await page.waitForTimeout(400);
    }

    // E. Swiss-AS AMOS Work Order Modal
    const act2Btn = page.locator("button:has-text('Act 2: HPC Decay & AMOS')").first();
    if (await act2Btn.isVisible()) {
      await act2Btn.click();
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${screenshotDir}/10_amos_work_order_modal.png` });
      check("AMOS Modal Rendered", await page.locator("text=Swiss-AS AMOS").first().isVisible());
      
      const dispatchBtn = page.locator("button:has-text('DISPATCH & COMMIT TO MMR')").first();
      check("AMOS Dispatch Button Active", await dispatchBtn.isVisible());

      const cancelBtn = page.locator("button:has-text('Cancel')").first();
      await cancelBtn.click();
      await page.waitForTimeout(400);
    }

    // F. Interactive Guided Tour Controller
    console.log("\n[VIEW 7] Testing Interactive Guided Tour Controller...");
    const tourBtn = page.locator("button:has-text('GUIDED TOUR')").first();
    if (await tourBtn.isVisible()) {
      await tourBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${screenshotDir}/11_guided_tour_controller.png` });
      check("Guided Tour Bar Rendered", await page.locator("text=INNOVENT-27 TOUR").first().isVisible());
      
      const nextBtn = page.locator("button:has-text('NEXT STEP')").first();
      await nextBtn.click();
      await page.waitForTimeout(500);
      check("Guided Tour Step 2 Advanced", await page.locator("text=Act 1").first().isVisible());

      const exitTour = page.locator("button[title='Exit Presentation Tour']").first();
      await exitTour.click();
      await page.waitForTimeout(300);
    }

    console.log("\n================================================================================");
    console.log(`AUDIT COMPLETE: ${issuesFound.length} Issues Detected, ${warnings.length} Warnings`);
    console.log("================================================================================");

    if (issuesFound.length > 0) {
      console.log("\nDETAILED ISSUES:");
      issuesFound.forEach((iss, i) => console.log(`${i + 1}. ${iss}`));
    }
    if (warnings.length > 0) {
      console.log("\nWARNINGS:");
      warnings.forEach((warn, i) => console.log(`${i + 1}. ${warn}`));
    }

  } catch (err) {
    console.error("Deep Audit encountered fatal error:", err);
  } finally {
    await browser.close();
  }
}

inspectAllViews();
