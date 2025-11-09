import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Contextual Ad Network MVP
        </h1>
        <div className="flex flex-col gap-4 items-center">
          <Link
            href="/onboard"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Advertiser Onboarding
          </Link>
          <Link
            href="/publisher"
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Publisher Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}



