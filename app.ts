import { RouterContext } from 'https://deno.land/x/oak@v6.2.0/mod.ts'
import {
  bold,
  cyan,
  green,
  red,
  yellow,
} from './dependencies.ts'
import {
  Application,
  Context,
  HttpError,
  Router,
  Status
} from './dependencies.ts'
import { applyGraphQL, gql, GQLError } from './dependencies.ts'
import { Bson, MongoClient } from './dependencies.ts'
import { oakCors } from './dependencies.ts'
import { serve } from './dependencies.ts'
import { parse } from './dependencies.ts'

import typeDefs from './graphql/typeDefs.ts'
import resolvers from './graphql/resolvers.ts'
import appConfig from './appConfig.ts'

const app = new Application()

// Error handler middleware
app.use(async (context, next) => {
  try {
    await next()
  } catch (e) {
    if (e instanceof HttpError) {
      // deno-lint-ignore no-explicit-any
      context.response.status = e.status as any
      if (e.expose) {
        context.response.body = `<!DOCTYPE html>
            <html>
              <body>
                <h1>${e.status} - ${e.message}</h1>
              </body>
            </html>`
      } else {
        context.response.body = `<!DOCTYPE html>
            <html>
              <body>
                <h1>${e.status} - ${Status[e.status]}</h1>
              </body>
            </html>`
      }
    } else if (e instanceof Error) {
      context.response.status = 500
      context.response.body = `<!DOCTYPE html>
            <html>
              <body>
                <h1>500 - Internal Server Error</h1>
              </body>
            </html>`
      console.log('Unhandled Error:', red(bold(e.message)))
      console.log(e.stack)
    }
  }
})

// Logger
app.use(async (context, next) => {
  await next()
  const rt = context.response.headers.get('X-Response-Time')
  console.log(
    `${green(context.request.method)} ${cyan(context.request.url.pathname)} - ${
      bold(
        String(rt),
      )
    }`,
  )
})

// Response Time
app.use(async (context, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  context.response.headers.set('X-Response-Time', `${ms}ms`)
});

// ========== Oak-GraphQL ==========

const GraphQLService = await applyGraphQL<Router>({
  Router,
  typeDefs: typeDefs,
  resolvers: resolvers,
  context: (context: RouterContext) => {
    // console.log('--------RouterContext context', context)
    // TODO: context doesn't have JWT token, not sure why
    return context
  }
})

app.use(GraphQLService.routes(), GraphQLService.allowedMethods())

// ========== cd to static folder and npm run build, then send static content ==========
// app.use(async (context) => {
//   await context.send({
//     root: `${Deno.cwd()}/record-static/build`,
//     index: 'index.html',
//   })
// })

app.use(oakCors({
  // credentials: true, // to get the cookie
  origin: appConfig.FRONT_END_PORTS, // ports for the frontend
}))

const DEFAULT_PORT = appConfig.SERVER_PORT
const argsPort = parse(Deno.args).port
const finalPort = argsPort ? Number(argsPort) : DEFAULT_PORT

if (isNaN(finalPort)) {
  console.log('--------isNaN finalPort', finalPort)
  Deno.exit(1)
}

console.log('--------finalPort', finalPort)

// const displayBody = new TextEncoder().encode('Hello World\n')
// const servePort = await serve({ finalPort })

// for await (const req of servePort) {
//   req.respond({ displayBody })
// }

app.addEventListener('listen', ({ hostname, port }) => {
  console.log(
    bold('Start listening on ') + yellow(`${hostname}:${port}`),
  )
})

await app.listen({ port: finalPort })
// await app.listen({ hostname: 'localhost', port: appConfig.SERVER_PORT })

