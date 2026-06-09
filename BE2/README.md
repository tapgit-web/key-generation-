# License Activation Server

A simple Node.js/Express server to handle HWID-locked license activation for Python desktop applications.

## Project Structure

```text
/
├── config/
│   └── settings.js     # Server configuration (Port, DB path)
├── routes/
│   └── activate.js     # Activation logic (HWID locking)
├── utils/
│   └── db.js           # Filesystem JSON database helper
├── licenses.json       # Local database of licenses
├── package.json        # Dependencies and scripts
└── server.js           # Application entry point
```

## Setup Instructions

1. **Install Node.js**: Ensure you have Node.js installed on your machine.
2. **Install Dependencies**:
   Open a terminal in this folder and run:
   ```bash
   npm install
   ```
3. **Run the Server**:
   ```bash
   npm start
   ```
   The server will start on `http://localhost:3000`.

## API Documentation

### POST `/activate`

Used to activate or validate a license key on a specific PC.

**Request Body:**
```json
{
    "key": "ABCD-1234-EFGH-5678",
    "hwid": "UNIQUE-HW-ID-FROM-PC"
}
```

**Success Response (First Activation):**
- Binds the HWID to the key.
- Returns `{ "valid": true }`.

**Success Response (Validation):**
- If HWID matches the bound HWID.
- Returns `{ "valid": true }`.

**Failure Response:**
- Returns `{ "valid": false, "msg": "reason" }`.
- Potential reasons: "Invalid license key", "License already activated on another PC", etc.

## Sample Licenses

The following keys are pre-loaded in `licenses.json` for testing:
- `ABCD-1234-EFGH-5678`
- `PRO-UX-99-BATT`

## Hosting on Render

Render is a great platform for hosting this server. Follow these steps:

1. **Create a GitHub/GitLab Repository**: Push the contents of the `BE` folder (or the whole project) to a repository.
2. **Create a New Web Service**: In Render, select **New +** > **Web Service**.
3. **Connect Repository**: Choose your repository.
4. **Configuration**:
   - **Root Directory**: `BE` (If you pushed the whole folder)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. **Environment Variables**: Render automatically sets the `PORT` variable, and our code in `config/settings.js` will use it.

### ⚠️ IMPORTANT: Persistence on Render
Render's filesystem is **ephemeral** by default. This means if the server restarts or you redeploy, your `licenses.json` updates (activations) will be **wiped out** and reset to the original file in your code.

**Solution**: To keep your activations, you should use **Render Disks** (paid) to store `licenses.json` or migrate to an external database like MongoDB or Render's PostgreSQL.

## Sample Licenses
