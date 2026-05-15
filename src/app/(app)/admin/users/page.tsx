import { cookies } from 'next/headers'

import { AdminUsersTable } from '@/components/admin/admin-users-table'
import { ADMIN_USER_OVERRIDES_COOKIE } from '@/lib/admin/admin-user-cookies'
import {
  AdminUserQuery,
  applyAdminUserOverrides,
  getAdminUserSeed,
  parseAdminUserOverrides,
  queryAdminUsers
} from '@/lib/admin/admin-users'
import { WALLET_ADDRESS_COOKIE } from '@/lib/auth/wallet-session'

export default async function AdminUsersPage({
  searchParams
}: {
  searchParams: Promise<AdminUserQuery>
}) {
  const params = await searchParams
  const cookieStore = await cookies()
  const currentWallet = cookieStore.get(WALLET_ADDRESS_COOKIE)?.value
  const overrides = parseAdminUserOverrides(
    cookieStore.get(ADMIN_USER_OVERRIDES_COOKIE)?.value
  )
  const seededUsers = applyAdminUserOverrides(
    getAdminUserSeed(currentWallet),
    overrides
  )
  const result = queryAdminUsers(seededUsers, params, {})

  return (
    <AdminUsersTable
      users={result.users}
      query={params}
      total={result.total}
      page={result.page}
      pageCount={result.pageCount}
      sort={result.sort}
      direction={result.direction}
    />
  )
}
