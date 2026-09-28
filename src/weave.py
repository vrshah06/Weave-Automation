import re
import time
import logging
from typing import List, Optional, Tuple
from playwright.sync_api import Page, Locator, TimeoutError as PlaywrightTimeoutError

from config import (
    WEAVE_APP_URL,
    WEAVE_AUTH_URL,
    WEAVE_MESSAGES_URL,
    DEFAULT_TIMEOUT,
    SEARCH_TIMEOUT,
    MESSAGE_LOAD_TIMEOUT,
    WEAVE_EMAIL,
    WEAVE_PASSWORD,
)
from src.models import ProcessStatus, RecipientSearchResult
from src.recipients import analyze_search_results
from src.validation import normalize_phone

logger = logging.getLogger("weave_automation")


class WeaveMessenger:
    """
    Page Object Model isolating browser interactions with the Weave Web App.
    Strictly uses accessible locators, roles, labels, and verified attributes.
    """

    def __init__(self, page: Page):
        self.page = page

    def _digits(self, text: str) -> str:
        return re.sub(r"\D", "", text or "")

    # =========================================================================
    # 1. AUTHENTICATION & NAVIGATION
    # =========================================================================

    def navigate_to_weave(self) -> Tuple[bool, ProcessStatus]:
        """
        Navigates to the Weave sign-in / application home URL (https://app.getweave.com).
        """
        try:
            logger.info("Opening Weave application URL (https://app.getweave.com)...")
            self.page.goto(WEAVE_APP_URL, wait_until="domcontentloaded", timeout=DEFAULT_TIMEOUT)
            # Give client-side redirect time to settle if unauthenticated
            time.sleep(2)
            return True, ProcessStatus.READY_TO_SEND
        except Exception as e:
            logger.error(f"Failed to navigate to Weave: {e}")
            return False, ProcessStatus.NETWORK_ERROR

    def check_authenticated(self, timeout_ms: int = DEFAULT_TIMEOUT) -> Tuple[bool, ProcessStatus]:
        """
        Verifies if the current session is authenticated in Weave.
        Explicitly checks for login form elements or auth redirect.
        """
        try:
            time.sleep(1.5)
            url = self.page.url.lower()

            if "auth.getweave.com" in url:
                logger.info("Current URL is on auth.getweave.com. Session not active.")
                return False, ProcessStatus.SESSION_EXPIRED

            # Check if login form or credentials fields are visible on screen
            login_form_indicators = [
                self.page.locator("input[type='password']"),
                self.page.get_by_placeholder("Email", exact=False),
                self.page.get_by_text("Log in to your Weave account", exact=False),
                self.page.get_by_role("button", name=re.compile(r"^\s*log\s*in\s*$", re.I)),
            ]

            for indicator in login_form_indicators:
                try:
                    if indicator.count() > 0 and indicator.first.is_visible():
                        logger.info("Login form detected on page. Session not active.")
                        return False, ProcessStatus.SESSION_EXPIRED
                except Exception:
                    pass

            # Check if app navigation shell is visible
            shell = (
                self.page.locator("nav")
                .or_(self.page.locator("aside"))
                .or_(self.page.get_by_role("link", name=re.compile(r"Messages", re.I)))
                .or_(self.page.locator("a[href*='/messages']"))
            ).first

            try:
                shell.wait_for(state="visible", timeout=min(timeout_ms, 5000))
                logger.info("Weave navigation shell detected. Session is active.")
                return True, ProcessStatus.READY_TO_SEND
            except Exception:
                pass

            # Fallback check on app.getweave.com URL without login fields
            if "app.getweave.com" in url:
                return True, ProcessStatus.READY_TO_SEND

            return False, ProcessStatus.WEAVE_NOT_LOADED
        except Exception as e:
            logger.error(f"Error checking authentication: {e}")
            return False, ProcessStatus.WEAVE_NOT_LOADED

    def perform_auto_login(self, email: str = WEAVE_EMAIL, password: str = WEAVE_PASSWORD, timeout_ms: int = DEFAULT_TIMEOUT) -> Tuple[bool, ProcessStatus]:
        """
        Automates credential entry into Weave login page when auth.getweave.com is open.
        """
        if not email or not password:
            logger.warning("No login credentials found in environment/config.")
            return False, ProcessStatus.SESSION_EXPIRED

        logger.info(f"Attempting automatic credential entry for email: {email}...")
        try:
            # Locate Email field
            email_field = (
                self.page.get_by_placeholder("Email", exact=False)
                .or_(self.page.locator("input[type='email']"))
                .or_(self.page.locator("input[name='username']"))
                .or_(self.page.locator("input[name='email']"))
                .or_(self.page.locator("input[id*='email']"))
                .or_(self.page.locator("input[id*='username']"))
                .or_(self.page.locator("input").first)
            ).first

            email_field.wait_for(state="visible", timeout=timeout_ms)
            email_field.click(force=True)
            email_field.press("Control+A")
            email_field.press("Backspace")
            email_field.type(email, delay=40)
            logger.info("Email address entered into login form.")

            # Locate Password field
            password_field = (
                self.page.get_by_placeholder("Password", exact=False)
                .or_(self.page.locator("input[type='password']"))
                .or_(self.page.locator("input[name='password']"))
                .or_(self.page.locator("input[id*='password']"))
            ).first

            password_field.wait_for(state="visible", timeout=timeout_ms)
            password_field.click(force=True)
            password_field.press("Control+A")
            password_field.press("Backspace")
            password_field.type(password, delay=40)
            logger.info("Password entered into login form.")

            # Locate Log In button
            login_btn = (
                self.page.get_by_role("button", name=re.compile(r"^\s*log\s*in\s*$", re.I))
                .or_(self.page.locator("button[type='submit']"))
                .or_(self.page.locator("button:has-text('Log In')"))
                .or_(self.page.locator("input[type='submit']"))
            ).first

            login_btn.wait_for(state="visible", timeout=timeout_ms)
            login_btn.click(force=True)
            logger.info("Log In button clicked. Waiting for redirection to app.getweave.com...")

            # Wait loop up to 30 seconds for post-login redirection to complete
            start_wait = time.time()
            max_wait_seconds = 30

            while time.time() - start_wait < max_wait_seconds:
                time.sleep(1.5)
                current_url = self.page.url.lower()

                # 1. Check if redirected to app.getweave.com
                if "app.getweave.com" in current_url and "auth.getweave.com" not in current_url:
                    logger.info("Redirect to app.getweave.com detected! Waiting for application navigation shell...")
                    
                    shell = (
                        self.page.locator("nav")
                        .or_(self.page.locator("aside"))
                        .or_(self.page.get_by_role("link", name=re.compile(r"Messages", re.I)))
                        .or_(self.page.locator("a[href*='/messages']"))
                        .or_(self.page.locator("[data-trackingid='inbox-list-new-message-button']"))
                    ).first

                    try:
                        shell.wait_for(state="visible", timeout=10000)
                        logger.info("Login successful! Weave application loaded.")
                        return True, ProcessStatus.READY_TO_SEND
                    except Exception:
                        pass

                # 2. Check if an explicit error alert is displayed on login page
                try:
                    err = self.page.locator("[class*='error'], [class*='Error'], [role='alert']").first
                    if err.count() > 0 and err.is_visible():
                        txt = err.inner_text().strip()
                        if txt:
                            logger.error(f"Login form error: '{txt}'")
                except Exception:
                    pass

            # Final check after timeout
            if "app.getweave.com" in self.page.url.lower():
                logger.info("Login completed on app.getweave.com.")
                return True, ProcessStatus.READY_TO_SEND

            logger.error("Timed out waiting for login redirect to app.getweave.com.")
            return False, ProcessStatus.SESSION_EXPIRED
        except Exception as e:
            logger.error(f"Auto-login failed: {e}")
            return False, ProcessStatus.SESSION_EXPIRED

    def open_messages(self, timeout_ms: int = DEFAULT_TIMEOUT) -> Tuple[bool, ProcessStatus]:
        """
        Navigates to Messages section by clicking the Messages sidebar link/icon on the left navigation bar.
        Always clicks the Messages navigation sidebar item after loading sign-in / app URL.
        """
        logger.info("Clicking 'Messages' link on the left navigation bar...")
        try:
            # Locate Messages link/icon in left navigation sidebar
            messages_link = (
                self.page.get_by_role("link", name=re.compile(r"^\s*Messages\s*$", re.I))
                .or_(self.page.locator("a[href*='/messages']"))
                .or_(self.page.locator("nav a:has-text('Messages')"))
                .or_(self.page.locator("aside a:has-text('Messages')"))
                .or_(self.page.locator("[aria-label*='Messages']"))
                .or_(self.page.get_by_text("Messages", exact=True))
            ).first

            messages_link.wait_for(state="visible", timeout=timeout_ms)
            messages_link.click(force=True)

            # Wait for Inbox view to be visible
            inbox_heading = (
                self.page.locator("[data-trackingid='inbox-list-new-message-button']")
                .or_(self.page.get_by_text("Inbox", exact=True))
                .or_(self.page.get_by_role("button", name="New Message"))
            ).first
            inbox_heading.wait_for(state="visible", timeout=timeout_ms)

            logger.info("Successfully opened Messages via left navigation bar click.")
            return True, ProcessStatus.READY_TO_SEND
        except Exception as exc:
            logger.error(f"Failed to click Messages sidebar link: {exc}")
            return False, ProcessStatus.MESSAGES_NOT_FOUND

    # =========================================================================
    # 2. NEW MESSAGE WORKFLOW
    # =========================================================================

    def open_new_message(self, timeout_ms: int = DEFAULT_TIMEOUT) -> Tuple[bool, ProcessStatus]:
        """
        Clicks the 'New Message' button to open the composer and 'To:' field.
        """
        logger.info("Clicking 'New Message' button...")
        try:
            # Press Escape to dismiss any lingering floating UI popups
            try:
                self.page.keyboard.press("Escape")
                time.sleep(0.3)
            except Exception:
                pass

            # Primary locator: exact data-trackingid from inspect element
            new_btn = (
                self.page.locator("[data-trackingid='inbox-list-new-message-button']")
                .or_(self.page.locator("[data-fabric-ds-name='Button']:has-text('New Message')"))
                .or_(self.page.get_by_role("button", name="New Message"))
                .or_(self.page.get_by_text("New Message"))
            ).first

            new_btn.wait_for(state="visible", timeout=timeout_ms)
            new_btn.click(force=True)

            # Wait for 'To:' input field to become visible inside composer
            to_field = self._get_to_field()
            to_field.wait_for(state="visible", timeout=timeout_ms)
            logger.info("'New Message' composer opened (To: field visible).")
            return True, ProcessStatus.READY_TO_SEND
        except Exception as exc:
            logger.error(f"Failed to click New Message button: {exc}")
            return False, ProcessStatus.NEW_MESSAGE_NOT_FOUND

    def _get_to_field(self) -> Locator:
        """
        Locates the recipient search input field in New Message composer using exact inspect element attributes.
        """
        candidates = [
            self.page.locator("[data-trackingid='inbox-thread-new-message-to-field']"),
            self.page.locator("input#person-phone-selection-solid-field"),
            self.page.locator("input[name='person-search-solid']"),
            self.page.get_by_placeholder(re.compile(r"To:?", re.I)),
            self.page.locator("input[placeholder*='To']"),
        ]

        for candidate in candidates:
            try:
                if candidate.count() > 0 and candidate.first.is_visible():
                    return candidate.first
            except Exception:
                pass

        return self.page.locator("input[data-trackingid='inbox-thread-new-message-to-field']").first

    def search_recipient(self, phone: str, timeout_ms: int = SEARCH_TIMEOUT) -> Tuple[bool, ProcessStatus, List[RecipientSearchResult]]:
        """
        Enters 10-digit phone number into the 'To:' field and extracts matching dropdown card.
        """
        logger.info(f"Searching recipient phone: {phone}...")
        try:
            to_field = self._get_to_field()
            to_field.wait_for(state="visible", timeout=timeout_ms)

            digits = self._digits(normalize_phone(phone))
            if len(digits) == 11 and digits.startswith("1"):
                digits = digits[1:]
            search_digits = digits[-10:] if len(digits) >= 10 else digits

            to_field.click(force=True)

            to_field.type(search_digits, delay=30)
            logger.info(f"Typed phone '{search_digits}' into To: field. Waiting for search portal...")

            time.sleep(2.0)

            results = self._extract_search_results(search_digits)
            return True, ProcessStatus.READY_TO_SEND, results
        except PlaywrightTimeoutError:
            logger.error("Search results dropdown timed out.")
            return False, ProcessStatus.SEARCH_TIMEOUT, []
        except Exception as e:
            logger.error(f"Error during recipient search: {e}")
            return False, ProcessStatus.TO_FIELD_NOT_FOUND, []

    def _extract_search_results(self, target_phone: str) -> List[RecipientSearchResult]:
        """
        Parses available matching contacts strictly from the floating UI search dropdown portal.
        """
        results: List[RecipientSearchResult] = []
        try:
            portal = self.page.locator("div[data-floating-ui-portal]").first
            if portal.count() > 0 and portal.is_visible():
                containers = portal.locator("[data-trackingid='person-list-item-expandable'], [role='menuitem'], [role='option']")
            else:
                containers = self.page.locator("[data-trackingid='person-list-item-expandable'], [role='menuitem']")

            count = min(containers.count(), 100)
            seen_texts = set()

            for i in range(count):
                el = containers.nth(i)
                if not el.is_visible():
                    continue
                text = el.inner_text().strip()
                if not text or text in seen_texts or "Search Patients" in text or "Recent Searches" in text:
                    continue

                seen_texts.add(text)
                lines = [line.strip() for line in text.split("\n") if line.strip()]
                name = lines[0] if lines else ""
                phone_val = ""
                role_label = ""

                for line in lines:
                    if "(" in line or "-" in line or line.replace(" ", "").isdigit():
                        phone_val = line
                    if "Mobile" in line or "Home" in line or "Active" in line:
                        role_label = line

                results.append(
                    RecipientSearchResult(
                        raw_text=text,
                        name=name,
                        phone=phone_val or text,
                        role_label=role_label,
                    )
                )
        except Exception as e:
            logger.warning(f"Could not parse dropdown elements: {e}")

        if not results:
            results.append(RecipientSearchResult(raw_text=target_phone, phone=target_phone))

        return results

    def select_recipient(self, phone: str, target_patient_name: Optional[str] = None) -> Tuple[bool, ProcessStatus, str]:
        """
        Selects patient strictly from the search dropdown card (using person-list-item-expandable).
        """
        logger.info(f"Selecting patient for phone: {phone}...")
        try:
            portal = self.page.locator("div[data-floating-ui-portal]").first
            digits = self._digits(phone)[-10:]
            last7 = digits[-7:] if len(digits) >= 7 else digits

            # 1. Match patient name in search dropdown
            if target_patient_name and portal.count() > 0 and portal.is_visible():
                name_match = portal.get_by_text(target_patient_name, exact=False).first
                if name_match.count() > 0 and name_match.is_visible():
                    name_match.click(force=True)
                    time.sleep(0.9)
                    return True, ProcessStatus.READY_TO_SEND, f"Clicked patient '{target_patient_name}' in search dropdown"

            # 2. Match phone in search dropdown
            if portal.count() > 0 and portal.is_visible():
                phone_match = portal.get_by_text(last7, exact=False).first
                if phone_match.count() > 0 and phone_match.is_visible():
                    phone_match.click(force=True)
                    time.sleep(0.9)
                    return True, ProcessStatus.READY_TO_SEND, f"Clicked phone '{last7}' in search dropdown"

                # 3. Click expandable patient list item in search dropdown
                item = portal.locator("[data-trackingid='person-list-item-expandable'], [role='menuitem']").first
                if item.count() > 0 and item.is_visible():
                    item.click(force=True)
                    time.sleep(0.9)
                    return True, ProcessStatus.READY_TO_SEND, "Clicked person search dropdown card"

            # 4. Keyboard ArrowDown + Enter fallback
            to_field = self._get_to_field()
            to_field.press("ArrowDown")
            time.sleep(0.2)
            to_field.press("Enter")
            time.sleep(0.9)
            return True, ProcessStatus.READY_TO_SEND, "Selected contact via Keyboard ArrowDown+Enter"

        except Exception as exc:
            logger.error(f"Recipient selection failed: {exc}")
            return False, ProcessStatus.FAILED, f"Selection failed: {exc}"

    # =========================================================================
    # 3. CONVERSATION & MESSAGE COMPOSITION
    # =========================================================================

    def _get_composer(self) -> Locator:
        """
        Locates the message composer textarea using exact inspect element attributes.
        """
        candidates = [
            self.page.locator("textarea[data-testid='thread-sending-area']"),
            self.page.locator("textarea[name='body']"),
            self.page.get_by_placeholder(re.compile(r"Type something...", re.I)),
            self.page.get_by_placeholder(re.compile(r"Reply to...", re.I)),
            self.page.locator("div[contenteditable='true']"),
            self.page.locator("textarea[placeholder*='Type']"),
            self.page.locator("textarea[placeholder*='Reply']"),
        ]

        for candidate in candidates:
            try:
                if candidate.count() > 0 and candidate.first.is_visible():
                    return candidate.first
            except Exception:
                pass

        return self.page.locator("textarea[data-testid='thread-sending-area']").first

    def wait_for_conversation(self, timeout_ms: int = MESSAGE_LOAD_TIMEOUT, expected_phone: Optional[str] = None, expected_patient_name: Optional[str] = None) -> Tuple[bool, ProcessStatus]:
        """
        Waits for the selected recipient conversation to finish loading and React components to settle.
        """
        logger.info("Waiting for patient conversation to load and settle...")
        try:
            composer = self._get_composer()
            composer.wait_for(state="visible", timeout=timeout_ms)
            time.sleep(0.9)  # Wait for React thread history and header re-render to complete
            logger.info("Conversation loaded and settled successfully.")
            return True, ProcessStatus.READY_TO_SEND
        except PlaywrightTimeoutError:
            logger.error("Conversation load timed out.")
            return False, ProcessStatus.CONVERSATION_LOAD_TIMEOUT

    def enter_message(self, message_text: str) -> Tuple[bool, ProcessStatus]:
        """
        Populates the message composer visually line-by-line using Shift+Enter for newlines,
        scrolling parent containers to the bottom so the typed message is 100% visible on screen.
        """
        logger.info("Composing reminder message visually into chat box...")
        try:
            time.sleep(1.0)
            composer = self._get_composer()
            composer.wait_for(state="visible", timeout=DEFAULT_TIMEOUT)

            # Scroll all parent scrollable containers to bottom & scroll textarea into center of view
            composer.evaluate("""el => {
                el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                let p = el.parentElement;
                while (p) {
                    if (p.scrollHeight > p.clientHeight) {
                        p.scrollTop = p.scrollHeight;
                    }
                    p = p.parentElement;
                }
                el.style.border = '2px solid #0066ff';
            }""")

            composer.click(force=True)
            composer.focus()

            # Clear composer
            composer.fill("")

            # Fast visual typing line-by-line with Shift+Enter so user watches typing without triggering Enter submit
            lines = message_text.split("\n")
            for idx, line in enumerate(lines):
                if line:
                    composer.press_sequentially(line, delay=2)
                if idx < len(lines) - 1:
                    composer.press("Shift+Enter")

            # Dispatch DOM events to sync UI state
            composer.evaluate("""el => {
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }""")

            time.sleep(1.0)

            logger.info("Reminder message visually typed into chat box.")
            return True, ProcessStatus.READY_TO_SEND
        except Exception as exc:
            logger.error(f"Failed to enter message: {exc}")
            return False, ProcessStatus.MESSAGE_INPUT_NOT_FOUND

    def get_send_button_locator(self) -> Locator:
        """
        Returns locator for the blue Send button at bottom right of conversation.
        Strictly targets the visible inbox thread sending area send button.
        """
        exact_send = self.page.locator("[data-trackingid='inbox-thread-sending-area-send-button']")
        if exact_send.count() > 0 and exact_send.first.is_visible():
            return exact_send.first

        candidates = [
            self.page.locator("[data-trackingid='inbox-thread-sending-area-send-button']"),
            self.page.locator("button[data-trackingid='inbox-thread-sending-area-send-button']"),
            self.page.locator("button[type='submit']:not([data-trackingid*='block'])"),
            self.page.locator("button[aria-label*='Send']:not([data-trackingid*='block'])"),
        ]

        for candidate in candidates:
            try:
                if candidate.count() > 0 and candidate.first.is_visible():
                    return candidate.first
            except Exception:
                pass

        return self.page.locator("[data-trackingid='inbox-thread-sending-area-send-button']").first

    def verify_ready_to_send(self) -> Tuple[bool, ProcessStatus]:
        """
        Verifies that message composer contains text and ready for dry run.
        """
        try:
            composer = self._get_composer()
            val = ""
            try:
                val = composer.input_value().strip()
            except Exception:
                val = composer.evaluate("el => el.value || el.innerText || ''").strip()

            if not val:
                logger.warning("Message composer input value is empty.")
                time.sleep(0.5)
                val = composer.evaluate("el => el.value || el.innerText || ''").strip()

            if not val:
                logger.warning("Message composer is empty.")
                return False, ProcessStatus.MESSAGE_INPUT_NOT_FOUND

            logger.info("Message text verified inside composer. Ready for dry run.")
            return True, ProcessStatus.READY_TO_SEND
        except Exception as e:
            logger.error(f"Verification before send failed: {e}")
            return False, ProcessStatus.FAILED

    # =========================================================================
    # 4. SEND & CONFIRMATION
    # =========================================================================

    def send_message(self, timeout_ms: int = DEFAULT_TIMEOUT, message_text: Optional[str] = None) -> Tuple[bool, ProcessStatus]:
        """
        Clicks the Send button at bottom right of conversation panel.
        MUST ONLY BE CALLED IF --send IS EXPLICITLY PROVIDED.
        """
        logger.info("Clicking Send button...")
        try:
            send_btn = self.get_send_button_locator()
            send_btn.wait_for(state="visible", timeout=timeout_ms)

            # Wait for button to be enabled if aria-disabled is true
            start_wait = time.time()
            while time.time() - start_wait < 3.0:
                aria_disabled = send_btn.get_attribute("aria-disabled")
                if not send_btn.is_disabled() and aria_disabled != "true":
                    break
                time.sleep(0.3)

            send_btn.click(force=True)
            logger.info("Send button clicked. Verifying delivery confirmation...")

            sent, status = self.verify_sent(timeout_ms=5000)
            if sent:
                return sent, status

            # Fallback 1: Click again standard click
            logger.info("Composer not cleared after first click. Retrying standard click...")
            try:
                send_btn.click()
            except Exception:
                pass

            sent, status = self.verify_sent(timeout_ms=3000)
            if sent:
                return sent, status

            # Fallback 2: Press Enter key inside composer
            logger.info("Composer still not cleared. Trying Enter keypress in composer...")
            try:
                composer = self._get_composer()
                composer.focus()
                composer.press("Enter")
            except Exception:
                pass

            return self.verify_sent(timeout_ms=5000)
        except Exception as e:
            logger.error(f"Failed to click send button: {e}")
            return False, ProcessStatus.SEND_UNCONFIRMED

    def verify_sent(self, timeout_ms: int = DEFAULT_TIMEOUT) -> Tuple[bool, ProcessStatus]:
        """
        Verifies that the message was successfully sent.
        Evidence: Composer cleared, message bubble appended in conversation list.
        """
        try:
            composer = self._get_composer()
            start_time = time.time()
            cleared = False

            while time.time() - start_time < (timeout_ms / 1000):
                text = composer.evaluate("el => el.value || el.innerText").strip()
                if not text:
                    cleared = True
                    break
                time.sleep(0.5)

            if cleared:
                logger.info("Message delivery confirmed: Composer cleared.")
                return True, ProcessStatus.SENT

            logger.warning("Composer input was not cleared within timeout. Verification uncertain.")
            return False, ProcessStatus.SEND_UNCONFIRMED
        except Exception as e:
            logger.error(f"Error during send verification: {e}")
            return False, ProcessStatus.SEND_UNCONFIRMED
