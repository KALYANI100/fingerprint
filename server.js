const express = require('express');
const app = express();

let savedCredentialId = null; // Store credential ID in memory

app.get('/', (req, res) => {
  res.send(`
<html>
<head>
  <title>Fingerprint Password Generator</title>
  <style>
    body { font-family: Arial; padding: 40px; text-align: center; background: #f5f5f5; }
    .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    button { background: #007bff; color: white; border: none; padding: 15px 30px; font-size: 18px; border-radius: 8px; cursor: pointer; margin: 20px 0; }
    .password { background: #e9ecef; padding: 15px; margin: 20px 0; border-radius: 5px; font-family: monospace; font-size: 16px; word-break: break-all; }
    .status { margin: 10px 0; padding: 10px; border-radius: 5px; }
    .success { background: #d4edda; color: #155724; }
    .error { background: #f8d7da; color: #721c24; }
  </style>
</head>

<body>
  <div class="container">
    <h1>🔐 Fingerprint Password</h1>

    <button onclick="registerFingerprint()">Register Fingerprint</button>
    <button onclick="loginFingerprint()">Login (Generate Password)</button>

    <div id="status" class="status"></div>

    <div id="passwordDisplay" style="display:none;">
      <h3>Your Password:</h3>
      <div id="password" class="password"></div>
    </div>
  </div>

<script>
async function registerFingerprint() {
  const status = document.getElementById("status");
  status.textContent = "👆 Touch fingerprint to register...";
  status.className = "status";

  try {
    const challenge = new TextEncoder().encode("static-register-challenge");

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "FP App", id: window.location.hostname },
        user: {
          id: new TextEncoder().encode("user-constant-id"),
          name: "test@example.com",
          displayName: "Fingerprint User"
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required"
        },
        timeout: 60000,
        attestation: "none"
      }
    });

    const rawId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));

    await fetch("/save-credential?id=" + encodeURIComponent(rawId));

    status.textContent = "✅ Registered! You can now login.";
    status.className = "status success";
  } catch (e) {
    status.textContent = "❌ " + e.message;
    status.className = "status error";
  }
}

async function loginFingerprint() {
  const status = document.getElementById("status");
  status.textContent = "👆 Touch fingerprint to login...";
  status.className = "status";

  try {
    const savedId = await fetch("/get-credential").then(res => res.text());

    if (!savedId) {
      status.textContent = "❌ Please REGISTER fingerprint first.";
      status.className = "status error";
      return;
    }

    const challenge = new TextEncoder().encode("static-login-challenge");

    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{
          id: Uint8Array.from(atob(savedId), c => c.charCodeAt(0)),
          type: "public-key"
        }],
        userVerification: "required",
        timeout: 60000
      }
    });

    const rawIdArray = Array.from(new Uint8Array(credential.rawId));
    const password = createPasswordFromFingerprint(rawIdArray);

    document.getElementById("password").textContent = password;
    document.getElementById("passwordDisplay").style.display = "block";

    status.textContent = "✅ Password generated!";
    status.className = "status success";

  } catch (e) {
    status.textContent = "❌ " + e.message;
    status.className = "status error";
  }
}

function createPasswordFromFingerprint(arr) {
  let hash = 0;
  for (let v of arr) {
    hash = ((hash << 5) - hash) + v;
    hash |= 0;
  }
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let seed = Math.abs(hash);
  let pwd = "";
  for (let i = 0; i < 12; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    pwd += chars[Math.floor((seed / 233280) * chars.length)];
  }
  return pwd;
}
</script>

</body>
</html>
  `);
});

// Save credential ID in server memory
app.get('/save-credential', (req, res) => {
  savedCredentialId = req.query.id;
  res.send("saved");
});

// Return credential ID for login
app.get('/get-credential', (req, res) => {
  res.send(savedCredentialId || "");
});

app.listen(3000, () => {
  console.log("Running on http://localhost:3000");
});
