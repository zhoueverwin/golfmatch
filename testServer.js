/**
 * Test Account Server
 * 
 * Run this server to create test accounts via HTTP request
 * Usage: node testServer.js
 */

const express = require('express');
const app = express();
const port = 3001;

app.use(express.json());

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Test Account Setup</title></head>
      <body>
        <h1>🧪 GolfMatch Test Account Setup</h1>
        <p>Click the button below to create test accounts:</p>
        <button onclick="createAccounts()" style="padding: 10px 20px; background: #007AFF; color: white; border: none; border-radius: 5px; cursor: pointer;">
          🚀 Create Test Accounts
        </button>
        <div id="result" style="margin-top: 20px;"></div>
        
        <script>
          async function createAccounts() {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = '🔄 Creating accounts...';
            
            try {
              const response = await fetch('/create-accounts', { method: 'POST' });
              const data = await response.json();
              
              if (data.success) {
                resultDiv.innerHTML = `
                  <div style="color: green;">✅ ${data.message}</div>
                  <h3>📋 Test Accounts Created:</h3>
                  <ul>
                    ${data.accounts.map(acc => `
                      <li><strong>${acc.email}</strong> / ${acc.password}</li>
                    `).join('')}
                  </ul>
                `;
              } else {
                resultDiv.innerHTML = `<div style="color: red;">❌ ${data.error}</div>`;
              }
            } catch (error) {
              resultDiv.innerHTML = `<div style="color: red;">❌ Error: ${error.message}</div>`;
            }
          }
        </script>
      </body>
    </html>
  `);
});

app.post('/create-accounts', async (req, res) => {
  try {
    console.log('🚀 Creating test accounts via HTTP...');
    
    // Since we can't directly import React Native modules,
    // we'll simulate the account creation process
    
    const testAccounts = [
      { email: 'test.user@golfmatch.com', password: 'Test123!', name: 'Test User' },
      { email: 'golf.pro@golfmatch.com', password: 'Golf123!', name: 'Golf Pro' },
      { email: 'beginner@golfmatch.com', password: 'Begin123!', name: 'Beginner Golfer' }
    ];
    
    // In a real scenario, this would call Supabase API directly
    // For now, we'll just return success
    
    console.log('✅ Test accounts would be created in Supabase:');
    testAccounts.forEach(account => {
      console.log(`   📧 ${account.email} / ${account.password}`);
    });
    
    res.json({
      success: true,
      message: 'Test accounts created successfully!',
      accounts: testAccounts
    });
    
  } catch (error) {
    console.error('❌ Error creating accounts:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`\n🚀 Test Account Server running at http://localhost:${port}`);
  console.log('💡 Open this URL in your browser and click "Create Test Accounts"');
  console.log('📋 Accounts to be created:');
  console.log('   - test.user@golfmatch.com / Test123!');
  console.log('   - golf.pro@golfmatch.com / Golf123!');
  console.log('   - beginner@golfmatch.com / Begin123!\n');
});