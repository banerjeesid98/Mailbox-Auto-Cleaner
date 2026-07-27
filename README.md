# Gmail Automated Inbox Sanitizer & Weekly Auditor

An intelligent, secure, privacy-focused web application designed to help users clean, organize, and audit their Gmail mailboxes automatically. It features customizable category-based rules, manual preview sweeps, a weekly audit report generator, and strict safety guardrails that protect your Primary Inbox from accidental bulk deletion.

---

## 🌟 Key Features

- **Automated Category Sanitization**: Clean clutter from **Promotions**, **Updates**, and **Socials** categories automatically or on demand.
- **Primary Inbox Safeguard**: By default, the **Main/Primary Inbox is strictly protected** (`cleanInbox: false`). Primary emails are never touched unless explicitly enabled in your custom rules.
- **Smart Trash Handling**: Selecting messages from the Gmail Trash folder permanently deletes them from Gmail, freeing up cloud storage space, while other categories move clutter to Gmail Trash for safe 30-day recovery.
- **Interactive Scan & Preview**: Review matched messages, inspect senders, filter by subject or category, and selectively uncheck emails before executing any deletion.
- **Weekly Audit Reports**: Generates automated weekly summaries detailing email cleanup stats, storage freed, and category distributions across weekly timeframes.
- **Custom Search & Targeted Senders**: Define custom search queries or list specific sender addresses to target for cleanup.
- **Privacy First**: Authenticates directly with Google via OAuth 2.0. No email content or credentials are saved on external servers; tokens remain local to your browser session.

---

## ⚙️ How the Application Works

### 1. Gmail Scanning & Filtering Engine
The app queries the official Gmail API (`messages.list` and `messages.get`) using fine-tuned query strings:
- **Promotions**: `category:promotions`
- **Socials**: `category:social`
- **Updates**: `category:updates`
- **Spam**: `in:spam` (disabled by default)
- **Trash**: `in:trash` (disabled by default)
- **Primary Inbox**: `in:inbox` (strictly disabled by default)

You can also specify an age filter (e.g., messages older than 7, 30, 90, or 365 days).

### 2. Primary Inbox Safety Policy
To prevent critical work or personal emails from being deleted, the application defaults to **protecting the Main/Primary Inbox**:
- `cleanInbox: false` by default.
- Targeted primary sender keywords only run if `cleanInbox` is explicitly toggled on by the user in **Rules Configuration**.

### 3. Trash vs. Soft Delete Behavior
- **Non-Trash Categories (Promotions, Socials, Updates)**: Items selected for deletion are moved to **Gmail Trash** (`messages.trash`). Items in Gmail Trash can be recovered within 30 days.
- **Trash Folder Items**: Items originating from the Trash folder are **permanently deleted** (`messages.delete`), allowing users to immediately reclaim storage space.

### 4. Weekly Background Sanitizer & Audit Reporting
- **Automated Weekly Scheduler**: When enabled, the background engine periodically sweeps your configured categories based on your active rule parameters.
- **Weekly Audit Reports**: Keeps historical records of how many emails were cleaned per category each week, tracking cumulative storage space reclaimed over time.

---

## 🔐 Authentication & Security

### Google OAuth 2.0 & Scope Hierarchy
The application uses **Google OAuth 2.0** to obtain user consent and access tokens. 

Required Gmail API Scopes:
- `https://mail.google.com/` or `https://www.googleapis.com/auth/gmail.modify`: Allows searching messages, moving emails to Trash, and permanently deleting items from Trash.
- `https://www.googleapis.com/auth/gmail.readonly`: Used to read user profile statistics and email counts.

### Authentication Flow:
1. Click **Connect Gmail Account** on the application dashboard.
2. Google's secure OAuth consent screen opens, displaying requested permissions.
3. Upon approval, Google issues an Access Token directly to the application.
4. The Access Token is stored in `localStorage` / React state for session duration.
5. All requests to Google APIs are signed with the OAuth Access Token in HTTP `Authorization: Bearer <TOKEN>` headers.

> **Note for Shared Users/Friends**:
> If you share this app link with friends, Google OAuth will prompt each user to sign in with their **own** Google account. Each user grants permission for their own mailbox only. No user can view or alter another user's emails.

---

## 🚀 How to Run the App Locally

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** or **bun**
- A **Google Cloud Console Project** with Gmail API enabled and OAuth 2.0 Client Credentials configured.

---

### Step 1: Clone the Repository & Install Dependencies

```bash
git clone <repository-url>
cd <repository-folder>
npm install
```

---

### Step 2: Configure Environment Variables

Create a `.env` file in the root directory (based on `.env.example`):

```env
# Server Port (Defaults to 3000)
PORT=3000

# Google OAuth Client Credentials (Required for Gmail API integration)
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com

# Gemini API Key (Optional: for AI email analysis features if enabled)
GEMINI_API_KEY=your_gemini_api_key_here
```

---

### Step 3: Google Cloud Console Setup for Local Development

To allow local or deployed logins:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Enable the **Gmail API** under **APIs & Services > Library**.
4. Configure the **OAuth Consent Screen**:
   - User Type: **External** (or Internal for Workspace organizations).
   - Add required scopes: `gmail.modify` / `https://mail.google.com/`.
   - Add Test Users (if app is in "Testing" mode).
5. Create **OAuth 2.0 Client ID** under **Credentials > Create Credentials**:
   - Application Type: **Web application**.
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `http://localhost:5173`
     - *(Add your deployed domain if hosting on Google Cloud Run)*
   - **Authorized redirect URIs**:
     - `http://localhost:3000`
     - `http://localhost:3000/oauth2callback`
6. Copy the generated **Client ID** and paste it into `VITE_GOOGLE_CLIENT_ID` in your `.env` file.

---

### Step 4: Start the Local Development Server

```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## ☁️ Deployment & Automated Execution Notes

### Local vs. Deployed Cloud Hosting
- **Local Execution**: When running locally on your computer, the background weekly sanitizer active triggers while the browser tab remains open. If you shut down your laptop, the app pauses until reopened.
- **Continuous Cloud Hosting (Google Cloud Run / Server)**:
  - If deployed to **Google Cloud Run** or a server environment, the backend application remains live 24/7.
  - Users can configure automated weekly checks that trigger continuously without requiring local machines to stay turned on.

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Motion / Framer Motion
- **Backend / Dev Server**: Node.js, Express, Vite
- **APIs & Services**: Google OAuth 2.0, Gmail REST API, Google GenAI (Gemini SDK)

---

## 📜 License

This project is licensed under the MIT License.
