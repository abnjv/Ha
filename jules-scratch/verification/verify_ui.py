import re
from playwright.sync_api import Page, expect, sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Navigate to the app
        page.goto("http://localhost:3002/Ha/", timeout=60000)
        page.wait_for_load_state("networkidle")

        # 2. Go to create group page
        page.get_by_role("button", name="إنشاء مجموعة جديدة...").click()
        expect(page).to_have_url(re.compile(r".*/create-group"))

        # 3. Create a group
        page.get_by_placeholder("أدخل اسماً لمجموعتك").fill("Test Group")
        # Click the first friend in the list to enable group creation
        page.locator('.space-y-2 > div').first.click()
        page.get_by_role("button", name="إنشاء وبدء الدردشة").click()

        # 4. Get group ID and navigate to chat
        expect(page).to_have_url(re.compile(r".*/group-chat/.*"), timeout=10000)
        page.screenshot(path="jules-scratch/verification/group_chat_page.png")

        # 5. Navigate to the live stream page
        page.goto("http://localhost:3002/Ha/stream/start", timeout=60000)
        page.wait_for_load_state("networkidle")
        expect(page.get_by_role("heading", name="Your Live Stream")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/livestream_page.png")

        print("Verification script completed successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/verification_error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
