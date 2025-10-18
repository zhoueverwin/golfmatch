/**
 * Test script to verify MessagesScreen UI integration
 * Run this to check if the app can load chats correctly
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase config (from your app)
const SUPABASE_URL = 'https://wqwqfvwbnhwxbqjpwsrb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indxd3Fmdndibmh3eGJxanB3c3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg3OTE5MjQsImV4cCI6MjA0NDM2NzkyNH0.qvPRZJdEz7sPqUmHqj4qXxOOZxQZJaXHc_jb_qlIFQs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Hiroshi's user ID
const HIROSHI_USER_ID = '1b05870e-ff52-432e-a1e5-efb3282ca2de';

async function testGetUserChats() {
  console.log('\n🧪 Testing MessagesScreen UI Integration\n');
  console.log('=' .repeat(60));
  
  try {
    console.log('\n📋 Step 1: Call get_user_chats() function');
    console.log('User ID:', HIROSHI_USER_ID);
    
    const { data, error } = await supabase
      .rpc('get_user_chats', { p_user_id: HIROSHI_USER_ID });
    
    if (error) {
      console.error('❌ Error calling get_user_chats:', error);
      return;
    }
    
    console.log('\n✅ Success! Got response from Supabase');
    console.log('Number of chats:', data?.length || 0);
    
    if (!data || data.length === 0) {
      console.log('\n⚠️  No chats returned!');
      return;
    }
    
    console.log('\n📊 Chats returned:');
    console.log('=' .repeat(60));
    
    data.forEach((chat, index) => {
      console.log(`\n${index + 1}. ${chat.other_user_name}`);
      console.log('   Chat ID:', chat.chat_id);
      console.log('   Other User ID:', chat.other_user_id);
      console.log('   Profile Image:', chat.other_user_image);
      console.log('   Last Message:', chat.last_message || 'None');
      console.log('   Unread Count:', chat.unread_count);
      console.log('   Last Message At:', chat.last_message_at);
      console.log('   Is Online:', chat.is_online);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('\n📱 What MessagesScreen should display:');
    console.log('=' .repeat(60));
    
    data.forEach((chat, index) => {
      const timestamp = new Date(chat.last_message_at);
      const now = new Date();
      const diff = now.getTime() - timestamp.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      
      let displayTime;
      if (minutes < 60) {
        displayTime = `${minutes}分前`;
      } else if (hours < 24) {
        displayTime = `${hours}時間前`;
      } else if (days < 7) {
        displayTime = `${days}日前`;
      } else {
        displayTime = timestamp.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
      }
      
      console.log(`\n${index + 1}. ${chat.other_user_name}`);
      console.log(`   "${chat.last_message}"`);
      console.log(`   ${displayTime}`);
      if (chat.unread_count > 0) {
        console.log(`   🔴 未返信 (${chat.unread_count})`);
      }
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Test Complete!');
    console.log(`\nExpected: MessagesScreen should show ${data.length} chats`);
    console.log('Actual: Check your app now');
    
    console.log('\n📝 Next Steps:');
    console.log('1. Open the app');
    console.log('2. Navigate to Messages tab');
    console.log('3. Pull down to refresh');
    console.log('4. You should see these', data.length, 'chats');
    
    console.log('\n🔍 Debugging:');
    console.log('If you don\'t see all chats:');
    console.log('- Check console logs in your app');
    console.log('- Look for "📱 MessagesScreen" logs');
    console.log('- Verify user ID matches:', HIROSHI_USER_ID);
    console.log('- Try restarting the app');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the test
testGetUserChats().then(() => {
  console.log('\n');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

