import { hash } from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { prisma } from '@/lib/prisma'

import { UnauthorizedError } from '../_errors/unauthorized-error'

export async function resetPassword(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/password/reset',
    {
      schema: {
        tags: ['auth'],
        summary: 'Reset user password',
        body: z.object({
          code: z.string(),
          newPassword: z.string().min(6),
        }),
        response: {
          201: z.null(),
        },
      },
    },
    async (request, reply) => {
      const { code, newPassword } = request.body

      const tokenFromCode = await prisma.token.findUnique({
        where: {
          id: code,
        },
      })

      if (!tokenFromCode) {
        throw new UnauthorizedError()
      }

      const newPasswordHash = await hash(newPassword, 6)

      await prisma.$transaction([
        prisma.token.delete({
          where: {
            id: code,
          },
        }),
        prisma.user.update({
          where: {
            id: tokenFromCode.userId,
          },
          data: {
            passwordHash: newPasswordHash,
          },
        }),
      ])

      return reply.status(204).send()
    },
  )
}
