import { ProfilePreview } from '@/components/settings/profile-preview'
import { Badge } from '@/components/ui/badge'

export default function ProfilePage() {
  return (
    <div className='space-y-8'>
      <section className='bg-panel-sheen border-foreground/10 rounded-lg border p-6'>
        <Badge>Profile</Badge>
        <div className='mt-4 max-w-3xl space-y-3'>
          <h1 className='font-display text-4xl'>Builder profile</h1>
          <p className='text-foreground/70 text-sm leading-6'>
            Review the identity that collaborators see, then update the source
            values from settings when the project needs richer account data.
          </p>
        </div>
      </section>

      <ProfilePreview />
    </div>
  )
}
