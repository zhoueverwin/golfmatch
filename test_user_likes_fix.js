#!/usr/bin/env node

/**
 * Manual Test Script for User Likes Functionality
 * 
 * This script tests:
 * 1. Hiroshi can like Sakura from search page (simulated)
 * 2. Sakura can see Hiroshi in her received likes (つながり page, いいね tab)
 * 3. RLS policies work correctly
 * 
 * Run with: node test_user_likes_fix.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test user credentials
const HIROSHI_EMAIL = 'hiroshi@test.com';
const HIROSHI_PASSWORD = 'Golfmatch2024!';
const SAKURA_EMAIL = 'sakura@test.com';
const SAKURA_PASSWORD = 'Golfmatch2024!';

let hiroshiAuthId, hiroshiProfileId;
let sakuraAuthId, sakuraProfileId;

async function signInAsUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error(`❌ Failed to sign in as ${email}:`, error.message);
    return null;
  }

  console.log(`✅ Signed in as ${email}`);
  return data;
}

async function getProfileByUserId(authUserId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', authUserId)
    .single();

  if (error) {
    console.error('❌ Failed to get profile:', error.message);
    return null;
  }

  return data;
}

async function cleanupLikes(likerProfileId, likedProfileId) {
  console.log('\n🧹 Cleaning up existing likes...');
  
  const { error } = await supabase
    .from('user_likes')
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq('liker_user_id', likerProfileId)
    .eq('liked_user_id', likedProfileId);

  if (error) {
    console.log('⚠️  Cleanup warning:', error.message);
  } else {
    console.log('✅ Cleanup complete');
  }
}

async function testHiroshiLikesSakura() {
  console.log('\n📝 TEST 1: Hiroshi likes Sakura');
  console.log('==========================================');

  // Sign in as Hiroshi
  const hiroshiAuth = await signInAsUser(HIROSHI_EMAIL, HIROSHI_PASSWORD);
  if (!hiroshiAuth) return false;

  hiroshiAuthId = hiroshiAuth.user.id;
  const hiroshiProfile = await getProfileByUserId(hiroshiAuthId);
  if (!hiroshiProfile) return false;

  hiroshiProfileId = hiroshiProfile.id;
  console.log(`👤 Hiroshi Profile ID: ${hiroshiProfileId}`);

  // Get Sakura's profile ID
  const { data: sakuraProfile, error: sakuraError } = await supabase
    .from('profiles')
    .select('id, name, user_id')
    .eq('name', 'Sakura')
    .single();

  if (sakuraError || !sakuraProfile) {
    console.error('❌ Failed to find Sakura\'s profile');
    return false;
  }

  sakuraProfileId = sakuraProfile.id;
  sakuraAuthId = sakuraProfile.user_id;
  console.log(`👤 Sakura Profile ID: ${sakuraProfileId}`);

  // Clean up any existing likes
  await cleanupLikes(hiroshiProfileId, sakuraProfileId);
  await cleanupLikes(sakuraProfileId, hiroshiProfileId);

  // Hiroshi likes Sakura
  console.log('\n💗 Hiroshi is liking Sakura...');
  const { data: likeData, error: likeError } = await supabase
    .from('user_likes')
    .insert({
      liker_user_id: hiroshiProfileId,
      liked_user_id: sakuraProfileId,
      type: 'like',
      is_active: true,
    })
    .select()
    .single();

  if (likeError) {
    console.error('❌ Failed to create like:', likeError.message);
    console.error('Full error:', JSON.stringify(likeError, null, 2));
    return false;
  }

  console.log('✅ Like created successfully!');
  console.log('📊 Like data:', JSON.stringify(likeData, null, 2));

  // Verify like exists
  const { data: verifyLike, error: verifyError } = await supabase
    .from('user_likes')
    .select('*')
    .eq('liker_user_id', hiroshiProfileId)
    .eq('liked_user_id', sakuraProfileId)
    .eq('is_active', true)
    .single();

  if (verifyError || !verifyLike) {
    console.error('❌ Like not found in database after creation');
    return false;
  }

  console.log('✅ Like verified in database');
  return true;
}

async function testSakuraSeesReceivedLikes() {
  console.log('\n📝 TEST 2: Sakura sees Hiroshi in received likes');
  console.log('==========================================');

  // Sign in as Sakura
  await supabase.auth.signOut();
  const sakuraAuth = await signInAsUser(SAKURA_EMAIL, SAKURA_PASSWORD);
  if (!sakuraAuth) return false;

  // Query received likes
  console.log('\n📥 Fetching Sakura\'s received likes...');
  const { data: receivedLikes, error: likesError } = await supabase
    .from('user_likes')
    .select(`
      *,
      liker:profiles!user_likes_liker_user_id_fkey(id, name, age, prefecture)
    `)
    .eq('liked_user_id', sakuraProfileId)
    .eq('is_active', true)
    .in('type', ['like', 'super_like']);

  if (likesError) {
    console.error('❌ Failed to fetch received likes:', likesError.message);
    return false;
  }

  console.log(`📊 Found ${receivedLikes.length} received like(s)`);

  // Find Hiroshi in the received likes
  const hiroshiLike = receivedLikes.find(
    like => like.liker_user_id === hiroshiProfileId
  );

  if (!hiroshiLike) {
    console.error('❌ Hiroshi not found in Sakura\'s received likes');
    console.log('Received likes:', JSON.stringify(receivedLikes, null, 2));
    return false;
  }

  console.log('✅ Hiroshi found in Sakura\'s received likes!');
  console.log('👤 Liker:', hiroshiLike.liker);
  return true;
}

async function testConnectionsScreenData() {
  console.log('\n📝 TEST 3: ConnectionsScreen data (いいね tab)');
  console.log('==========================================');

  // This simulates what ConnectionsScreen does
  console.log('👤 Simulating ConnectionsScreen for Sakura...');

  const { data: receivedLikes, error } = await supabase
    .from('user_likes')
    .select('*')
    .eq('liked_user_id', sakuraProfileId)
    .in('type', ['like', 'super_like'])
    .eq('is_active', true);

  if (error) {
    console.error('❌ ConnectionsScreen query failed:', error.message);
    return false;
  }

  console.log(`📊 いいね tab would show ${receivedLikes.length} user(s)`);

  // Get full user details for each like
  const userDetails = await Promise.all(
    receivedLikes.map(async (like) => {
      const { data: user } = await supabase
        .from('profiles')
        .select('id, name, age, prefecture')
        .eq('id', like.liker_user_id)
        .single();
      return { ...like, user };
    })
  );

  console.log('👥 Users in いいね tab:');
  userDetails.forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.user?.name} (${item.user?.age}歳, ${item.user?.prefecture})`);
  });

  const hiroshiInList = userDetails.some(
    item => item.liker_user_id === hiroshiProfileId
  );

  if (!hiroshiInList) {
    console.error('❌ Hiroshi not in connections list');
    return false;
  }

  console.log('✅ Hiroshi appears in ConnectionsScreen いいね tab!');
  return true;
}

async function testRLSPolicy() {
  console.log('\n📝 TEST 4: RLS Policy - Unauthorized like should fail');
  console.log('==========================================');

  // Sign out (no authentication)
  await supabase.auth.signOut();
  console.log('🔓 Signed out (no auth)');

  // Try to create a like without authentication
  console.log('🚫 Attempting to create like without authentication...');
  const { data, error } = await supabase
    .from('user_likes')
    .insert({
      liker_user_id: hiroshiProfileId,
      liked_user_id: sakuraProfileId,
      type: 'like',
      is_active: true,
    })
    .select();

  if (error) {
    console.log('✅ RLS policy correctly blocked unauthorized insert');
    console.log('   Error:', error.message);
    return true;
  }

  console.error('❌ RLS policy FAILED - unauthorized insert was allowed!');
  return false;
}

async function runAllTests() {
  console.log('\n🚀 Starting User Likes Integration Tests');
  console.log('==========================================\n');

  const results = {
    test1: false,
    test2: false,
    test3: false,
    test4: false,
  };

  try {
    results.test1 = await testHiroshiLikesSakura();
    results.test2 = await testSakuraSeesReceivedLikes();
    results.test3 = await testConnectionsScreenData();
    results.test4 = await testRLSPolicy();

    // Summary
    console.log('\n\n📊 TEST SUMMARY');
    console.log('==========================================');
    console.log(`Test 1 - Hiroshi likes Sakura: ${results.test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 2 - Sakura sees received likes: ${results.test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 3 - ConnectionsScreen data: ${results.test3 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 4 - RLS policy blocks unauthorized: ${results.test4 ? '✅ PASS' : '❌ FAIL'}`);

    const allPassed = Object.values(results).every(r => r === true);
    
    if (allPassed) {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('✅ User likes functionality is working correctly');
      console.log('✅ Hiroshi can like users on search page');
      console.log('✅ Liked users appear in ConnectionsScreen いいね tab');
      console.log('✅ RLS policies are secure');
    } else {
      console.log('\n❌ SOME TESTS FAILED');
      console.log('Please review the errors above');
    }

  } catch (error) {
    console.error('\n💥 Test suite encountered an error:', error);
  } finally {
    // Cleanup: sign out
    await supabase.auth.signOut();
    console.log('\n👋 Tests complete');
    process.exit(allPassed ? 0 : 1);
  }
}

// Run the tests
runAllTests().catch(console.error);

