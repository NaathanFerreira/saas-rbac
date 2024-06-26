import type { FastifyInstance } from 'fastify'
import fastifyPlugin from 'fastify-plugin'

import { prisma } from '@/lib/prisma'

import { BadRequestError } from '../routes/_errors/bad-request-error'
import { UnauthorizedError } from '../routes/_errors/unauthorized-error'

export const auth = fastifyPlugin(async (app: FastifyInstance) => {
  app.addHook('preHandler', async (request) => {
    request.getCurrentUserId = async () => {
      try {
        // jwt verify gets the token from header Authorization
        const { sub } = await request.jwtVerify<{ sub: string }>()

        return sub
      } catch {
        throw new UnauthorizedError('Invalid auth token')
      }
    }

    request.getUserMembership = async (organizationSlug: string) => {
      const userId = await request.getCurrentUserId()

      const organizationExists = await prisma.organization.findUnique({
        where: {
          slug: organizationSlug,
        },
      })

      if (!organizationExists) {
        throw new BadRequestError('Organization does not exists.')
      }

      const member = await prisma.member.findFirst({
        where: {
          userId,
          organization: {
            slug: organizationSlug,
          },
        },
        include: {
          organization: true,
        },
      })

      if (!member) {
        throw new UnauthorizedError(
          'You are not a member of this organization.',
        )
      }

      const { organization, ...membership } = member

      return {
        organization,
        membership,
      }
    }
  })
})
