import { redirect } from 'next/navigation'

// The directory has moved to /browse.
// This redirect handles any bookmarks or old links.
export default function DirectoryPage() {
  redirect('/browse')
}
