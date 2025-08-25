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
        page.get_by_role("button", name="إنشاء وبدء الدردشة").click()

        # 4. Get group ID and navigate to chat
        expect(page).to_have_url(re.compile(r".*/group-chat/.*"), timeout=10000)

        # 5. Send a message
        chat_input = page.get_by_placeholder("أرسل رسالة...")
        expect(chat_input).to_be_visible()
        chat_input.fill("Hello from the test script!")
        page.get_by_role("button").last.click()

        # 6. Verify message appears
        expect(page.get_by_text("Hello from the test script!")).to_be_visible()

        # 7. Take a screenshot
        page.screenshot(path="jules-scratch/verification/group_chat_verification.png")

        print("Verification script completed successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/verification_error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
