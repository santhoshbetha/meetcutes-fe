import React from 'react'
import { Container } from '@/components/Container'

export function Terms() {
  return (
    <Container className='bg-card dark:bg-background my-3 py-4'>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Terms of Service
          </h1>
          <p className="text-muted-foreground text-lg">
            Guidelines for using MeetCutes and connecting with others
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Last updated: January 20, 2026
          </p>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Welcome to MeetCutes</h2>
            <p className="text-muted-foreground leading-relaxed">
              MeetCutes is a platform designed to help you discover events and connect with people who share your interests. 
              These terms of service outline how you can use our platform responsibly and respectfully. By using MeetCutes, 
              you agree to these terms and our commitment to creating positive, meaningful connections.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Using MeetCutes</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Account Responsibility</h3>
                <p className="text-muted-foreground">
                  You must provide accurate information when creating your account and keep your profile information current. 
                  You're responsible for all activity that occurs under your account.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Age Requirements</h3>
                <p className="text-muted-foreground">
                  MeetCutes is for adults 18 years and older. We do not allow accounts for individuals under 18.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Service Availability</h3>
                <p className="text-muted-foreground">
                  While we strive to keep MeetCutes running smoothly, we don't guarantee uninterrupted access. 
                  Use the platform at your own discretion.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Content and Intellectual Property</h2>
            <p className="text-muted-foreground">
              All content on MeetCutes, including text, graphics, logos, and software, is owned by us or our licensors. 
              You may not copy, modify, or distribute our content without permission. Your profile content remains yours, 
              but you grant us permission to display it on the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Community Guidelines</h2>
            <p className="text-muted-foreground mb-4">
              To keep MeetCutes a positive space for everyone, we ask that you:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>Be respectful and kind to other users</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>Do not post inappropriate, offensive, or explicit content</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>Avoid harassment, threats, or abusive behavior</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>Do not share false information or impersonate others</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>Respect intellectual property rights</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>Use the platform only for its intended purpose of connecting through events</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Prohibited Activities</h2>
            <p className="text-muted-foreground mb-4">
              The following activities are not allowed on MeetCutes:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>Posting advertisements or commercial content (except in designated areas)</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>Using automated tools, bots, or scrapers</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>Engaging in fraudulent or illegal activities</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>Creating multiple accounts for deceptive purposes</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>Sharing content that promotes violence, discrimination, or harm</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Account Termination</h2>
            <p className="text-muted-foreground">
              We reserve the right to suspend or terminate accounts that violate these terms. We'll make reasonable 
              efforts to notify you before taking action, but in cases of serious violations, we may act immediately 
              to protect our community.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Disclaimers and Limitations</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                MeetCutes is provided "as is" without warranties of any kind. We don't guarantee matches, 
                successful connections, or specific outcomes from using our platform.
              </p>
              <p>
                You use MeetCutes at your own risk. We encourage safe practices when meeting people in person, 
                including meeting in public places and informing others of your plans.
              </p>
              <p>
                Our liability is limited to the maximum extent permitted by law. We are not responsible for 
                interactions between users or any damages arising from your use of the platform.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Membership and Premium Access</h2>
            <p className="text-muted-foreground leading-relaxed">
              A membership fee of $50 (valid for 1 full year) will be applied automatically once the active match volume around your coordinates exceeds 200 profiles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may update these terms occasionally. We'll notify you of significant changes and update 
              the "Last updated" date. Your continued use of MeetCutes after changes means you accept the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Contact Us</h2>
            <p className="text-muted-foreground">
              Questions about these terms? Concerns about platform usage? 
              Reach out to us at <a href="mailto:hello@meetcutes.us" className="text-primary hover:underline">hello@meetcutes.us</a>
            </p>
            <p className="text-muted-foreground mt-2">
              We take reports of violations seriously and will investigate all concerns promptly.
            </p>
          </section>
        </div>
      </div>
    </Container>
  )
}
