// src/features/legal/pages/TermsPage.tsx
import React from "react";
import { LegalPageLayout } from "../components/LegalPageLayout";

export function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated="December 23, 2024">
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-foreground">
          1. Acceptance of Terms
        </h2>
        <p className="mb-4 text-muted-foreground">
          By accessing or using The Standard HQ platform ("Service"), you agree
          to be bound by these Terms of Service. If you do not agree to these
          terms, please do not use the Service.
        </p>
        <p className="text-muted-foreground">
          The Service is intended for use by licensed insurance professionals
          and their agencies. By using the Service, you represent that you have
          the authority to enter into this agreement.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-foreground">
          2. Description of Service
        </h2>
        <p className="mb-4 text-muted-foreground">
          The Standard HQ is a business management platform designed for
          insurance professionals. The Service provides tools for:
        </p>
        <ul className="mb-4 list-disc pl-6 text-muted-foreground">
          <li>Tracking insurance policies and commissions</li>
          <li>Managing business expenses</li>
          <li>Monitoring sales performance and KPIs</li>
          <li>Team management and recruiting pipeline tracking</li>
          <li>Internal communication and messaging</li>
          <li>Document storage and management</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-foreground">
          3. User Accounts & Registration
        </h2>
        <p className="mb-4 text-muted-foreground">
          Access to the Service requires an approved user account. Account
          registration is by invitation only. You are responsible for:
        </p>
        <ul className="mb-4 list-disc pl-6 text-muted-foreground">
          <li>Maintaining the confidentiality of your account credentials</li>
          <li>All activities that occur under your account</li>
          <li>
            Notifying us immediately of any unauthorized use of your account
          </li>
        </ul>
        <p className="text-muted-foreground">
          We reserve the right to suspend or terminate accounts that violate
          these terms or remain inactive for extended periods.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-foreground">
          4. User Responsibilities
        </h2>
        <p className="mb-4 text-muted-foreground">You agree to:</p>
        <ul className="mb-4 list-disc pl-6 text-muted-foreground">
          <li>
            Provide accurate and complete information when using the Service
          </li>
          <li>
            Use the Service in compliance with all applicable laws and
            regulations
          </li>
          <li>Not share your account credentials with unauthorized parties</li>
          <li>
            Not attempt to access, tamper with, or use non-public areas of the
            Service
          </li>
          <li>Not upload malicious code or content</li>
          <li>Respect the intellectual property rights of others</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-foreground">
          5. Data Accuracy
        </h2>
        <p className="mb-4 text-muted-foreground">
          You are responsible for the accuracy of all data you enter into the
          Service, including but not limited to policy information, commission
          records, client details, and expense reports.
        </p>
        <p className="text-muted-foreground">
          The Service provides tools for tracking and analysis, but you remain
          responsible for verifying all calculations and data for compliance
          with your carrier agreements and regulatory requirements.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-foreground">
          6. Intellectual Property
        </h2>
        <p className="mb-4 text-muted-foreground">
          The Service, including its design, features, and content, is owned by
          The Standard HQ and is protected by copyright, trademark, and other
          intellectual property laws.
        </p>
        <p className="text-muted-foreground">
          You retain ownership of any data you input into the Service. By using
          the Service, you grant us a limited license to process, store, and
          display your data as necessary to provide the Service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-foreground">
          7. Limitation of Liability
        </h2>
        <p className="mb-4 text-muted-foreground">
          THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. TO THE
          MAXIMUM EXTENT PERMITTED BY LAW, THE STANDARD HQ SHALL NOT BE LIABLE
          FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
          DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
        </p>
        <p className="text-muted-foreground">
          We do not guarantee uninterrupted access to the Service and are not
          liable for any losses resulting from service interruptions or data
          loss. You are responsible for maintaining your own backups of critical
          business data.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-foreground">
          8. Termination
        </h2>
        <p className="mb-4 text-muted-foreground">
          Either party may terminate this agreement at any time. Upon
          termination:
        </p>
        <ul className="mb-4 list-disc pl-6 text-muted-foreground">
          <li>Your access to the Service will be revoked</li>
          <li>
            You may request an export of your data within 30 days of termination
          </li>
          <li>
            We may retain certain data as required by law or for legitimate
            business purposes
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-foreground">
          9. Governing Law
        </h2>
        <p className="text-muted-foreground">
          These Terms shall be governed by and construed in accordance with the
          laws of the United States. Any disputes arising from these terms or
          your use of the Service shall be resolved through binding arbitration.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-foreground">
          10. Contact Information
        </h2>
        <p className="text-muted-foreground">
          For questions about these Terms of Service, please contact us at{" "}
          <a
            href="mailto:support@thestandardhq.com"
            className="text-foreground underline underline-offset-4 hover:text-foreground/80"
          >
            support@thestandardhq.com
          </a>
          .
        </p>
      </section>
    </LegalPageLayout>
  );
}
