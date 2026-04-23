# Copy History Manager

Copy History Manager is a browser extension for **Chrome and Microsoft Edge** that automatically saves copied text, keeps a searchable local history, and optionally syncs that history to the cloud after user login.

It is built with:

- **Extension frontend:** JavaScript, HTML, CSS, Manifest V3
- **Backend API:** FastAPI
- **Database:** SQLite for local development, PostgreSQL-ready for deployment
- **Authentication:** JWT-based login and signup


## Project overview

This project solves a common problem: copied text gets lost after the next copy action.

The extension continuously tracks copied text from normal websites and also from AI tools that use programmatic clipboard APIs. Users can:

- save copied text automatically
- search copy history
- pin important items
- delete items
- export history as JSON
- open a full history page
- use a quick paste modal inside the current tab
- log in to sync data across devices


## Main features

### 1. Automatic copy tracking
The extension listens for standard browser copy events and stores copied text with metadata such as:

- copied text
- source page URL
- source page title
- created time
- updated time
- pin status
- copy count

### 2. AI website copy support
Some AI websites do not trigger only normal selection copy. They use `navigator.clipboard.writeText()` or `document.execCommand('copy')`.

To support this, the extension injects an interceptor script into the page context and listens for clipboard writes from websites like:

- ChatGPT
- Gemini
- Claude
- Perplexity
- Copilot
- Grok
- other AI sites using programmatic copy buttons

### 3. Local history storage
All copied items are saved locally using `chrome.storage.local`.

This gives users:

- instant access
- offline usage
- persistent local history even after browser restart

### 4. Duplicate handling
If duplicate tracking is enabled, copied text that already exists is not stored as a separate new item. Instead, the existing item is updated:

- moved to the top
- copy count increased
- updated timestamp refreshed

### 5. Pinned items
Users can pin important history items. Pinned items stay at the top of the list.

### 6. Search and filter
The popup and full history page allow users to search by:

- copied text
- page title
- page URL

### 7. Quick paste modal
A centered quick paste modal can be opened on the current page using a keyboard shortcut. It shows recent items and lets the user quickly copy them again.

### 8. Authentication and cloud sync
Users can sign up and log in through the extension. After login:

- local history can be pushed to the backend
- cloud history can be pulled back to the current browser
- local and cloud history are merged
- users can restore history on another device

### 9. Settings support
The options page allows users to manage:

- maximum stored items
- tracking enabled/disabled
- duplicate handling
- backend URL
- blocked domains

### 10. Keyboard shortcuts
Current shortcut commands include:

- **Alt + O** → open popup window
- **Alt + H** → open full history page
- **Alt + Y** → toggle tracking
- **Alt + K** → open quick paste modal


## Project structure

```text
copy-history-manager/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── requirements.txt
│   ├── routes/
│   │   ├── auth.py
│   │   ├── history.py
│   │   └── settings.py
│   └── services/
│       ├── auth_service.py
│       └── history_service.py
│
└── extension(Edge & Chrome)/
    ├── manifest.json
    ├── background.js
    ├── content.js
    ├── auth/
    ├── popup/
    ├── options/
    ├── pages/
    ├── modal/
    ├── utils/
    └── icons/
```


## How the extension works

### Extension flow

#### Step 1: User copies text
The content script detects copied text in two ways:

- normal `copy` event
- programmatic clipboard writes captured through injected interceptor script

#### Step 2: Content script sends message to background
The copied text is sent to `background.js` with:

- text
- current page URL
- current page title

#### Step 3: Background validates and stores
The background script:

- checks whether tracking is enabled
- checks whether the domain is blocked
- creates a history item
- updates local history in storage
- optionally syncs to cloud if login exists

#### Step 4: Popup and history page read local history
The popup and history page request stored items from the background script and render them in the UI.

#### Step 5: Cloud sync workflow
When a user signs up or logs in:

- backend returns JWT token
- token is stored in local extension auth storage
- local items are pushed to cloud
- cloud items are fetched back
- both histories are merged locally

This supports multi-device restore.


## Backend API flow

### Auth routes
Base path: `/api/auth`

- `POST /register` → create new user and return JWT
- `POST /login` → authenticate user and return JWT

### History routes
Base path: `/api/history`

- `POST /save` → save one item to cloud
- `POST /import` → bulk import all items
- `GET /` → list cloud history for logged-in user

### Settings routes
Base path: `/api/settings`

- `GET /` → fetch user settings
- `POST /` → save user settings


## Local development setup

## 1. Backend setup

Open terminal in the `backend` folder.

### Create virtual environment

```bash
python -m venv venv
```

### Activate virtual environment

#### Windows

```bash
venv\Scripts\activate
```

#### Mac/Linux

```bash
source venv/bin/activate
```

### Install dependencies

```bash
pip install -r requirements.txt
```

### Run backend

```bash
uvicorn main:app --reload
```

Backend default URL:

```text
http://127.0.0.1:8000
```

Interactive docs:

```text
http://127.0.0.1:8000/docs
```



## 2. Extension setup

1. Open Chrome or Edge
2. Go to extension management page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
3. Turn on **Developer mode**
4. Click **Load unpacked**
5. Select the folder:

```text
extension(Edge & Chrome)
```

6. Open extension options and confirm backend URL is:

```text
http://127.0.0.1:8000
```


## Usage flow

### Local-only mode
1. Load the extension
2. Copy text on any webpage
3. Open popup or history page
4. View, search, pin, recopy, or delete items

### Cloud sync mode
1. Open the auth page from the popup
2. Sign up or log in
3. Extension stores JWT token
4. Existing local history is uploaded
5. Cloud history is restored and merged
6. Future copied text can sync automatically

### Full history page
The full history page supports:

- search
- pin/unpin
- delete
- clear all
- export JSON
- manual sync

### Quick paste modal
Use **Alt + K** to open the centered quick paste modal in the active webpage.



## Current strengths of the project

- real-world useful extension idea
- clean split between extension and backend
- supports Chrome and Edge
- works both offline and with cloud sync
- supports AI-site copy buttons
- has popup, history page, options page, and auth page
- already close to a publishable MVP




## License



