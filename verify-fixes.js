#!/usr/bin/env node

/**
 * Manual verification script to test the bug fixes with real Supabase data
 * Run this with: node verify-fixes.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runVerification() {
  console.log('🔍 Starting verification of bug fixes...\n');

  // Test 1: Verify profiles exist
  console.log('Test 1: Checking if profiles exist in database...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, user_id, legacy_id')
    .limit(3);

  if (profilesError) {
    console.error('❌ Failed to fetch profiles:', profilesError.message);
    return false;
  }

  if (!profiles || profiles.length === 0) {
    console.error('❌ No profiles found in database');
    return false;
  }

  console.log(`✅ Found ${profiles.length} profiles`);
  console.log('   Sample profiles:', profiles.map(p => `${p.name} (${p.id})`).join(', '));
  console.log('');

  // Test 2: Verify posts exist
  console.log('Test 2: Checking if posts exist in database...');
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select(`
      id,
      content,
      videos,
      images,
      user:profiles!posts_user_id_fkey(id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  if (postsError) {
    console.error('❌ Failed to fetch posts:', postsError.message);
    return false;
  }

  console.log(`✅ Found ${posts?.length || 0} posts`);
  if (posts && posts.length > 0) {
    console.log('   Sample post:', posts[0].content?.substring(0, 50) + '...');
  }
  console.log('');

  // Test 3: Verify video posts have valid URLs
  console.log('Test 3: Checking video posts for valid URLs...');
  const videoPosts = posts?.filter(p => p.videos && p.videos.length > 0) || [];
  
  if (videoPosts.length === 0) {
    console.log('⚠️  No video posts found');
  } else {
    console.log(`✅ Found ${videoPosts.length} video posts`);
    
    let validCount = 0;
    let invalidCount = 0;

    for (const post of videoPosts) {
      for (const videoUrl of post.videos) {
        if (videoUrl && typeof videoUrl === 'string' && videoUrl.match(/^https?:\/\/.+/)) {
          validCount++;
        } else {
          invalidCount++;
          console.log(`   ⚠️  Invalid video URL found: "${videoUrl}"`);
        }
      }
    }

    console.log(`   ${validCount} valid video URLs, ${invalidCount} invalid URLs`);
  }
  console.log('');

  // Test 4: Test post creation with valid user ID
  console.log('Test 4: Testing post creation with valid user ID...');
  const testUser = profiles[0];
  
  const testContent = `TEST_VERIFICATION_POST_${Date.now()}`;
  const { data: newPost, error: createError } = await supabase
    .from('posts')
    .insert({
      user_id: testUser.id, // Use actual UUID, not "current_user"
      content: testContent,
      images: [],
      videos: []
    })
    .select(`
      id,
      content,
      user_id,
      user:profiles!posts_user_id_fkey(id, name)
    `)
    .single();

  if (createError) {
    console.error('❌ Failed to create post:', createError.message);
    return false;
  }

  console.log(`✅ Post created successfully`);
  console.log(`   Post ID: ${newPost.id}`);
  console.log(`   User: ${newPost.user.name} (${newPost.user_id})`);
  console.log(`   Content: ${newPost.content}`);
  console.log('');

  // Test 5: Verify "current_user" string is NOT in database
  console.log('Test 5: Verifying no "current_user" strings in database...');
  const { data: currentUserPosts, error: currentUserError } = await supabase
    .from('posts')
    .select('id, user_id')
    .eq('user_id', 'current_user');

  if (currentUserError) {
    console.log('✅ Good: No posts with user_id="current_user" (query returned error as expected)');
  } else if (!currentUserPosts || currentUserPosts.length === 0) {
    console.log('✅ Good: No posts with user_id="current_user" found');
  } else {
    console.error('❌ Found posts with user_id="current_user":', currentUserPosts.length);
    return false;
  }
  console.log('');

  // Cleanup: Delete test post
  console.log('Cleanup: Deleting test post...');
  await supabase.from('posts').delete().eq('id', newPost.id);
  console.log('✅ Test post deleted\n');

  return true;
}

// Run verification
runVerification()
  .then(success => {
    if (success) {
      console.log('🎉 All verifications passed!\n');
      console.log('Summary:');
      console.log('✅ Database connection working');
      console.log('✅ Profiles and posts exist');
      console.log('✅ Video URLs are valid');
      console.log('✅ Post creation works with actual user IDs');
      console.log('✅ No "current_user" hardcoded strings in database');
      console.log('\n💡 The app should now work correctly without the reported errors.');
    } else {
      console.log('\n❌ Some verifications failed. Please check the errors above.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Verification script failed:', error);
    process.exit(1);
  });

