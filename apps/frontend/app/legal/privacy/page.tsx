import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy | Artist Influence",
  description: "Privacy Policy for the Artist Influence marketing operations platform",
}

export default function PrivacyPage() {
  return (
    <article className="prose prose-invert prose-headings:font-semibold max-w-none">
      <h1 className="text-2xl font-semibold mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground text-sm mb-8">Last updated: February 2025</p>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold mt-8 mb-2">1. Introduction</h2>
        <p>
          Artist Influence (“we,” “us,” or “our”) operates the Artist Influence platform and related services (the “Service”). This Privacy Policy explains how we collect, use, disclose, and safeguard information when you use our Service. By using the Service, you consent to the practices described in this policy.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold mt-8 mb-2">2. Information We Collect</h2>
        <p>We may collect:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Account and profile information</strong> — name, email address, and other details you provide when registering or managing your account;</li>
          <li><strong>Usage data</strong> — how you use the Service, including features accessed and actions taken;</li>
          <li><strong>Technical data</strong> — IP address, browser type, device information, and similar technical identifiers;</li>
          <li><strong>Business data</strong> — campaign data, client information, and other content you upload or create in the Service in connection with marketing operations.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold mt-8 mb-2">3. How We Use Information</h2>
        <p>We use the information we collect to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Provide, operate, and improve the Service;</li>
          <li>Authenticate users and manage accounts;</li>
          <li>Process and sync data with integrated third-party services (e.g., QuickBooks, Spotify, YouTube) as configured by you;</li>
          <li>Send service-related communications and support;</li>
          <li>Comply with legal obligations and protect our rights;</li>
          <li>Analyze usage to improve performance and security.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold mt-8 mb-2">4. Sharing and Disclosure</h2>
        <p>
          We may share information with service providers who assist in operating the Service (e.g., hosting, analytics, payment processors), subject to confidentiality obligations. We may disclose information when required by law or to protect our rights, safety, or property. We do not sell your personal information to third parties for their marketing purposes.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold mt-8 mb-2">5. Data Security</h2>
        <p>
          We implement technical and organizational measures to protect your information against unauthorized access, alteration, disclosure, or destruction. No method of transmission or storage is completely secure; you use the Service at your own risk.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold mt-8 mb-2">6. Data Retention</h2>
        <p>
          We retain your information for as long as your account is active or as needed to provide the Service and fulfill the purposes described in this policy. We may retain certain information as required by law or for legitimate business purposes.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold mt-8 mb-2">7. Your Rights</h2>
        <p>
          Depending on your location, you may have rights to access, correct, delete, or port your personal information, or to object to or restrict certain processing. You can update account details in the Service; for other requests, contact us using the contact information provided in the Service or on our website.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold mt-8 mb-2">8. Third-Party Services</h2>
        <p>
          The Service may integrate with third-party services (e.g., Intuit QuickBooks, Spotify, YouTube, social platforms). Those services have their own privacy policies; we encourage you to review them. We are not responsible for the practices of third-party services.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold mt-8 mb-2">9. Changes</h2>
        <p>
          We may update this Privacy Policy from time to time. We will post the updated policy on this page and update the “Last updated” date. Continued use of the Service after changes constitutes acceptance of the revised policy.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold mt-8 mb-2">10. Contact</h2>
        <p>
          For questions about this Privacy Policy or our data practices, contact us at the contact information provided in the Service or on our website.
        </p>
      </section>
    </article>
  )
}
