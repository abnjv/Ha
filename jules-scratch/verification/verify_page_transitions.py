from playwright.sync_api import sync_playwright, expect
import time

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Listen for console events to help with debugging
        page.on("console", lambda msg: print(f"Browser Console: {msg.type} {msg.text}"))

        try:
            # The app is running on port 3001 with base path /Ha/
            base_url = "http://localhost:3001/Ha"

            # 1. Go to the login page
            print(f"Navigating to login page at {base_url}/login...")
            page.goto(f"{base_url}/login", timeout=15000)

            # 2. Verify the login screen is visible
            login_button = page.get_by_role("button", name="تسجيل الدخول")
            expect(login_button).to_be_visible(timeout=10000)
            print("Login page loaded successfully.")
            page.screenshot(path="jules-scratch/verification/01_login_page.png")
            print("Screenshot of login page saved.")

            # 3. Hacky login: set a value in local storage to simulate being logged in.
            # This is necessary because we can't do a real OAuth flow.
            # The key 'firebase:authUser' is a common pattern for Firebase web apps.
            # We give it a dummy value. The ProtectedRoute only checks for presence.
            page.evaluate("""
                localStorage.setItem('firebase:authUser:glowing-telegram-a49d6:undefined', JSON.stringify({
                    "uid": "dummyTestUser",
                    "email": "test@example.com",
                    "displayName": "Test User"
                }));
            """)
            print("Simulated login by setting localStorage.")

            # 4. Navigate to the home page to test transition
            print(f"Navigating to home page at {base_url}/...")
            page.goto(f"{base_url}/", timeout=15000)

            # 5. Wait for an element on the HomeScreen to be visible
            print("Waiting for home screen element...")
            home_screen_element = page.get_by_role("heading", name="Public Rooms")
            expect(home_screen_element).to_be_visible(timeout=10000)
            print("Home screen loaded successfully after transition.")
            page.screenshot(path="jules-scratch/verification/02_home_page.png")
            print("Screenshot of home page saved.")

            # 6. Navigate to a chat page to test the translation feature UI
            print("Navigating to a dummy chat page...")
            page.goto(f"{base_url}/chat/dummyUser/DummyFriend", timeout=15000)

            print("Waiting for chat page to load...")
            translation_button = page.get_by_title("Toggle Translation")
            expect(translation_button).to_be_visible(timeout=10000)
            print("Chat page loaded, translation button is visible.")

            # 7. Test the translation UI
            print("Clicking translation button...")
            translation_button.click()

            language_selector = page.locator("select")
            expect(language_selector).to_be_visible()
            print("Language selector is visible after click.")

            # Take final screenshot
            page.screenshot(path="jules-scratch/verification/03_translation_ui_on.png")
            print("Screenshot of translation UI saved.")

            print("\nVerification successful! Page transitions and translation UI are working.")

        except Exception as e:
            print(f"\nAn error occurred during verification: {e}")
            page.screenshot(path="jules-scratch/verification/verification_error.png")
            print("Error screenshot saved to jules-scratch/verification/verification_error.png")

        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()
