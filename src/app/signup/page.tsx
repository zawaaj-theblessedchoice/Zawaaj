import { redirect } from 'next/navigation'

// /signup has been superseded by /register (family-model v2).
// Keep this file so existing links and emails don't 404.
export default function SignupPage() {
  redirect('/register')
}
