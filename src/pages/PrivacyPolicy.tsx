import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { SEO } from '@/components/SEO';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Privacy Policy — CheckGrow" description="How CheckGrow collects, uses, stores, and protects your personal data, with your GDPR rights." path="/privacy" image="/og/legal.jpg" />
      <nav className="sticky top-0 z-50 px-4 sm:px-6 py-3 sm:py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <Logo size="sm" />
          <div className="w-16" />
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: March 16, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              CheckGrow ("we", "us", or "our") operates the CheckGrow platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We collect information that you provide directly to us, including:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
              <li>Name, email address, and profile information</li>
              <li>Professional skills, experience, and availability</li>
              <li>Organization and team membership data</li>
              <li>Communications and messages within the platform</li>
              <li>Project and task-related information</li>
              <li>CRM contacts and deal information you input</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We use the information we collect to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
              <li>Provide, maintain, and improve the CheckGrow platform</li>
              <li>Facilitate AI-powered team formation and skill matching</li>
              <li>Process your transactions and manage your account</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Respond to your comments, questions, and customer service requests</li>
              <li>Monitor and analyze trends, usage, and activities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">4. Information Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell your personal information. We may share your information with other members of your organization (cluster) as necessary for the platform's collaborative features. Your profile information, skills, and availability may be visible to organization administrators and other members within your team.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">5. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              We integrate with third-party services such as Google Calendar, LinkedIn, and other tools. When you connect these services, we access only the data necessary to provide the requested functionality. Each integration is governed by the respective third-party's own privacy policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">6. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal data, including encryption of sensitive information such as API keys and authentication tokens. However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">7. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal data for as long as your account is active or as needed to provide you services. You may request deletion of your account and associated data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">8. Your Rights (GDPR)</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Under the General Data Protection Regulation (GDPR), you have the right to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
              <li>Access, update, or delete your personal information</li>
              <li>Object to or restrict the processing of your data</li>
              <li>Data portability — receive your data in a structured format</li>
              <li>Withdraw consent at any time</li>
              <li>Lodge a complaint with a supervisory authority</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">9. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies required for authentication and platform functionality. We do not use tracking or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:info@checkgrow.com" className="text-primary hover:text-primary/80 transition-colors">info@checkgrow.com</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
