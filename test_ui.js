const { test, expect } = require('@playwright/test');

test.describe('中国象棋 UI 测试', () => {
    test('主菜单显示正常', async ({ page }) => {
        await page.goto('http://localhost:5000', { timeout: 10000 });
        await page.waitForTimeout(2000);
        
        const mainMenu = await page.locator('#mainMenu').isVisible();
        expect(mainMenu).toBeTruthy();
        
        const title = await page.locator('.game-title').textContent();
        expect(title).toContain('中国象棋');
        
        const modeButtons = await page.locator('.mode-btn').count();
        expect(modeButtons).toBe(3);
        
        console.log('✓ 主菜单显示正常');
    });

    test('点击模式按钮进入游戏', async ({ page }) => {
        await page.goto('http://localhost:5000', { timeout: 10000 });
        await page.waitForTimeout(2000);
        
        await page.click('.mode-btn.pvp');
        await page.waitForTimeout(2000);
        
        const gameView = await page.locator('#gameView').isVisible();
        expect(gameView).toBeTruthy();
        
        const board = await page.locator('#board').isVisible();
        expect(board).toBeTruthy();
        
        console.log('✓ 点击模式按钮进入游戏');
    });

    test('返回按钮功能', async ({ page }) => {
        await page.goto('http://localhost:5000', { timeout: 10000 });
        await page.waitForTimeout(2000);
        
        await page.click('.mode-btn.pvp');
        await page.waitForTimeout(2000);
        
        await page.click('.back-btn');
        await page.waitForTimeout(1000);
        
        const mainMenu = await page.locator('#mainMenu').isVisible();
        expect(mainMenu).toBeTruthy();
        
        console.log('✓ 返回按钮功能正常');
    });

    test('音效开关功能', async ({ page }) => {
        await page.goto('http://localhost:5000', { timeout: 10000 });
        await page.waitForTimeout(2000);
        
        await page.click('.mode-btn.pvp');
        await page.waitForTimeout(2000);
        
        const soundBtn = await page.locator('#soundBtn');
        const initialText = await soundBtn.textContent();
        
        await soundBtn.click();
        await page.waitForTimeout(500);
        
        const newText = await soundBtn.textContent();
        expect(newText).not.toBe(initialText);
        
        console.log('✓ 音效开关功能正常');
    });

    test('功能按钮显示正确', async ({ page }) => {
        await page.goto('http://localhost:5000', { timeout: 10000 });
        await page.waitForTimeout(2000);
        
        await page.click('.mode-btn.pvp');
        await page.waitForTimeout(2000);
        
        const undoBtn = await page.locator('#undoBtn').isVisible();
        const drawBtn = await page.locator('#drawBtn').isVisible();
        const resignBtn = await page.locator('#resignBtn').isVisible();
        
        expect(undoBtn).toBeTruthy();
        expect(drawBtn).toBeTruthy();
        expect(resignBtn).toBeTruthy();
        
        console.log('✓ PvP 模式功能按钮显示正确');
    });

    test('AIvAI 模式按钮显示', async ({ page }) => {
        await page.goto('http://localhost:5000', { timeout: 10000 });
        await page.waitForTimeout(2000);
        
        await page.click('.mode-btn.aivai');
        await page.waitForTimeout(2000);
        
        const pauseBtn = await page.locator('#pauseBtn').isVisible();
        const undoBtn = await page.locator('#undoBtn').isVisible();
        
        expect(pauseBtn).toBeTruthy();
        expect(undoBtn).toBeFalsy();
        
        console.log('✓ AIvAI 模式按钮显示正确');
    });
});

console.log('\n========== UI 测试完成 ==========');
