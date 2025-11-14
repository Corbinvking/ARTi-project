# SoundCloud Frontend Quick Reference

**Last Updated:** November 14, 2024  
**Status:** ✅ Ready to Use

---

## 🚀 Quick Start

### Accessing the Frontend

```bash
# Start development server
cd apps/frontend
pnpm run dev

# Navigate to SoundCloud section
# URL: http://localhost:3000/soundcloud
```

### Main Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/soundcloud` | UnifiedOverview | Main dashboard |
| `/soundcloud/dashboard/members` | MembersPage | Member management |
| `/soundcloud/dashboard/campaigns` | CampaignsPage | Campaign management |
| `/soundcloud/dashboard/planner` | PlannerPage | Calendar planner |
| `/soundcloud/dashboard/queue` | QueuePage | Queue management |
| `/soundcloud/dashboard/analytics` | AnalyticsPage | Analytics dashboard |
| `/soundcloud/dashboard/health` | HealthPage | System health |
| `/soundcloud/dashboard/automation` | AutomationPage | Automation rules |
| `/soundcloud/dashboard/genres` | GenresPage | Genre management |
| `/soundcloud/dashboard/settings` | SettingsPage | System settings |

---

## 📊 Data Fetching Patterns

### Option 1: Using New React Query Hooks (Recommended)

```typescript
import { useMembers, useCreateMember } from '../../hooks/useSoundCloudData';

function MyComponent() {
  // Fetch members with filters
  const { 
    data: members, 
    isLoading, 
    error, 
    refetch 
  } = useMembers({ 
    status: 'active', 
    tier: 'T3' 
  });
  
  // Create member mutation
  const createMember = useCreateMember();
  
  // Handle submit
  const handleSubmit = async (data) => {
    await createMember.mutateAsync(data);
    toast({ title: "Member created!" });
  };
  
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div>
      {members?.map(member => (
        <MemberCard key={member.id} member={member} />
      ))}
      <Button onClick={() => refetch()}>Refresh</Button>
    </div>
  );
}
```

### Option 2: Direct Supabase Queries (Current Pattern)

```typescript
import { supabase } from '../../integrations/supabase/client';
import { useState, useEffect } from 'react';

function MyComponent() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchMembers();
  }, []);
  
  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('soundcloud_members')  // ✅ Always use soundcloud_ prefix
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      {loading ? <Skeleton /> : members.map(m => <div key={m.id}>{m.name}</div>)}
    </div>
  );
}
```

---

## 🗄️ Database Table Reference

### Always Use `soundcloud_` Prefix

```typescript
// ✅ CORRECT
.from('soundcloud_members')
.from('soundcloud_campaigns')
.from('soundcloud_submissions')
.from('soundcloud_queues')
.from('soundcloud_genre_families')
.from('soundcloud_subgenres')
.from('soundcloud_member_accounts')
.from('soundcloud_repost_credit_wallet')
.from('soundcloud_repost_credit_ledger')

// ❌ WRONG - Will not find data!
.from('members')
.from('campaigns')
.from('submissions')
```

### Common Queries

**Fetch members:**
```typescript
const { data } = await supabase
  .from('soundcloud_members')
  .select('*')
  .order('created_at', { ascending: false });
```

**Fetch campaigns with client:**
```typescript
const { data } = await supabase
  .from('soundcloud_campaigns')
  .select(`
    *,
    client:soundcloud_clients(id, name, email)
  `)
  .order('created_at', { ascending: false });
```

**Fetch member with related data:**
```typescript
const { data } = await supabase
  .from('soundcloud_members')
  .select(`
    *,
    wallet:soundcloud_repost_credit_wallet(*),
    accounts:soundcloud_member_accounts(*),
    submissions:soundcloud_submissions(*)
  `)
  .eq('id', memberId)
  .single();
```

**Filter by status:**
```typescript
const { data } = await supabase
  .from('soundcloud_members')
  .select('*')
  .eq('status', 'active')
  .eq('size_tier', 'T3');
```

**Search by name or email:**
```typescript
const { data } = await supabase
  .from('soundcloud_members')
  .select('*')
  .or(`name.ilike.%${searchTerm}%,primary_email.ilike.%${searchTerm}%`);
```

---

## 🎨 UI Component Patterns

### Loading States

```typescript
import { Skeleton } from '@/components/ui/skeleton';

if (isLoading) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
```

### Error States

```typescript
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

if (error) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        {error.message || "Failed to load data"}
      </AlertDescription>
    </Alert>
  );
}
```

### Empty States

```typescript
import { Users } from 'lucide-react';

if (data.length === 0) {
  return (
    <div className="text-center py-12">
      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
      <h3 className="text-lg font-semibold mb-2">No members found</h3>
      <p className="text-muted-foreground mb-4">
        Get started by adding your first member
      </p>
      <Button onClick={() => setShowAddModal(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Member
      </Button>
    </div>
  );
}
```

### Table Display

```typescript
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Tier</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {members.map(member => (
      <TableRow key={member.id}>
        <TableCell className="font-medium">{member.name}</TableCell>
        <TableCell>{member.primary_email}</TableCell>
        <TableCell>
          <Badge variant="secondary">{member.size_tier}</Badge>
        </TableCell>
        <TableCell>
          <Badge variant={member.status === 'active' ? 'success' : 'warning'}>
            {member.status}
          </Badge>
        </TableCell>
        <TableCell>
          <Button variant="ghost" size="sm" onClick={() => handleEdit(member)}>
            Edit
          </Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## 🔄 CRUD Operations

### Create

```typescript
const handleCreate = async (formData) => {
  try {
    const { data, error } = await supabase
      .from('soundcloud_members')
      .insert({
        name: formData.name,
        primary_email: formData.email,
        soundcloud_url: formData.url,
        status: 'active',
        size_tier: 'T1',
      })
      .select()
      .single();
    
    if (error) throw error;
    
    toast({
      title: "Success",
      description: "Member created successfully",
    });
    
    // Refresh data
    fetchMembers();
  } catch (error) {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive",
    });
  }
};
```

### Update

```typescript
const handleUpdate = async (memberId, updates) => {
  try {
    const { error } = await supabase
      .from('soundcloud_members')
      .update(updates)
      .eq('id', memberId);
    
    if (error) throw error;
    
    toast({
      title: "Success",
      description: "Member updated successfully",
    });
    
    fetchMembers();
  } catch (error) {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive",
    });
  }
};
```

### Delete

```typescript
const handleDelete = async (memberId) => {
  try {
    // Delete related records first (FK constraints)
    await supabase.from('soundcloud_member_accounts').delete().eq('member_id', memberId);
    await supabase.from('soundcloud_member_genres').delete().eq('member_id', memberId);
    await supabase.from('soundcloud_repost_credit_wallet').delete().eq('member_id', memberId);
    
    // Delete member
    const { error } = await supabase
      .from('soundcloud_members')
      .delete()
      .eq('id', memberId);
    
    if (error) throw error;
    
    toast({
      title: "Success",
      description: "Member deleted successfully",
    });
    
    fetchMembers();
  } catch (error) {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive",
    });
  }
};
```

---

## 🎯 Common Patterns

### Filtering

```typescript
const [statusFilter, setStatusFilter] = useState('all');
const [tierFilter, setTierFilter] = useState('all');

const filteredMembers = useMemo(() => {
  return members.filter(member => {
    if (statusFilter !== 'all' && member.status !== statusFilter) return false;
    if (tierFilter !== 'all' && member.size_tier !== tierFilter) return false;
    return true;
  });
}, [members, statusFilter, tierFilter]);
```

### Sorting

```typescript
const [sortBy, setSortBy] = useState('created_at');
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

const sortedMembers = useMemo(() => {
  return [...members].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
}, [members, sortBy, sortDirection]);
```

### Searching

```typescript
const [searchTerm, setSearchTerm] = useState('');

const searchedMembers = useMemo(() => {
  if (!searchTerm) return members;
  
  const term = searchTerm.toLowerCase();
  return members.filter(member => 
    member.name.toLowerCase().includes(term) ||
    member.primary_email.toLowerCase().includes(term)
  );
}, [members, searchTerm]);
```

---

## 🐛 Debugging Tips

### Check Database Connection

```typescript
// Test query in browser console
await supabase.from('soundcloud_members').select('count');
// Should return: { count: X, error: null }
```

### Check RLS Policies

```typescript
// If you get permission errors, check RLS
const { data: session } = await supabase.auth.getSession();
console.log('User:', session?.user);
console.log('Roles:', session?.user?.app_metadata?.roles);
```

### Network Tab

Open browser DevTools > Network tab and look for:
- ✅ Requests to `/rest/v1/soundcloud_*` (correct)
- ❌ Requests to `/rest/v1/members` (wrong - missing prefix)

### Common Errors

**"relation does not exist"**
```
❌ Using wrong table name (missing soundcloud_ prefix)
✅ Use: soundcloud_members, not members
```

**"permission denied for table"**
```
❌ RLS policy blocking access
✅ Check auth state and user roles
```

**"null value in column violates not-null constraint"**
```
❌ Missing required field
✅ Check database schema for NOT NULL columns
```

---

## 📝 Testing Checklist

### Members Page
- [ ] Members list displays
- [ ] Filtering by status works
- [ ] Filtering by tier works
- [ ] Search works
- [ ] Sort by columns works
- [ ] Add new member works
- [ ] Edit member works
- [ ] Delete member works
- [ ] Member detail modal opens
- [ ] Bulk import works

### Campaigns Page
- [ ] Campaigns list displays
- [ ] Filtering by status works
- [ ] Campaign details modal opens
- [ ] Create campaign works
- [ ] Edit campaign works
- [ ] Delete campaign works
- [ ] Attribution analytics display

### General
- [ ] Navigation between tabs works
- [ ] Loading states show correctly
- [ ] Error states show correctly
- [ ] Toast notifications appear
- [ ] Data refreshes after mutations

---

## 🚀 Next Steps

1. **Test the frontend:**
   ```bash
   cd apps/frontend
   pnpm run dev
   # Visit: http://localhost:3000/soundcloud/dashboard/members
   ```

2. **Check member list loads:**
   - Should see members from `soundcloud_members` table
   - Should see genre filters
   - Should see tier badges

3. **Check campaigns list loads:**
   - Should see campaigns from `soundcloud_campaigns` table
   - Should see client information
   - Should see status badges

4. **Try CRUD operations:**
   - Add a new member
   - Edit a member
   - Delete a member
   - Verify changes persist

---

**Questions?** Check the main documentation:
- `SOUNDCLOUD-DATABASE-SCHEMA.md` - Database schema reference
- `SOUNDCLOUD-PLATFORM-COMPLETE-GUIDE.md` - Complete platform guide
- `.cursorrules-soundcloud` - Development rules and patterns
- `SOUNDCLOUD-DATA-ROUTING-FIX.md` - Recent fixes applied

**Status:** ✅ All data routing fixed and ready to use!


