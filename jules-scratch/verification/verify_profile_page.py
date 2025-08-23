import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            await page.goto("file:///app/dist/index.html")
            await page.wait_for_timeout(5000) # Wait for 5 seconds
            await page.screenshot(path="jules-scratch/verification/final_verification_attempt.png")
            print("Screenshot taken.")
        except Exception as e:
            print(f"An error occurred: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
