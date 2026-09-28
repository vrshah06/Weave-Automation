# Weave Appointment Reminder Automation System

A production-grade, 100% automated browser automation system built using **Python 3.11+** and **Playwright (Chromium)** for sending appointment reminder SMS messages through the authorized **Weave Web Application**.

---

## 100% Automated Execution

Run the complete automation pipeline with **a single command**:

```bash
python main.py
```
or double-click **`run.bat`** (on Windows).

---

## Credentials Setup (`.env`)

Credentials can be placed in `.env` so that login is **100% automated**:

```ini
WEAVE_EMAIL=your_email@example.com
WEAVE_PASSWORD=your_password_here
```

If `.env` does not exist yet when you run `python main.py`, the system will ask for your Weave Email and Password **once in the console**, save them to `.env`, and automatically perform login from then on.

---

## How Automated Login & Execution Works

1. **Auto-Launch & Session Check:** Opens Chromium persistent session (`weave-profile/`).
2. **Automated Credential Submission:** If the login page (`auth.getweave.com`) appears, Playwright automatically fills in Email & Password from `.env`, clicks "Log In", and waits for the dashboard.
3. **Session Persistence:** Saves session cookies to `weave-profile/` so subsequent runs reuse the authenticated session instantly.
4. **Batch Execution:** Reads `data/appointments.csv`, searches patients, matches recipient identity, composes reminder SMS text, and handles deduplication (`logs/reminder_log.csv`).

---

## Direct CLI Command Flags

- **Production Mode (Sends SMS):**
  ```bash
  python main.py --send
  ```
- **Dry Run Mode (Preview only):**
  ```bash
  python main.py --dry-run
  ```
- **Diagnostic Selector Test:**
  ```bash
  python main.py --diagnostic
  ```

---

## Installation Commands

```bash
pip install -r requirements.txt
python -m playwright install chromium
```
