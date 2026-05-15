import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Auth provider not configured.' },
    { status: 501 }
  )
}
