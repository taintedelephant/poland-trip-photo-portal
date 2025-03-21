import { Upload } from "@/components/upload"
import { Gallery } from "@/components/gallery"
import { Header } from "@/components/header"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Header />
      <div className="container px-4 py-8 mx-auto">
        <Upload />
        <Gallery />
      </div>
    </main>
  )
} 