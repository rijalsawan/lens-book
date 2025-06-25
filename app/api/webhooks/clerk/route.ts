import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import prisma from '@/lib/prisma'

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  // Get the headers
  const headerPayload = headers()
  const svix_id = (await headerPayload).get('svix-id')
  const svix_timestamp = (await headerPayload).get('svix-timestamp')
  const svix_signature = (await headerPayload).get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(webhookSecret)

  let evt: any

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    })
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400,
    })
  }

  // Handle the webhook
  const eventType = evt.type

  if (eventType === 'user.created') {
    const { id, email_addresses, username, first_name, last_name, image_url } = evt.data

    try {
      // Create user in your database
      const user = await prisma.user.create({
        data: {
          id: id, // Use Clerk's user ID as your primary key
          email: email_addresses[0]?.email_address || '',
          username: username || `user_${id.slice(-8)}`, // Fallback username
          name: first_name && last_name ? `${first_name} ${last_name}` : first_name || last_name || null,
          avatar: image_url || null,
          // Note: We don't store password since Clerk handles authentication
          password: '', // This field is required by your schema but won't be used
        },
      })

      console.log('User created in database:', user)
    } catch (error) {
      console.error('Error creating user in database:', error)
      return new Response('Error creating user', { status: 500 })
    }
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, username, first_name, last_name, image_url } = evt.data

    try {
      // Update user in your database
      const user = await prisma.user.update({
        where: { id },
        data: {
          email: email_addresses[0]?.email_address || '',
          username: username || `user_${id.slice(-8)}`,
          name: first_name && last_name ? `${first_name} ${last_name}` : first_name || last_name || null,
          avatar: image_url || null,
        },
      })

      console.log('User updated in database:', user)
    } catch (error) {
      console.error('Error updating user in database:', error)
      return new Response('Error updating user', { status: 500 })
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data

    try {
      // Delete user from your database
      await prisma.user.delete({
        where: { id },
      })

      console.log('User deleted from database:', id)
    } catch (error) {
      console.error('Error deleting user from database:', error)
      return new Response('Error deleting user', { status: 500 })
    }
  }

  return new Response('Webhook received', { status: 200 })
}