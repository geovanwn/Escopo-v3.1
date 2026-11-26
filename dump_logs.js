const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const logs = [];
    page.on('console', msg => {
        logs.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', err => {
        logs.push(`[pageerror] ${err.name}: ${err.message}\n${err.stack}`);
    });

    try {
        console.log("Navigating to dashboard...");
        await page.goto('http://localhost:5173/#/');
        await page.waitForTimeout(3000); // 3 seconds to load

        console.log("Navigating to payroll module...");
        await page.goto('http://localhost:5173/#/app/payroll');
        await page.waitForTimeout(5000); // Wait for crash

        fs.writeFileSync('browser_logs.txt', logs.join('\n'));
        console.log("Logs saved to browser_logs.txt");

    } catch (error) {
        console.error("Script error:", error);
    } finally {
        await browser.close();
    }
})();
