import { redirect } from 'next/navigation'

// /sign-in → permanent redirect to /login
export default function SignInPage() {
  redirect('/login')
}
