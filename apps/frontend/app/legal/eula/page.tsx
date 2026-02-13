import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "End User License Agreement | Artist Influence",
  description: "End User License Agreement for the Artist Influence marketing operations platform",
}

export default function EULAPage() {
  return (
    <article className="prose prose-invert prose-headings:font-semibold max-w-none">
      <h1 className="text-2xl font-semibold mb-2">End User License Agreement</h1>
      <p className="text-muted-foreground text-sm mb-8">Last updated: February 2025</p>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold mt-8 mb-2">1. Agreement</h2>
        <p>
          This End User License Agreement (“EULA”) is a legal agreement between you (either an individual or a single entity, “User” or “you”) and Artist Influence (“we,” “us,” or “our”) for the use of the Artist Influence platform, including associated web applications, APIs, and services (collectively, the “Service”). By accessing or using the Service, you agree to be bound by this EULA. If you do not agree, do not use the Service.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold mt-8 mb-2">2. License Grant</h2>
        <p>
          Subject to your compliance with this EULA, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service for your internal business purposes. You may not sublicense, sell, rent, lease, or distribute the Service or any part of it to third parties.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold mt-8 mb-2">3. Restrictions</h2>
        <p>You agree not to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Reverse engineer, decompile, or disassemble the Service;</li>
          <li>Remove or alter any proprietary notices;</li>
          <li>Use the Service for any unlawful purpose or in violation of applicable laws;</li>
          <li>Attempt to gain unauthorized access to the Service or related systems;</li>
          <li>Use the Service to transmit malware or interfere with its operation.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold mt-8 mb-2">4. Intellectual Property</h2>
        <p>
          We retain all right, title, and interest in and to the Service, including all intellectual property rights. This EULA does not grant you any rights to our trademarks, logos, or other branding.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold mt-8 mb-2">5. Disclaimer of Warranties</h2>
        <p>
          THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DISCLAIM ALL IMPLIED WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED OR ERROR-FREE.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold mt-8 mb-2">6. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold mt-8 mb-2">7. Termination</h2>
        <p>
          We may suspend or terminate your access to the Service at any time for breach of this EULA or for any other reason. Upon termination, your license to use the Service ceases immediately. Sections that by their nature should survive (including 4, 5, 6, and 8) will survive termination.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold mt-8 mb-2">8. General</h2>
        <p>
          This EULA constitutes the entire agreement between you and us regarding the Service. We may modify this EULA from time to time; continued use of the Service after changes constitutes acceptance. This EULA is governed by the laws of the United States. Contact us with questions at the contact information provided in the Service or on our website.
        </p>
      </section>
    </article>
  )
}
