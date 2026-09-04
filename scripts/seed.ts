import fs from 'fs';
import path from 'path';

// Load .env.local synchronously before accessing environment variables
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  if (typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile(envLocalPath);
    } catch {}
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const content = fs.readFileSync(envLocalPath, 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = (match[2] || '').trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  }
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seed() {
  console.log('🌱 Starting seed operation...');

  const adminUser = {
    email: 'prashantkhatiwada554@gmail.com',
    password: '#Anihortes123#',
    name: 'Prashant Khatiwada',
    isAdmin: true,
  };

  const testUsers = [
    adminUser,
    { email: 'alice@example.com', password: 'Password123!', name: 'Alice Smith', isAdmin: false },
    { email: 'bob@example.com', password: 'Password123!', name: 'Bob Jones', isAdmin: false },
    { email: 'carol@example.com', password: 'Password123!', name: 'Carol Danvers', isAdmin: false },
  ];

  const createdUserIds: string[] = [];

  for (const user of testUsers) {
    let userId: string | null = null;
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single();

    if (existingUser) {
      userId = existingUser.id;
      console.log(`User ${user.email} already exists in database (${userId})`);
      await supabase.auth.admin.updateUserById(existingUser.id, {
        password: user.password,
        email_confirm: true,
        user_metadata: { name: user.name },
      });
    } else {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { name: user.name },
      });

      if (authError || !authData.user) {
        if (authError?.message?.includes('already been registered') || (authError as any)?.code === 'email_exists') {
          const { data: usersList } = await supabase.auth.admin.listUsers();
          const match = usersList?.users?.find((u) => u.email === user.email);
          if (match) {
            userId = match.id;
            await supabase.auth.admin.updateUserById(match.id, {
              password: user.password,
              email_confirm: true,
              user_metadata: { name: user.name },
            });
            console.log(`Updated existing auth user ${user.email} (${userId})`);
          } else {
            console.error(`Failed to create user ${user.email}:`, authError);
            continue;
          }
        } else {
          console.error(`Failed to create user ${user.email}:`, authError);
          continue;
        }
      } else {
        userId = authData.user.id;
        console.log(`Created user ${user.email} (${userId})`);
      }
    }

    if (userId) {
      createdUserIds.push(userId);
      await supabase
        .from('users')
        .upsert({
          id: userId,
          email: user.email,
          name: user.name,
          is_platform_admin: user.isAdmin,
        }, { onConflict: 'id' });

      if (user.isAdmin) {
        console.log(`Marked ${user.email} as platform admin.`);
      }
    }
  }

  if (createdUserIds.length < 4) {
    console.error('Could not create all required test users.');
  }

  // Create Room 1 (Owner: Prashant, Members: Alice, Bob, Carol)
  const { data: room1, error: r1Error } = await supabase
    .from('rooms')
    .insert({
      name: 'Baker Street Apartment',
      invite_code: 'BAKER221',
      created_by: createdUserIds[0],
    })
    .select()
    .single();

  if (r1Error) {
    console.log('Room 1 status:', r1Error.message);
  } else if (room1) {
    console.log(`Created Room 1: ${room1.name} (${room1.id})`);

    // Add members
    await supabase.from('room_members').insert([
      { room_id: room1.id, user_id: createdUserIds[0], role: 'owner' },
      { room_id: room1.id, user_id: createdUserIds[1], role: 'member' },
      { room_id: room1.id, user_id: createdUserIds[2], role: 'member' },
      { room_id: room1.id, user_id: createdUserIds[3], role: 'member' },
    ]);

    // Open first settlement period
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const { data: period1 } = await supabase
      .from('settlement_periods')
      .insert({
        room_id: room1.id,
        start_date: today.toISOString().split('T')[0],
        end_date: nextMonth.toISOString().split('T')[0],
        status: 'open',
      })
      .select()
      .single();

    // Products
    const { data: prodMilk } = await supabase
      .from('products')
      .insert({
        room_id: room1.id,
        name: 'Whole Milk (1L)',
        default_price: 110,
        unit_label: 'packet',
      })
      .select()
      .single();

    // Sample Expenses
    if (period1 && prodMilk) {
      const { data: exp1 } = await supabase
        .from('expenses')
        .insert({
          room_id: room1.id,
          period_id: period1.id,
          product_id: prodMilk.id,
          item_name: 'Whole Milk (1L)',
          is_fixed: true,
          quantity: 2,
          unit_price: 110,
          total_amount: 220,
          paid_by: createdUserIds[0],
        })
        .select()
        .single();

      if (exp1) {
        const share = 220 / 4;
        await supabase.from('expense_splits').insert([
          { expense_id: exp1.id, user_id: createdUserIds[0], share: Number(share.toFixed(2)) },
          { expense_id: exp1.id, user_id: createdUserIds[1], share: Number(share.toFixed(2)) },
          { expense_id: exp1.id, user_id: createdUserIds[2], share: Number(share.toFixed(2)) },
          { expense_id: exp1.id, user_id: createdUserIds[3], share: Number(share.toFixed(2)) },
        ]);
      }
    }

    // Sample Bills
    if (period1) {
      const { data: billRent } = await supabase
        .from('bills')
        .insert({
          room_id: room1.id,
          period_id: period1.id,
          type: 'rent',
          month: today.toISOString().split('T')[0],
          amount: 16000,
          paid_by: createdUserIds[0],
        })
        .select()
        .single();

      if (billRent) {
        await supabase.from('bill_splits').insert([
          { bill_id: billRent.id, user_id: createdUserIds[0], share: 4000 },
          { bill_id: billRent.id, user_id: createdUserIds[1], share: 4000 },
          { bill_id: billRent.id, user_id: createdUserIds[2], share: 4000 },
          { bill_id: billRent.id, user_id: createdUserIds[3], share: 4000 },
        ]);
      }
    }
  }

  console.log('✅ Seed completed successfully!');
}

seed().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
