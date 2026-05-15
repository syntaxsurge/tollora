import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const payload = await request.text()

  return NextResponse.json({
    received: true,
    length: payload.length
  })
}
