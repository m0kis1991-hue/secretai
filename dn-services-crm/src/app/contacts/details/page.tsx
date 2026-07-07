
"use client"

import { useSearchParams } from "next/navigation"
import { ContactDetailsClient } from "@/components/contacts/contact-details-client"
import { Suspense } from "react"

function DetailsContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const scope = searchParams.get('scope') ?? undefined

  if (!id) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Δεν βρέθηκε ID επαφής.</p>
      </div>
    )
  }

  return <ContactDetailsClient id={id} scope={scope} />
}

export default function ContactDetailsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Φόρτωση...</div>}>
      <DetailsContent />
    </Suspense>
  )
}
