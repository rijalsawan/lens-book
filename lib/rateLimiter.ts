import { NextRequest } from 'next/server'

// Simple in-memory rate limiter (in production, use Redis or similar)
const requestTracker = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const userRequests = requestTracker.get(identifier)

  // If no previous requests or window has passed, reset
  if (!userRequests || now >= userRequests.resetTime) {
    requestTracker.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    })
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs
    }
  }

  // Increment counter
  userRequests.count++
  requestTracker.set(identifier, userRequests)

  // Check if limit exceeded
  const allowed = userRequests.count <= maxRequests
  const remaining = Math.max(0, maxRequests - userRequests.count)

  return {
    allowed,
    remaining,
    resetTime: userRequests.resetTime
  }
}

export function createRateLimitMiddleware(
  maxRequests: number = 10,
  windowMs: number = 60000
) {
  return (request: NextRequest, userId: string) => {
    const identifier = `${userId}:${request.nextUrl.pathname}`
    return rateLimit(identifier, maxRequests, windowMs)
  }
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of requestTracker.entries()) {
    if (now >= value.resetTime) {
      requestTracker.delete(key)
    }
  }
}, 5 * 60 * 1000) // Clean up every 5 minutes
