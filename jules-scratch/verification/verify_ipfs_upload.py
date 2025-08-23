import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            # 1. Navigate to the application.
            await page.goto("http://localhost:3000/Ha/")

            # 2. Wait for the main dashboard to be visible to ensure the page has loaded.
            await expect(page.get_by_role("heading", name="Live Streams")).to_be_visible(timeout=20000)

            # 3. Locate the file input element.
            file_input = page.locator('input[type="file"]')
            await expect(file_input).to_be_visible()

            # 4. Set the file to upload.
            await file_input.set_input_files("jules-scratch/verification/test.txt")

            # 5. Take a screenshot to show the file input and the component.
            await page.screenshot(path="jules-scratch/verification/ipfs-upload-verification.png")

            print("Screenshot taken successfully.")

        except Exception as e:
            print(f"An error occurred: {e}")
            await page.screenshot(path="jules-scratch/verification/verification_error.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
