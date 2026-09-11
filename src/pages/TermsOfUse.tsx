import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { SEO } from '@/components/SEO';

export default function TermsOfUse() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Terms of Use — CheckGrow" description="The terms governing use of the CheckGrow platform, accounts, organizations, and integrations." path="/terms" image="/og/legal.jpg" />
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Use</h1>
        <p className="text-muted-foreground mb-8">Last updated: March 16, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using the CheckGrow platform ("Service"), you agree to be bound by these Terms of Use. If you do not agree to these terms, you may not access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              CheckGrow is an AI-powered team formation and project management platform that connects professionals and organizations. The Service includes skill matching, project management tools, CRM capabilities, and collaborative features.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">When creating an account, you agree to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly notify us of any unauthorized use of your account</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">4. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">You agree not to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
              <li>Use the Service for any unlawful purpose</li>
              <li>Upload false, misleading, or fraudulent information</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Interfere with or disrupt the Service or its infrastructure</li>
              <li>Scrape, harvest, or collect data from other users without consent</li>
              <li>Use the Service to send spam or unsolicited communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">5. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service and its original content, features, and functionality are owned by CheckGrow and are protected by intellectual property laws. You retain ownership of the content you submit to the platform, but grant us a license to use it as necessary to provide the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">6. Organization Membership</h2>
            <p className="text-muted-foreground leading-relaxed">
              When you join an organization (cluster) on CheckGrow, your profile information, skills, and activity within that organization may be visible to other members and administrators. Organization owners and administrators have additional rights to manage members, projects, and settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">7. Third-Party Integrations</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service may integrate with third-party services (e.g., Google Calendar, LinkedIn). Your use of these integrations is subject to the respective third-party terms. We are not responsible for the availability or accuracy of third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, CheckGrow shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service. The Service is provided "as is" without warranties of any kind.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">9. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may terminate or suspend your account at any time for violation of these Terms. You may delete your account at any time. Upon termination, your right to use the Service will cease immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">10. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the Republic of Croatia, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">11. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of material changes via email or through the platform. Continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">12. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms, contact us at{' '}
              <a href="mailto:info@checkgrow.com" className="text-primary hover:text-primary/80 transition-colors">info@checkgrow.com</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
