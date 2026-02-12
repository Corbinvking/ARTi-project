-- Store temp passwords in user metadata so admins can see them
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'qK4pJcxuNX9t') WHERE email = 'jared@artistinfluence.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'rwBYHfMDndze') WHERE email = 'philippe@artistinfluence.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'GemcsJLAc5fQ') WHERE email = 'priime@artistinfluence.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', '4WT5y8fEjqRv') WHERE email = 'joe@artistinfluence.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'gTJgtqAX9Hzk') WHERE email = 'brendan@artistinfluence.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'aRVmTMzL4jFR') WHERE email = 'jack@sunmachine.ltd';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'WLtWPLgzvSSk') WHERE email = 'alex@glassemainframe.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'yjfPuyzHyjJs') WHERE email = 'marissafox@nolimitgroup.co';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'dhwwxAdYJHwx') WHERE email = 'jack@artistinfluence.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'cAWPR2BHBuMZ') WHERE email = 'katt@artistinfluence.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'vRw8Q8XGmf7P') WHERE email = 'livemediaprod@gmail.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'Are7SqYRt4nH') WHERE email = 'n8landmusic@gmail.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'VmpVRvdx5Bau') WHERE email = 'eric@lightcave.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'tn7GyL6fajBQ') WHERE email = 'amit@prim8music.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'sxyjrb6rvzAu') WHERE email = 'danielle@artistinfluence.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'T3MZzgPzkJhW') WHERE email = 'danny@hitskope.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'Du4GmqWej47D') WHERE email = 'issymusic@gmail.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'SaSKyaWNDyEb') WHERE email = 'sam@hitlist.co';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'z9wVJLKYcWXg') WHERE email = 'christine.perez-wood@tunecore.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'zH5ZRCDRrPTz') WHERE email = 'annette@artistinfluence.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'k32FAnpuh2sG') WHERE email = 'reza@artistinfluence.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'bK3Tzw7HmxCQ') WHERE email = 'cam@artistinfluence.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'EYyz3TdL7rAJ') WHERE email = 'helenehoward.mgmt@gmail.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'nBeHuSPvejQq') WHERE email = 'ttopdjian@gmail.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'BqxKjWQGnyDk') WHERE email = 'jenni@rightcallmedia.co';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'A2hXBCqGK93P') WHERE email = 'phuturecollective@gmail.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('admin_set_password', 'tyYAktvtnLdg') WHERE email = 'luke@nolimitgroup.co';

-- Verify
SELECT email, raw_user_meta_data->>'admin_set_password' as stored_password
FROM auth.users
WHERE raw_user_meta_data->>'admin_set_password' IS NOT NULL
ORDER BY email;
