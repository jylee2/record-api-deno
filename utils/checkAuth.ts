import { applyGraphQL, gql, GQLError } from '../dependencies.ts'
import { create, verify } from '../dependencies.ts'

import appConfig from '../appConfig.ts'

export const checkAuthHeader = async (context:any) => {
  try {
    // console.log('--------context', context)
    const authHeader = context.request.headers.authorization

    if (authHeader) {
      const token = authHeader.split('Bearer ')[1]

      if (token) {
        const payload = await verify(token, appConfig.JWT_SECRET_KEY, "HS512")

        if (!payload) {
          throw new GQLError('Invalid JWT token supplied, please try again.')
        }

        return payload
      }

      throw new GQLError('Authentication token must have "Bearer " at the front.')
    }

    throw new GQLError('Please provide an authorization header.')
  } catch (error) {
    console.log('--------checkAuthHeader error', error)
    throw new Error(error)
  }
}

export const checkAuthToken = async (token:any) => {
  try {
    if (token) {
      const payload = await verify(token, appConfig.JWT_SECRET_KEY, "HS512")

      if (!payload) {
        throw new GQLError('Invalid JWT token supplied, please try again.')
      }

      return payload
    }

    throw new GQLError('Please provide a valid JWT token.')
  } catch (error) {
    console.log('--------checkAuth error', error)
    throw new Error(error)
  }
}
