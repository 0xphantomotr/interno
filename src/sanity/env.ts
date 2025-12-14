export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-06-15'

export const dataset = assertValue(
  process.env.NEXT_PUBLIC_SANITY_DATASET,
  'Missing environment variable: NEXT_PUBLIC_SANITY_DATASET'
)

export const projectId = assertValue(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  'Missing environment variable: NEXT_PUBLIC_SANITY_PROJECT_ID'
)

export const brevoApiKey = assertValue(
  process.env.BREVO_API_KEY,
  'Missing environment variable: BREVO_API_KEY'
)

export const upstashRedisRestUrl = assertValue(
  process.env.UPSTASH_REDIS_REST_URL,
  'Missing environment variable: UPSTASH_REDIS_REST_URL'
)

export const upstashRedisRestToken = assertValue(
  process.env.UPSTASH_REDIS_REST_TOKEN,
  'Missing environment variable: UPSTASH_REDIS_REST_TOKEN'
)

function assertValue<T>(v: T | undefined, errorMessage: string): T {
  if (v === undefined) {
    throw new Error(errorMessage)
  }

  return v
}
