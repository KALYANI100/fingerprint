res.send(`
<html>
<head>
  <title>Fingerprint Login Demo</title>
  <style>
    body { font-family: Arial; background: #f5f5f5; padding: 40px; }
    .box { background: #fff; padding: 25px; border-radius: 10px; width: 450px; margin: 20px auto;
           box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    button { padding: 12px 20px; font-size: 16px; margin-top: 10px; cursor: pointer; }
    .success { color: #155724; background: #d4edda; padding: 10px; border-radius: 5px; }
    .error { color: #721c24; background: #f8d7da; padding: 10px; border-radius: 5px; }
    pre { background: #eee; padding: 10px; font-size: 14px; }
  </style>
</head>
<body>

<h1 style="text-align:center">🔐 Fingerprint WebAuthn Demo</h1>

<div class="box">
  <h2>1️⃣ Register Fingerprint</h2>
  <p>This creates a credential and saves it.</p>
  <button onclick="register()">Register</button>
  <div id="regStatus"></div>
</div>

<div class="box">
  <h2>2️⃣ Authenticate & Generate Same Password</h2>
  <p>This uses stored credential ID to always return same password.</p>
  <button onclick="authenticate()">Authenticate</button>
  <div id="authStatus"></div>

  <h3>Password:</h3>
  <pre id="password"></pre>
</div>

<script>
  // Utility: convert array buffer → array
  function bufToArr(buf) {
    return Array.from(new Uint8Array(buf));
  }

  // Create password from rawId (consistent)
  function makePassword(rawIdArr) {
    let hash = 0;
    rawIdArr.forEach(n => {
      hash = ((hash << 5) - hash) + n;
      hash |= 0;
    });

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    let pwd = "";
    let seed = Math.abs(hash);

    for (let i = 0; i < 12; i++) {
      seed = (seed * 16807) % 2147483647;
      pwd += chars[seed % chars.length];
    }
    return pwd;
  }

  // ---------------------------
  // 1️⃣ REGISTER FINGERPRINT
  // ---------------------------
  async function register() {
    const regStatus = document.getElementById("regStatus");
    regStatus.innerHTML = "";

    try {
      const challenge = new TextEncoder().encode("fixed-challenge-123");

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Demo", id: "localhost" },
          user: {
            id: new TextEncoder().encode("user123"),
            name: "test@example.com",
            displayName: "User"
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

      const rawId = bufToArr(credential.rawId);

      // Save for later auth
      localStorage.setItem("credentialId", JSON.stringify(rawId));

      regStatus.innerHTML =
        '<div class="success">✅ Registered & credential saved!</div>';

    } catch (err) {
      regStatus.innerHTML =
        '<div class="error">❌ ' + err.message + '</div>';
    }
  }

  // ---------------------------
  // 2️⃣ AUTHENTICATE
  // ---------------------------
  async function authenticate() {
    const authStatus = document.getElementById("authStatus");
    const passBox = document.getElementById("password");
    authStatus.innerHTML = "";
    passBox.innerHTML = "";

    try {
      const savedRawId = JSON.parse(localStorage.getItem("credentialId"));
      if (!savedRawId) throw new Error("No credential registered!");

      const allowCred = [{
        id: new Uint8Array(savedRawId).buffer,
        type: "public-key"
      }];

      const challenge = new Uint8Array([1,2,3,4]); // arbitrary

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: allowCred,
          userVerification: "required"
        }
      });

      const rawIdArr = bufToArr(assertion.rawId);
      const password = makePassword(rawIdArr);

      authStatus.innerHTML =
        '<div class="success">✅ Authentication success!</div>';
      passBox.textContent = password;

    } catch (err) {
      authStatus.innerHTML =
        '<div class="error">❌ ' + err.message + '</div>';
    }
  }
</script>

</body>
</html>
`);
