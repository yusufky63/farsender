import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'Webhook endpoint is active' })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Log the webhook payload for debugging
    console.log('Farcaster webhook received:', JSON.stringify(body, null, 2))
    
    // Handle different webhook events
    switch (body.type) {
      case 'user_launch':
        console.log('User launched the app:', body.user)
        break
      case 'user_close':
        console.log('User closed the app:', body.user)
        break
      case 'frame_action':
        console.log('Frame action received:', body.action)
        break
      default:
        console.log('Unknown webhook event:', body.type)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Invalid webhook payload' },
      { status: 400 }
    )
  }
}
