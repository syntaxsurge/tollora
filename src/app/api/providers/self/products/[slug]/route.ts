import { NextResponse } from 'next/server'

import { deleteProviderProduct } from '@/features/marketplace/products'

type ProductRouteProps = {
  params: Promise<{
    slug: string
  }>
}

export async function DELETE(_request: Request, { params }: ProductRouteProps) {
  const { slug } = await params
  const product = deleteProviderProduct(slug)

  if (!product) {
    return NextResponse.json(
      { error: 'Provider-created API product was not found.' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    deleted: true,
    slug: product.slug,
    name: product.name
  })
}
