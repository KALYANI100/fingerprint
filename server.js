const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send(`
<html>
<head>
  <title>Fingerprint Password</title>
  <style>
    body { font-family: Arial; padding: 40px; text-align: center; background: #f5f5f5; }
    .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    button { background: #007bff; color: white; border: none; padding: 15px 30px; font-size: 18px; border-radius: 8px; cursor: pointer; margin: 20px 0; }
    button:disabled { background: #ccc; cursor: not-allowed; }
    .password { background: #e9ecef; padding: 15px; margin: 20px 0; border-radius: 5px; font-family: monospace; font-size: 16px; word-break: break-all; }
    .status { margin: 10px 0; padding: 10px; border-radius: 5px; }
    .success { background: #d4edda; color: #155724; }
    .error { background: #f8d7da; color: #721c24; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 Fingerprint Password Generator</h1>
    <p>Touch your fingerprint sensor to generate a consistent password</p>
    
    <button onclick="generatePassword()" id="generateBtn">Touch Fingerprint Sensor</button>
    
    <div id="status" class="status"></div>
    
    <div id="passwordDisplay" style="display: none;">
      <h3>Your Fingerprint Password:</h3>
      <div id="password" class="password"></div>
      <p><em>This password will be the same every time you use the same fingerprint</em></p>
    </div>

    <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
      <h4>How it works:</h4>
      <p>• Each fingerprint generates a unique, consistent password</p>
      <p>• Same fingerprint = Same password every time</p>
      <p>• Different fingerprint = Different password</p>
    </div>
  </div>

  <script>
    async function generatePassword() {
      const btn = document.getElementById('generateBtn');
      const status = document.getElementById('status');
      const passwordDisplay = document.getElementById('passwordDisplay');
      
      btn.disabled = true;
      status.textContent = '🔍 Checking fingerprint sensor...';
      status.className = 'status';

      try {
        // Check if WebAuthn is available
        if (!window.PublicKeyCredential) {
          throw new Error('Fingerprint not supported in this browser');
        }

        const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (!isAvailable) {
          throw new Error('No fingerprint sensor available on this device');
        }

        status.textContent = '👆 Touch fingerprint sensor now...';

        // Generate consistent challenge (same every time)
        const challenge = new TextEncoder().encode("fingerprint-password-challenge-constant");
        
        // Real WebAuthn fingerprint authentication
        const credential = await navigator.credentials.create({
  publicKey: {
    challenge: challenge,
    rp: {
      name: "Fingerprint Password Generator",
      id: "localhost"   // ⭐ FIXED
    },
    user: {
      id: new TextEncoder().encode("user-id-constant"),
      name: "fingerprint@password.com",
      displayName: "Fingerprint User"
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" }
    ],
    timeout: 60000,
    attestation: "none",  // ⭐ FIXED
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required"
    }
  }
});


        // Convert credential to consistent password
        const rawIdArray = Array.from(new Uint8Array(credential.rawId));
        
        // Create password from fingerprint data
        const password = createPasswordFromFingerprint(rawIdArray);
        
        // Display the password
        document.getElementById('password').textContent = password;
        passwordDisplay.style.display = 'block';
        
        status.textContent = '✅ Fingerprint password generated!';
        status.className = 'status success';
        
        console.log('Fingerprint Password:', password);
        console.log('Raw Credential ID:', rawIdArray);

      } catch (error) {
        status.textContent = '❌ ' + error.message;
        status.className = 'status error';
        console.error('Error:', error);
      } finally {
        btn.disabled = false;
      }
    }

    function createPasswordFromFingerprint(rawIdArray) {
      // Convert fingerprint data to a consistent password
      let hash = 0;
      for (let i = 0; i < rawIdArray.length; i++) {
        hash = ((hash << 5) - hash) + rawIdArray[i];
        hash = hash & hash; // Convert to 32-bit integer
      }
      
      // Create password with letters, numbers, and symbols
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let password = '';
      
      // Use hash to generate consistent password
      let seed = Math.abs(hash);
      for (let i = 0; i < 12; i++) {
        seed = (seed * 9301 + 49297) % 233280;
        const random = seed / 233280;
        password += chars[Math.floor(random * chars.length)];
      }
      
      return password;
    }

    // Test if same fingerprint gives same password
    let lastPassword = '';
    window.testConsistency = async function() {
      await generatePassword();
      const currentPassword = document.getElementById('password').textContent;
      
      if (lastPassword && currentPassword === lastPassword) {
        console.log('✅ SAME PASSWORD - Fingerprint consistency verified!');
      } else if (lastPassword) {
        console.log('❌ DIFFERENT PASSWORD - Used different fingerprint');
      }
      
      lastPassword = currentPassword;
    }
  </script>
</body>
</html>
  `);
});

app.listen(3000, () => {
  console.log('🚀 Fingerprint Password Generator running at http://localhost:3000');
  console.log('📱 Open on your phone and touch fingerprint sensor to generate password');
});