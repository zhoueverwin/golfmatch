/**
 * Quick Test Account Setup
 * 
 * Copy and paste this code into your React Native debugger console
 * to create test accounts immediately.
 */

const quickSetup = async () => {
  console.log('🚀 Starting Quick Test Account Setup...\n');
  
  try {
    // Import the test account utilities
    const { 
      createTestAccount, 
      validateTestEnvironment 
    } = require('./src/utils/testAccountCreator');
    
    // Check environment first
    console.log('🔧 Checking environment...');
    const envCheck = validateTestEnvironment();
    
    if (!envCheck.isValid) {
      console.error('❌ Environment issues:');
      envCheck.issues.forEach(issue => console.error(`   - ${issue}`));
      return;
    }
    
    console.log('✅ Environment is good!\n');
    
    // Create test accounts
    const testAccounts = [
      { email: 'test.user@golfmatch.com', password: 'Test123!', name: 'Test User' },
      { email: 'golf.pro@golfmatch.com', password: 'Golf123!', name: 'Golf Pro' },
      { email: 'beginner@golfmatch.com', password: 'Begin123!', name: 'Beginner Golfer' }
    ];
    
    console.log('👥 Creating test accounts...\n');
    
    for (const account of testAccounts) {
      console.log(`📧 Creating: ${account.email}`);
      const result = await createTestAccount(account.email, account.password, { name: account.name });
      
      if (result.success) {
        console.log(`✅ Created: ${account.email}`);
      } else {
        console.log(`❌ Failed: ${account.email} - ${result.error}`);
      }
      
      // Small delay between creations
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🎉 Test account setup completed!');
    console.log('\n📋 Available test accounts:');
    console.log('==========================');
    testAccounts.forEach(account => {
      console.log(`\n📧 ${account.email}`);
      console.log(`🔑 ${account.password}`);
      console.log(`👤 ${account.name}`);
    });
    
    console.log('\n💡 Use these accounts in your AuthScreen to test authentication!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
};

// Run the setup
quickSetup();