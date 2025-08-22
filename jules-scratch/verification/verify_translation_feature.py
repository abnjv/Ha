from playwright.sync_api import sync_playwright, expect

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Listen for all console events and print them
        page.on("console", lambda msg: print(f"Browser Console: {msg.type} {msg.text}"))

        try:
            # Navigate to the root of the app, which is often a good test
            print("Navigating to http://localhost:3000/Ha/...")
            page.goto("http://localhost:3000/Ha/", timeout=15000)

            # A generic wait to see if anything at all renders.
            # We are primarily interested in the console output now.
            page.wait_for_timeout(5000) # Wait 5 seconds to allow scripts to run and fail

            print("Checking for a common element, like the body tag...")
            body = page.locator("body")
            expect(body).to_be_visible() # A very basic check

            print("Verification check finished. Review console output for errors.")

        except Exception as e:
            print(f"An error occurred during verification: {e}")

        finally:
            print("Saving final screenshot.")
            page.screenshot(path="jules-scratch/verification/verification_final_state.png")
            browser.close()

if __name__ == "__main__":
    run_verification()
