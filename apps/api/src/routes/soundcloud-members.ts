import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { supabase } from '../lib/supabase.js'
import crypto from 'crypto'

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

interface ProvisionAuthBody {
  memberId: string
  email: string
  name: string
}

interface BulkProvisionAuthBody {
  memberIds: string[]
}

interface MemberIdParam {
  id: string
}

interface ResetPasswordBody {
  newPassword: string
}

interface UpdateAuthEmailBody {
  newEmail: string
}

interface ProvisionResult {
  memberId: string
  memberName: string
  email: string
  status: 'created' | 'linked' | 'skipped' | 'error'
  userId?: string
  reason?: string
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function generateTempPassword(): string {
  return `SC_${crypto.randomBytes(12).toString('base64url')}!`
}

async function resolveAuthUserId(memberId: string): Promise<string | null> {
  // Try linking table first
  const { data: linkData } = await supabase
    .from('soundcloud_member_users')
    .select('user_id')
    .eq('member_id', memberId)
    .maybeSingle()

  if (linkData?.user_id) return linkData.user_id

  // Fallback: direct user_id on member row
  const { data: memberData } = await supabase
    .from('soundcloud_members')
    .select('user_id')
    .eq('id', memberId)
    .single()

  return memberData?.user_id || null
}

async function provisionSingleMember(
  memberId: string,
  email: string,
  name: string,
  log: FastifyRequest['log']
): Promise<ProvisionResult> {
  const base: Pick<ProvisionResult, 'memberId' | 'memberName' | 'email'> = {
    memberId,
    memberName: name,
    email,
  }

  if (!email || !email.includes('@')) {
    return { ...base, status: 'skipped', reason: 'Invalid or missing email address' }
  }

  try {
    // 1. Check if member already has auth credentials
    const { data: existingLink } = await supabase
      .from('soundcloud_member_users')
      .select('user_id')
      .eq('member_id', memberId)
      .maybeSingle()

    if (existingLink?.user_id) {
      return { ...base, status: 'skipped', userId: existingLink.user_id, reason: 'Already provisioned' }
    }

    // Also check via direct user_id on the member row
    const { data: memberRow } = await supabase
      .from('soundcloud_members')
      .select('user_id')
      .eq('id', memberId)
      .single()

    if (memberRow?.user_id) {
      return { ...base, status: 'skipped', userId: memberRow.user_id, reason: 'Already provisioned (direct link)' }
    }

    // 2. Check if an auth user with this email already exists
    const { data: authList } = await supabase.auth.admin.listUsers()
    const existingUser = authList?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )

    if (existingUser) {
      // Link existing auth user to this member
      const { error: linkError } = await supabase
        .from('soundcloud_member_users')
        .upsert(
          { user_id: existingUser.id, member_id: memberId },
          { onConflict: 'member_id' }
        )

      if (linkError) {
        log.warn({ linkError, memberId }, 'Failed to upsert member-user link')
      }

      await supabase
        .from('soundcloud_members')
        .update({ user_id: existingUser.id, influence_planner_status: 'invited' })
        .eq('id', memberId)

      return { ...base, status: 'linked', userId: existingUser.id, reason: 'Linked to existing auth user' }
    }

    // 3. Create a brand-new auth user
    const tempPassword = generateTempPassword()

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        role: 'member',
        is_member: true,
        full_name: name,
        member_id: memberId,
        admin_set_password: tempPassword,
      },
    })

    if (authError || !authData.user) {
      throw authError || new Error('Auth user creation returned no user')
    }

    const newUserId = authData.user.id

    // 4. Update member + create link
    await supabase
      .from('soundcloud_members')
      .update({ user_id: newUserId, influence_planner_status: 'invited' })
      .eq('id', memberId)

    const { error: linkError } = await supabase
      .from('soundcloud_member_users')
      .insert({ user_id: newUserId, member_id: memberId })

    if (linkError) {
      log.warn({ linkError, memberId }, 'Failed to insert member-user link')
    }

    return { ...base, status: 'created', userId: newUserId }
  } catch (err: any) {
    log.error({ err, memberId }, 'Error provisioning member auth')
    return { ...base, status: 'error', reason: err.message || 'Unknown error' }
  }
}

// --------------------------------------------------------------------------
// Routes
// --------------------------------------------------------------------------

export async function soundcloudMemberRoutes(fastify: FastifyInstance) {
  fastify.log.info('Registering SoundCloud member auth routes...')

  // -----------------------------------------------------------------------
  // POST /soundcloud/members/provision-auth
  // Provision auth credentials for a single member
  // -----------------------------------------------------------------------
  fastify.post<{ Body: ProvisionAuthBody }>(
    '/soundcloud/members/provision-auth',
    async (request, reply) => {
      try {
        const { memberId, email, name } = request.body

        if (!memberId || !email || !name) {
          return reply.code(400).send({ error: 'memberId, email, and name are required' })
        }

        const result = await provisionSingleMember(memberId, email, name, request.log)

        return reply.send(result)
      } catch (error: any) {
        request.log.error(error, 'Error in provision-auth endpoint')
        return reply.code(500).send({ error: 'Internal server error' })
      }
    }
  )

  // -----------------------------------------------------------------------
  // POST /soundcloud/members/bulk-provision-auth
  // Bulk-provision auth credentials for many members at once
  // -----------------------------------------------------------------------
  fastify.post<{ Body: BulkProvisionAuthBody }>(
    '/soundcloud/members/bulk-provision-auth',
    async (request, reply) => {
      try {
        const { memberIds } = request.body

        if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
          return reply.code(400).send({ error: 'memberIds array is required and must not be empty' })
        }

        // Fetch all member records in one query
        const { data: members, error: fetchError } = await supabase
          .from('soundcloud_members')
          .select('id, name, primary_email, emails, user_id')
          .in('id', memberIds)

        if (fetchError) {
          request.log.error(fetchError, 'Failed to fetch members for bulk provisioning')
          return reply.code(500).send({ error: 'Failed to fetch member records' })
        }

        if (!members || members.length === 0) {
          return reply.send({ provisioned: 0, failed: 0, skipped: 0, results: [] })
        }

        const results: ProvisionResult[] = []

        for (const member of members) {
          const email = member.primary_email || (member.emails && member.emails[0])
          const result = await provisionSingleMember(
            member.id,
            email || '',
            member.name || 'Unknown',
            request.log
          )
          results.push(result)

          // Small delay to avoid rate-limiting from Supabase Auth
          await new Promise((resolve) => setTimeout(resolve, 50))
        }

        const provisioned = results.filter((r) => r.status === 'created').length
        const linked = results.filter((r) => r.status === 'linked').length
        const skipped = results.filter((r) => r.status === 'skipped').length
        const failed = results.filter((r) => r.status === 'error').length

        request.log.info(
          { total: results.length, provisioned, linked, skipped, failed },
          'Bulk provisioning complete'
        )

        return reply.send({ provisioned, linked, skipped, failed, results })
      } catch (error: any) {
        request.log.error(error, 'Error in bulk-provision-auth endpoint')
        return reply.code(500).send({ error: 'Internal server error' })
      }
    }
  )

  // -----------------------------------------------------------------------
  // DELETE /soundcloud/members/:id/deprovision-auth
  // Delete auth credentials when a member is removed
  // -----------------------------------------------------------------------
  fastify.delete<{ Params: MemberIdParam }>(
    '/soundcloud/members/:id/deprovision-auth',
    async (request, reply) => {
      try {
        const { id: memberId } = request.params

        if (!memberId) {
          return reply.code(400).send({ error: 'Member ID is required' })
        }

        // Find the auth user linked to this member
        let userId: string | null = null

        // Try via linking table
        const { data: linkData } = await supabase
          .from('soundcloud_member_users')
          .select('user_id')
          .eq('member_id', memberId)
          .maybeSingle()

        if (linkData?.user_id) {
          userId = linkData.user_id
        }

        // Fallback: try direct user_id on the member
        if (!userId) {
          const { data: memberData } = await supabase
            .from('soundcloud_members')
            .select('user_id')
            .eq('id', memberId)
            .single()

          userId = memberData?.user_id || null
        }

        if (!userId) {
          // No auth user to clean up -- that's fine
          return reply.send({
            message: 'No auth credentials found for this member',
            memberId,
            deleted: false,
          })
        }

        // Delete the auth user (CASCADE will remove soundcloud_member_users row)
        const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)

        if (deleteError) {
          request.log.error({ deleteError, memberId, userId }, 'Failed to delete auth user')
          return reply.code(500).send({ error: deleteError.message })
        }

        // Clear the direct link on soundcloud_members (ON DELETE SET NULL handles this,
        // but let's be explicit)
        await supabase
          .from('soundcloud_members')
          .update({ user_id: null })
          .eq('id', memberId)

        request.log.info({ memberId, userId }, 'Deprovisioned member auth')

        return reply.send({
          message: 'Auth credentials deleted successfully',
          memberId,
          userId,
          deleted: true,
        })
      } catch (error: any) {
        request.log.error(error, 'Error in deprovision-auth endpoint')
        return reply.code(500).send({ error: 'Internal server error' })
      }
    }
  )

  // -----------------------------------------------------------------------
  // PUT /soundcloud/members/:id/reset-password
  // Reset the auth password for a member
  // -----------------------------------------------------------------------
  fastify.put<{ Params: MemberIdParam; Body: ResetPasswordBody }>(
    '/soundcloud/members/:id/reset-password',
    async (request, reply) => {
      try {
        const { id: memberId } = request.params
        const { newPassword } = request.body

        if (!memberId) {
          return reply.code(400).send({ error: 'Member ID is required' })
        }
        if (!newPassword || newPassword.length < 6) {
          return reply.code(400).send({ error: 'newPassword is required and must be at least 6 characters' })
        }

        const userId = await resolveAuthUserId(memberId)
        if (!userId) {
          return reply.code(404).send({ error: 'No auth account found for this member' })
        }

        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
          password: newPassword,
          user_metadata: { admin_set_password: newPassword },
        })

        if (updateError) {
          request.log.error({ updateError, memberId, userId }, 'Failed to reset password')
          return reply.code(500).send({ error: updateError.message })
        }

        request.log.info({ memberId, userId }, 'Password reset successful')
        return reply.send({ message: 'Password updated successfully', memberId, userId, savedPassword: newPassword })
      } catch (error: any) {
        request.log.error(error, 'Error in reset-password endpoint')
        return reply.code(500).send({ error: 'Internal server error' })
      }
    }
  )

  // -----------------------------------------------------------------------
  // PUT /soundcloud/members/:id/update-auth-email
  // Update the auth email for a member
  // -----------------------------------------------------------------------
  fastify.put<{ Params: MemberIdParam; Body: UpdateAuthEmailBody }>(
    '/soundcloud/members/:id/update-auth-email',
    async (request, reply) => {
      try {
        const { id: memberId } = request.params
        const { newEmail } = request.body

        if (!memberId) {
          return reply.code(400).send({ error: 'Member ID is required' })
        }
        if (!newEmail || !newEmail.includes('@')) {
          return reply.code(400).send({ error: 'A valid newEmail is required' })
        }

        const userId = await resolveAuthUserId(memberId)
        if (!userId) {
          return reply.code(404).send({ error: 'No auth account found for this member' })
        }

        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
          email: newEmail,
          email_confirm: true,
        })

        if (updateError) {
          request.log.error({ updateError, memberId, userId }, 'Failed to update auth email')
          return reply.code(500).send({ error: updateError.message })
        }

        request.log.info({ memberId, userId, newEmail }, 'Auth email updated')
        return reply.send({ message: 'Auth email updated successfully', memberId, userId, email: newEmail })
      } catch (error: any) {
        request.log.error(error, 'Error in update-auth-email endpoint')
        return reply.code(500).send({ error: 'Internal server error' })
      }
    }
  )
}
