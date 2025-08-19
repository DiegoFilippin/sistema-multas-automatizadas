import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA'

console.log('Testing Supabase connection and user existence...')

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function testUserExistence() {
  try {
    console.log('\n1. Checking user_profiles table...')
    const { data: profileData, error: profileError } = await supabaseAnon
      .from('user_profiles')
      .select('*')
      .eq('email', 'master@sistema.com')
    
    if (profileError) {
      console.error('❌ Profile query failed:', profileError.message)
    } else {
      console.log('✅ Profile query successful')
      console.log('Profile data:', profileData)
    }
    
    console.log('\n2. Checking auth.users table (using service role)...')
    const { data: authUsers, error: authError } = await supabaseAdmin
      .from('auth.users')
      .select('id, email, created_at, email_confirmed_at')
      .eq('email', 'master@sistema.com')
    
    if (authError) {
      console.error('❌ Auth users query failed:', authError.message)
      console.error('Error details:', authError)
    } else {
      console.log('✅ Auth users query successful')
      console.log('Auth users data:', authUsers)
    }
    
    console.log('\n3. Testing auth with anon client...')
    const { data: authData, error: authTestError } = await supabaseAnon.auth.signInWithPassword({
      email: 'master@sistema.com',
      password: 'master123'
    })
    
    if (authTestError) {
      console.error('❌ Auth test failed:', authTestError.message)
      console.error('Auth error details:', authTestError)
    } else {
      console.log('✅ Auth test successful')
      console.log('User ID:', authData.user?.id)
      console.log('Email confirmed:', authData.user?.email_confirmed_at)
    }
    
    console.log('\n4. Creating/recreating user if needed...')
    
    // First, try to delete existing user if any
    try {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
        '00000000-0000-0000-0000-000000000002'
      )
      if (deleteError && !deleteError.message.includes('User not found')) {
        console.log('Delete error (might be expected):', deleteError.message)
      }
    } catch (e) {
      console.log('Delete attempt completed (user might not exist)')
    }
    
    // Create new user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: 'master@sistema.com',
      password: 'master123',
      email_confirm: true,
      user_metadata: {
        name: 'Admin Master'
      }
    })
    
    if (createError) {
      console.error('❌ User creation failed:', createError.message)
      console.error('Create error details:', createError)
    } else {
      console.log('✅ User created successfully')
      console.log('New user ID:', newUser.user?.id)
      
      // Create/update user profile
      const { data: profileInsert, error: profileInsertError } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
          id: newUser.user!.id,
          email: 'master@sistema.com',
          name: 'Admin Master',
          role: 'admin_master',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
      
      if (profileInsertError) {
        console.error('❌ Profile creation failed:', profileInsertError.message)
      } else {
        console.log('✅ Profile created successfully')
        console.log('Profile data:', profileInsert)
      }
    }
    
    console.log('\n5. Final auth test...')
    const { data: finalAuthData, error: finalAuthError } = await supabaseAnon.auth.signInWithPassword({
      email: 'master@sistema.com',
      password: 'master123'
    })
    
    if (finalAuthError) {
      console.error('❌ Final auth test failed:', finalAuthError.message)
      return false
    } else {
      console.log('✅ Final auth test successful')
      console.log('User ID:', finalAuthData.user?.id)
      return true
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

testUserExistence().then(success => {
  console.log('\n' + (success ? '✅ All tests passed!' : '❌ Some tests failed!'))
  process.exit(success ? 0 : 1)
})