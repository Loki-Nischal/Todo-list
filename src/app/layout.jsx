import '../App.css'

// Next.js layouts support the metadata export alongside their component.
// oxlint-disable-next-line react/only-export-components
export const metadata = {
  title: 'Daylight — A little focus, a lot of progress',
  description: 'A calmer place for your tasks. Plan your day, organize your projects, and make room for what matters.',
}

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>
}
