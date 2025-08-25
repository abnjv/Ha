import re
from playwright.sync_api import Page, expect, sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Navigate to the app
        page.goto("http://localhost:3000/Ha/")

        # 2. Go to the profile page
        # Using a direct navigation because there may not be a clear button on the home page
        page.goto("http://localhost:3000/Ha/profile")
        expect(page.get_by_role("heading", name="الملف الشخصي")).to_be_visible()

        # 3. Go to the subscriptions page
        page.get_by_role("button", name="الاشتراكات").click()
        expect(page.get_by_role("heading", name="اختر خطة الاشتراك")).to_be_visible()

        # 4. Subscribe to the Premium plan
        # Get the button by its text "اشترك الآن" within the context of the premium plan div
        premium_plan_locator = page.locator(".plan").filter(has_text="الاشتراك المتميز")
        premium_plan_locator.get_by_role("button", name="اشترك الآن").click()

        # 5. Handle alert and wait for navigation
        page.on("dialog", lambda dialog: dialog.accept())

        # Wait for navigation to profile page and for subscription to appear
        expect(page).to_have_url(re.compile(r".*/Ha/profile"))
        expect(page.get_by_text("أنت مشترك في الباقة: الاشتراك المتميز")).to_be_visible()

        # 6. Take a screenshot of the profile with the active subscription
        page.screenshot(path="jules-scratch/verification/subscription_active.png")

        # 7. Cancel the subscription
        page.get_by_role("button", name="إلغاء الاشتراك").click()
        page.on("dialog", lambda dialog: dialog.accept())

        # 8. Verify the subscription is cancelled
        expect(page.get_by_text("أنت غير مشترك حاليًا.")).to_be_visible()

        # 9. Take a final screenshot
        page.screenshot(path="jules-scratch/verification/subscription_cancelled.png")

        print("Verification script completed successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/verification_error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
