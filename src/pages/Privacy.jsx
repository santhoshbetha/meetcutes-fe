import React from 'react'
import { Container } from '@/components/Container'

export function Privacy() {
  return (
    <Container className='bg-card dark:bg-background my-3 py-4'>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-lg">
            How we protect your personal information at MeetCutes
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Last updated: January 20, 2026
          </p>
        </div>
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Our Commitment to Your Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              At MeetCutes, we believe that meaningful connections happen when people feel safe and respected. 
              This privacy policy explains how we collect, use, and protect your information as you discover 
              events and connect with others who share your interests.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Account Information</h3>
                <p className="text-muted-foreground">
                  When you create a MeetCutes account, we collect your name, email address, and profile information 
                  to help you connect with others and personalize your event recommendations.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Event Preferences</h3>
                <p className="text-muted-foreground">
                  We gather information about your interests, location preferences, and event attendance history 
                  to suggest events and people you'd enjoy meeting.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Usage Data</h3>
                <p className="text-muted-foreground">
                  We collect data about how you use our platform, including events you view, connections you make, 
                  and features you interact with, to improve your experience.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">How We Use Your Information</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>Matching you with events and people based on your interests and preferences</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>Personalizing your experience with tailored event recommendations</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>Facilitating connections between users who attend the same events</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>Sending you updates about events you're interested in</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>Improving our platform and developing new features</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Information Sharing</h2>
            <p className="text-muted-foreground mb-4">
              Your privacy is important to us. We only share your information in the following circumstances:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>With Your Consent:</strong> When you choose to connect with other users or share your profile</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Service Providers:</strong> With trusted partners who help us operate the platform (they're bound by strict confidentiality)</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Legal Requirements:</strong> When required by law or to protect our users' safety</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Your Privacy Controls</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Profile Visibility</h3>
                <p className="text-muted-foreground">
                  You control who can see your profile and event preferences. You can adjust your visibility 
                  settings anytime in your account preferences.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Data Access & Deletion</h3>
                <p className="text-muted-foreground">
                  You can request to view, update, or delete your personal information at any time. 
                  Contact us at hello@meetcutes.us to make these requests.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Communication Preferences</h3>
                <p className="text-muted-foreground">
                  Manage your email preferences and unsubscribe from notifications you no longer want to receive.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Data Security</h2>
            <p className="text-muted-foreground">
              We use industry-standard security measures to protect your information, including encryption, 
              secure servers, and regular security audits. While we strive to keep your data safe, no online 
              platform can guarantee 100% security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Age Restrictions</h2>
            <p className="text-muted-foreground">
              MeetCutes is designed for adults 18 and older. We do not knowingly collect or process 
              information from individuals under 18.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Policy Updates</h2>
            <p className="text-muted-foreground">
              We may update this privacy policy occasionally to reflect changes in our practices or 
              legal requirements. We'll notify you of significant changes and update the "Last updated" 
              date at the top of this page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Contact Us</h2>
            <p className="text-muted-foreground">
              Questions about this privacy policy? Want to exercise your privacy rights? 
              Reach out to us at <a href="mailto:hello@meetcutes.us" className="text-primary hover:underline">hello@meetcutes.us</a>
            </p>
          </section>
        </div>
      </div>
    </Container>
  )
}
