import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { supabase } from '../lib/supabase.js'

interface CreateUserRequest {
  Body: {
    email: string
    password: string
    name: string
    role: 'admin' | 'manager' | 'sales' | 'vendor' | 'analyst' | 'creator'
  }
}

interface JobTriggerRequest {
  Body: {
    type: 'spotify-sync' | 'insights-daily' | 'health-check'
    payload?: any
  }
}

interface Permission {
  platform: string
  can_read: boolean
  can_write: boolean
  can_delete: boolean
}

// Helper function to get default permissions based on role
function getDefaultPermissions(role: string): Permission[] {
  const platforms = ['dashboard', 'instagram', 'spotify', 'soundcloud', 'youtube']
  
  switch (role) {
    case 'admin':
      // Admin gets full access to all platforms
      return platforms.map(platform => ({
        platform,
        can_read: true,
        can_write: true,
        can_delete: true
      }))
      
    case 'manager':
      // Manager gets read/write access to all platforms
      return platforms.map(platform => ({
        platform,
        can_read: true,
        can_write: true,
        can_delete: false
      }))
      
    case 'sales':
      // Sales gets read/write access to client-facing platforms
      return [
        { platform: 'dashboard', can_read: true, can_write: true, can_delete: false },
        { platform: 'instagram', can_read: true, can_write: true, can_delete: false },
        { platform: 'spotify', can_read: true, can_write: true, can_delete: false }
      ]
      
    case 'vendor':
      // Vendor gets read access to content platforms
      return [
        { platform: 'dashboard', can_read: true, can_write: false, can_delete: false },
        { platform: 'spotify', can_read: true, can_write: false, can_delete: false },
        { platform: 'soundcloud', can_read: true, can_write: false, can_delete: false }
      ]
      
    default:
      // Creator (legacy) gets basic access
      return [
        { platform: 'dashboard', can_read: true, can_write: false, can_delete: false },
        { platform: 'spotify', can_read: true, can_write: false, can_delete: false }
      ]
  }
}

export async function adminRoutes(fastify: FastifyInstance) {
  console.log('🔧 Registering admin routes...');
  
  // Get all users in the organization
  fastify.get('/admin/users', {
    // preHandler: [fastify.requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // const user = request.user!
      
      // TODO: Add admin role check
      // if (user.role !== 'admin') {
      //   return reply.code(403).send({ error: 'Admin access required' })
      // }
      
      // Get users from Supabase Auth
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
      
      if (authError) {
        request.log.error(authError, 'Error fetching auth users')
        return reply.code(500).send({ error: 'Failed to fetch users' })
      }
      
      // Get users with their permissions from the new RBAC system
      const { data: usersWithPermissions, error: permError } = await supabase
        .from('user_permissions_view')
        .select('*')
      
      if (permError) {
        request.log.warn(permError, 'Error fetching user permissions, falling back to basic user list')
      }
      
      // Format users with role info and permissions
      const combinedUsers = authUsers.users.map(authUser => {
        const metadata = authUser.user_metadata || {}
        
        // Try to get role from metadata, fallback to email pattern  
        let role = metadata.role || 'creator'
        if (!metadata.role) {
          if (authUser.email?.includes('admin')) role = 'admin'
          else if (authUser.email?.includes('manager')) role = 'manager'
          else if (authUser.email?.includes('analyst')) role = 'analyst'
          else if (authUser.email?.includes('sales')) role = 'sales'
          else if (authUser.email?.includes('vendor')) role = 'vendor'
        }
        
        // Get permissions for this user
        const userPermissions = usersWithPermissions?.find(u => u.user_id === authUser.id)?.permissions || []
        
        return {
          id: authUser.id,
          email: authUser.email,
          name: metadata.full_name || metadata.name || authUser.email?.split('@')[0] || 'Unknown',
          role: role as any,
          org_id: metadata.org_id || '00000000-0000-0000-0000-000000000001',
          org_name: 'ARTi Marketing Demo',
          status: authUser.email_confirmed_at ? 'active' : 'pending',
          last_sign_in_at: authUser.last_sign_in_at,
          created_at: authUser.created_at,
          email_confirmed_at: authUser.email_confirmed_at,
          permissions: userPermissions,
          admin_set_password: metadata.admin_set_password || null,
        }
      })
      
      return reply.send({ users: combinedUsers })
      
    } catch (error) {
      request.log.error(error, 'Error in admin users endpoint')
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Update user permissions
  fastify.put<{ Params: { id: string }, Body: { permissions: Permission[] } }>('/admin/users/:id/permissions', {
    // preHandler: [fastify.requireAuth]
  }, async (request: FastifyRequest<{ Params: { id: string }, Body: { permissions: Permission[] } }>, reply: FastifyReply) => {
    try {
      const { id: userId } = request.params
      const { permissions } = request.body

      if (!userId || !permissions || !Array.isArray(permissions)) {
        return reply.code(400).send({ error: 'User ID and permissions array are required' })
      }

      // TODO: Add admin role check when auth is restored
      // if (user.role !== 'admin') {
      //   return reply.code(403).send({ error: 'Admin access required' })
      // }

      // Verify user exists
      const { data: existingUser, error: userError } = await supabase.auth.admin.getUserById(userId)
      if (userError || !existingUser.user) {
        return reply.code(404).send({ error: 'User not found' })
      }

      // Delete existing permissions
      const { error: deleteError } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId)

      if (deleteError) {
        request.log.error(deleteError, 'Error deleting existing permissions')
        return reply.code(500).send({ error: 'Failed to update permissions' })
      }

      // Insert new permissions
      if (permissions.length > 0) {
        const { error: insertError } = await supabase
          .from('user_permissions')
          .insert(
            permissions.map(perm => ({
              user_id: userId,
              platform: perm.platform,
              can_read: perm.can_read,
              can_write: perm.can_write,
              can_delete: perm.can_delete
            }))
          )

        if (insertError) {
          request.log.error(insertError, 'Error inserting new permissions')
          return reply.code(500).send({ error: 'Failed to update permissions' })
        }
      }

      request.log.info({ userId, permissionCount: permissions.length }, 'Updated user permissions')
      
      return reply.code(200).send({ 
        message: 'Permissions updated successfully',
        userId,
        permissionCount: permissions.length
      })

    } catch (error) {
      request.log.error(error, 'Error updating user permissions')
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Delete a user
  fastify.delete<{ Params: { id: string } }>('/admin/users/:id', {
    // preHandler: [fastify.requireAuth]
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id: userId } = request.params

      if (!userId) {
        return reply.code(400).send({ error: 'User ID is required' })
      }

      // TODO: Add admin role check when auth is restored
      // if (user.role !== 'admin') {
      //   return reply.code(403).send({ error: 'Admin access required' })
      // }

      // Verify user exists
      const { data: existingUser, error: userError } = await supabase.auth.admin.getUserById(userId)
      if (userError || !existingUser.user) {
        return reply.code(404).send({ error: 'User not found' })
      }

      // Delete user permissions first
      const { error: permError } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId)

      if (permError) {
        request.log.warn(permError, 'Error deleting user permissions')
        // Continue with user deletion even if permission cleanup fails
      }

      // Delete user from Supabase Auth
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)
      
      if (deleteError) {
        request.log.error(deleteError, 'Error deleting user')
        return reply.code(500).send({ error: deleteError.message })
      }

      request.log.info({ userId, email: existingUser.user.email }, 'Deleted user')
      
      return reply.code(200).send({ 
        message: 'User deleted successfully',
        userId,
        email: existingUser.user.email
      })

    } catch (error) {
      request.log.error(error, 'Error deleting user')
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Create a new user
  fastify.post<{ Body: CreateUserRequest['Body'] }>('/admin/users', {
    // Temporarily disable auth for development
    // preHandler: [fastify.requireAuth]
  }, async (request: FastifyRequest<{ Body: CreateUserRequest['Body'] }>, reply: FastifyReply) => {
    try {
      const { email, password, name, role } = request.body

      if (!email || !password || !name || !role) {
        return reply.code(400).send({ error: 'Email, password, name, and role are required' })
      }

      // TODO: Add admin role check when auth is restored
      // if (user.role !== 'admin') {
      //   return reply.code(403).send({ error: 'Admin access required' })
      // }

      // Create user in Supabase Auth
      const defaultOrgId = '00000000-0000-0000-0000-000000000001'
      const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { 
          full_name: name,
          name: name,
          role: role, 
          org_id: defaultOrgId,
          org_name: 'ARTi Marketing Demo',
          email_verified: true
        }
      })

      if (createError) {
        request.log.error(createError, 'Error creating auth user')
        return reply.code(500).send({ error: createError.message })
      }
      
      if (!authUser.user) {
        return reply.code(500).send({ error: 'Failed to create user' })
      }
      
      // Create default permissions based on role
      const defaultPermissions = getDefaultPermissions(role)
      
      // Insert user permissions
      const { error: permError } = await supabase
        .from('user_permissions')
        .insert(
          defaultPermissions.map(perm => ({
            user_id: authUser.user.id,
            platform: perm.platform,
            can_read: perm.can_read,
            can_write: perm.can_write,
            can_delete: perm.can_delete
          }))
        )
      
      if (permError) {
        request.log.warn(permError, 'Failed to create user permissions')
      }
      
      return reply.send({
        message: 'User created successfully',
        user: {
          id: authUser.user.id,
          email: authUser.user.email,
          name: name,
          role: role,
          org_id: defaultOrgId,
          org_name: 'ARTi Marketing Demo',
          status: authUser.user.email_confirmed_at ? 'active' : 'pending',
          last_sign_in_at: authUser.user.last_sign_in_at,
          created_at: authUser.user.created_at,
          email_confirmed_at: authUser.user.email_confirmed_at,
          permissions: defaultPermissions
        }
      })
    } catch (error) {
      request.log.error(error, 'Error creating user')
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })



  // Get insights for the organization
  fastify.get('/admin/insights', {
    // preHandler: [fastify.requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // const user = request.user!
      
      const { data: insights, error } = await supabase
        .from('insights')
        .select('*')
        // .eq('org_id', user.orgId)
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) {
        throw error
      }
      
      return reply.send({ insights: insights || [] })
      
    } catch (error) {
      request.log.error(error, 'Error fetching insights')
      return reply.code(500).send({ error: 'Failed to fetch insights' })
    }
  })

  // Trigger a job manually
  fastify.post<{ Body: JobTriggerRequest['Body'] }>('/admin/jobs/trigger', {
    // preHandler: [fastify.requireAuth]
  }, async (request: FastifyRequest<{ Body: JobTriggerRequest['Body'] }>, reply: FastifyReply) => {
    try {
      // const user = request.user!
      const { type, payload = {} } = request.body

      if (!type) {
        return reply.code(400).send({ error: 'Job type is required' })
      }

      // TODO: Add admin role check
      // if (user.role !== 'admin') {
      //   return reply.code(403).send({ error: 'Admin access required' })
      // }

      // TODO: Queue the job using BullMQ
      // For now, just log and return success
      request.log.info({ type, payload }, 'Job trigger requested')
      
      return reply.send({
        message: `${type} job triggered successfully`,
        job_type: type,
        // org_id: user.orgId,
        // triggered_by: user.id
      })
      
    } catch (error) {
      request.log.error(error, 'Error triggering job')
      return reply.code(500).send({ error: 'Failed to trigger job' })
    }
  })

  // Get job status and history
  fastify.get('/admin/jobs', {
    // preHandler: [fastify.requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // const user = request.user!
      
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')
        // .eq('org_id', user.orgId)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (error) {
        throw error
      }
      
      return reply.send({ jobs: jobs || [] })
      
    } catch (error) {
      request.log.error(error, 'Error fetching jobs')
      return reply.code(500).send({ error: 'Failed to fetch jobs' })
    }
  })
}
