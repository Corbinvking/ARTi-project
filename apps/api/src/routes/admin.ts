import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { supabase } from '../lib/supabase.js'

interface CreateUserRequest {
  Body: {
    email: string
    password: string
    name: string
    role: 'admin' | 'manager' | 'analyst' | 'creator'
  }
}

interface JobTriggerRequest {
  Body: {
    type: 'spotify-sync' | 'insights-daily' | 'health-check'
    payload?: any
  }
}

export async function adminRoutes(fastify: FastifyInstance) {
  
  // Get all users in the organization
  fastify.get('/admin/users', {
    preHandler: [fastify.requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user!
      
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
      
      // Format users with role info from user metadata
      const combinedUsers = authUsers.users.map(authUser => {
        const metadata = authUser.user_metadata || {}
        
        // Try to get role from metadata, fallback to email pattern
        let role = metadata.role || 'creator'
        if (!metadata.role) {
          if (authUser.email?.includes('admin')) role = 'admin'
          else if (authUser.email?.includes('manager')) role = 'manager'
          else if (authUser.email?.includes('analyst')) role = 'analyst'
        }
        
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
          email_confirmed_at: authUser.email_confirmed_at
        }
      })
      
      return reply.send({ users: combinedUsers })
      
    } catch (error) {
      request.log.error(error, 'Error in admin users endpoint')
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
          email_confirmed_at: authUser.user.email_confirmed_at
        }
      })
    } catch (error) {
      request.log.error(error, 'Error creating user')
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Delete a user
  fastify.delete('/admin/users/:id', {
    preHandler: [fastify.requireAuth]
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const user = request.user!
      const { id } = request.params

      // TODO: Add admin role check
      // if (user.role !== 'admin') {
      //   return reply.code(403).send({ error: 'Admin access required' })
      // }

      if (id === user.id) {
        return reply.code(400).send({ error: 'Cannot delete your own account' })
      }

      const { error: deleteError } = await supabase.auth.admin.deleteUser(id)

      if (deleteError) {
        request.log.error(deleteError, 'Error deleting auth user')
        return reply.code(500).send({ error: deleteError.message })
      }

      return reply.send({ message: 'User deleted successfully' })
    } catch (error) {
      request.log.error(error, 'Error deleting user')
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Get insights for the organization
  fastify.get('/admin/insights', {
    preHandler: [fastify.requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user!
      
      const { data: insights, error } = await supabase
        .from('insights')
        .select('*')
        .eq('org_id', user.orgId)
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
    preHandler: [fastify.requireAuth]
  }, async (request: FastifyRequest<{ Body: JobTriggerRequest['Body'] }>, reply: FastifyReply) => {
    try {
      const user = request.user!
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
      request.log.info({ type, payload, user: user.id }, 'Job trigger requested')
      
      return reply.send({
        message: `${type} job triggered successfully`,
        job_type: type,
        org_id: user.orgId,
        triggered_by: user.id
      })
      
    } catch (error) {
      request.log.error(error, 'Error triggering job')
      return reply.code(500).send({ error: 'Failed to trigger job' })
    }
  })

  // Get job status and history
  fastify.get('/admin/jobs', {
    preHandler: [fastify.requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user!
      
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('org_id', user.orgId)
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
