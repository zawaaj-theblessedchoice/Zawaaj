import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  missingMandatoryFields,
  MANDATORY_SELECT,
  type MandatoryProfileFields,
} from '@/lib/zawaaj/profileCompleteness'
import CompleteProfileClient from './CompleteProfileClient'

// CD-010 completion gate landing. Shows ONLY the missing mandatory fields for
// the user's active profile; releases to /browse once complete. Server-rendered
// so the gate can't be bypassed by client navigation.
export const dynamic = 'force-dynamic'

export default async function CompleteProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: settings } = await supabase
    .from('zawaaj_user_settings')
    .select('active_profile_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const activeProfileId = settings?.active_profile_id
  if (!activeProfileId) redirect('/pending')

  const { data: profile } = await supabase
    .from('zawaaj_profiles')
    .select(`id, gender, ${MANDATORY_SELECT}`)
    .eq('id', activeProfileId)
    .single()

  if (!profile) redirect('/pending')

  const missing = missingMandatoryFields(profile as MandatoryProfileFields)

  // Already complete → nothing to do, send them to browse.
  if (missing.length === 0) redirect('/browse')

  return (
    <CompleteProfileClient
      profileId={activeProfileId as string}
      gender={(profile.gender as string | null) ?? null}
      missing={missing}
    />
  )
}
