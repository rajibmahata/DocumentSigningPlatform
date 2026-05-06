/**
 * Built-in workflow template definitions.
 * These are rendered in the "Template Library" tab and can be cloned into a merchant's workspace.
 */

export interface BuiltInTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;          // emoji icon for the card
  complexity: 'Simple' | 'Medium' | 'Complex';
  steps: string[];       // short labels shown as a mini flow preview
  useCases: string[];    // bullet points explaining when to use it
  jsonDefinition: string;
}

// ── 1. NDA Signing ─────────────────────────────────────────────────────────────

const ndaSigning: BuiltInTemplate = {
  id: 'tpl-nda-signing',
  name: 'NDA Signing',
  description: 'Send an NDA to a counterparty, collect their signature, then archive or send a reminder based on the signing outcome.',
  category: 'Legal',
  icon: '⚖️',
  complexity: 'Medium',
  steps: ['Send NDA Email', 'Request Signature', 'Signed?', 'AI Archive / Reminder'],
  useCases: ['Protecting IP before partnership discussions', 'Vendor onboarding confidentiality', 'Investor meetings'],
  jsonDefinition: JSON.stringify({
    nodes: [
      { id: 's1', type: 'start',            position: { x: 50,  y: 150 }, data: { label: 'Start',            config: {} } },
      { id: 'e1', type: 'sendEmail',        position: { x: 250, y: 150 }, data: { label: 'Send NDA Email',   config: { to: '{{signer.email}}', subject: 'Please sign the NDA', body: 'Hi, please review and sign the attached NDA.' } } },
      { id: 'r1', type: 'signatureRequest', position: { x: 470, y: 150 }, data: { label: 'Request Signature', config: { expiresInDays: 7 } } },
      { id: 'c1', type: 'condition',        position: { x: 690, y: 150 }, data: { label: 'Signed?',           config: { expression: 'envelopeStatus == "Completed"', trueLabel: 'Yes', falseLabel: 'No' } } },
      { id: 'a1', type: 'aiAction',         position: { x: 910, y: 60  }, data: { label: 'AI Archive',        config: { action: 'archive' } } },
      { id: 'e2', type: 'sendEmail',        position: { x: 910, y: 260 }, data: { label: 'Send Reminder',     config: { to: '{{signer.email}}', subject: 'Reminder: NDA awaiting signature', body: 'Friendly reminder to sign the NDA.' } } },
      { id: 'n1', type: 'end',              position: { x: 1130, y: 150 }, data: { label: 'End',              config: {} } },
    ],
    edges: [
      { id: 'e1-s1-e1', source: 's1', target: 'e1' },
      { id: 'e2-e1-r1', source: 'e1', target: 'r1' },
      { id: 'e3-r1-c1', source: 'r1', target: 'c1' },
      { id: 'e4-c1-a1', source: 'c1', target: 'a1', sourceHandle: 'true' },
      { id: 'e5-c1-e2', source: 'c1', target: 'e2', sourceHandle: 'false' },
      { id: 'e6-a1-n1', source: 'a1', target: 'n1' },
      { id: 'e7-e2-n1', source: 'e2', target: 'n1' },
    ],
    variables: [
      { name: 'signerEmail', type: 'string', defaultValue: '' },
      { name: 'signerName',  type: 'string', defaultValue: '' },
    ],
    settings: { timeoutHours: 168, retryOnFailure: false },
  }),
};

// ── 2. Employee Onboarding ────────────────────────────────────────────────────

const employeeOnboarding: BuiltInTemplate = {
  id: 'tpl-employee-onboarding',
  name: 'Employee Onboarding',
  description: 'Welcome a new hire, send onboarding documents, collect a signed offer letter, and route for HR approval.',
  category: 'HR',
  icon: '🧑‍💼',
  complexity: 'Medium',
  steps: ['Welcome Email', 'Offer Letter', 'Sign Offer', 'HR Approval'],
  useCases: ['New hire offer letter collection', 'Contractor agreements', 'Remote team onboarding'],
  jsonDefinition: JSON.stringify({
    nodes: [
      { id: 's1', type: 'start',            position: { x: 50,  y: 150 }, data: { label: 'Start',             config: {} } },
      { id: 'e1', type: 'sendEmail',        position: { x: 250, y: 150 }, data: { label: 'Welcome Email',      config: { to: '{{employee.email}}', subject: 'Welcome to the team!', body: 'Please complete the attached onboarding forms.' } } },
      { id: 'd1', type: 'documentTemplate', position: { x: 470, y: 150 }, data: { label: 'Offer Letter',       config: { templateId: '', variables: [] } } },
      { id: 'r1', type: 'signatureRequest', position: { x: 690, y: 150 }, data: { label: 'Sign Offer Letter',  config: { expiresInDays: 3 } } },
      { id: 'ap', type: 'approval',         position: { x: 910, y: 150 }, data: { label: 'HR Approval',        config: { approverRole: 'hr_manager', timeoutHours: 48 } } },
      { id: 'n1', type: 'end',              position: { x: 1130, y: 150 }, data: { label: 'End',               config: {} } },
    ],
    edges: [
      { id: 'e1', source: 's1', target: 'e1' },
      { id: 'e2', source: 'e1', target: 'd1' },
      { id: 'e3', source: 'd1', target: 'r1' },
      { id: 'e4', source: 'r1', target: 'ap' },
      { id: 'e5', source: 'ap', target: 'n1' },
    ],
    variables: [
      { name: 'employeeEmail', type: 'string', defaultValue: '' },
      { name: 'employeeName',  type: 'string', defaultValue: '' },
      { name: 'startDate',     type: 'string', defaultValue: '' },
    ],
    settings: { timeoutHours: 72, retryOnFailure: true },
  }),
};

// ── 3. Vendor Agreement ────────────────────────────────────────────────────────

const vendorAgreement: BuiltInTemplate = {
  id: 'tpl-vendor-agreement',
  name: 'Vendor Agreement',
  description: 'AI-analyse a vendor contract, email it to the vendor for signature, then record it on-chain.',
  category: 'Procurement',
  icon: '🤝',
  complexity: 'Medium',
  steps: ['AI Contract Review', 'Send to Vendor', 'Vendor Signature', 'Blockchain Notarise'],
  useCases: ['Supplier onboarding', 'Service provider agreements', 'SLA contracts'],
  jsonDefinition: JSON.stringify({
    nodes: [
      { id: 's1', type: 'start',            position: { x: 50,  y: 150 }, data: { label: 'Start',              config: {} } },
      { id: 'ai', type: 'aiAction',         position: { x: 250, y: 150 }, data: { label: 'AI Contract Review', config: { action: 'analyse', documentId: '{{documentId}}' } } },
      { id: 'e1', type: 'sendEmail',        position: { x: 470, y: 150 }, data: { label: 'Send to Vendor',      config: { to: '{{vendor.email}}', subject: 'Vendor Agreement for review', body: 'Please sign the attached vendor agreement.' } } },
      { id: 'r1', type: 'signatureRequest', position: { x: 690, y: 150 }, data: { label: 'Vendor Signature',    config: { expiresInDays: 14 } } },
      { id: 'wh', type: 'webhook',          position: { x: 910, y: 150 }, data: { label: 'Blockchain Notarise', config: { url: '{{blockchainWebhookUrl}}', method: 'POST' } } },
      { id: 'n1', type: 'end',              position: { x: 1130, y: 150 }, data: { label: 'End',                config: {} } },
    ],
    edges: [
      { id: 'e1', source: 's1', target: 'ai' },
      { id: 'e2', source: 'ai', target: 'e1' },
      { id: 'e3', source: 'e1', target: 'r1' },
      { id: 'e4', source: 'r1', target: 'wh' },
      { id: 'e5', source: 'wh', target: 'n1' },
    ],
    variables: [
      { name: 'vendorEmail',          type: 'string', defaultValue: '' },
      { name: 'documentId',           type: 'string', defaultValue: '' },
      { name: 'blockchainWebhookUrl', type: 'string', defaultValue: '' },
    ],
    settings: { timeoutHours: 336, retryOnFailure: false },
  }),
};

// ── 4. HR Approval ─────────────────────────────────────────────────────────────

const hrApproval: BuiltInTemplate = {
  id: 'tpl-hr-approval',
  name: 'HR Policy Approval',
  description: 'Route an HR request for manager approval, conditionally sign or reject, and notify the requester.',
  category: 'HR',
  icon: '✅',
  complexity: 'Medium',
  steps: ['Notify Manager', 'Manager Approval', 'Approved?', 'Sign / Reject'],
  useCases: ['Policy change approval', 'Leave requests', 'Role change requests'],
  jsonDefinition: JSON.stringify({
    nodes: [
      { id: 's1', type: 'start',            position: { x: 50,  y: 150 }, data: { label: 'Start',           config: {} } },
      { id: 'e1', type: 'sendEmail',        position: { x: 250, y: 150 }, data: { label: 'Notify Manager',   config: { to: '{{manager.email}}', subject: 'Approval required', body: 'Please review and approve the HR request.' } } },
      { id: 'ap', type: 'approval',         position: { x: 470, y: 150 }, data: { label: 'Manager Approval', config: { approverRole: 'manager', timeoutHours: 24 } } },
      { id: 'c1', type: 'condition',        position: { x: 690, y: 150 }, data: { label: 'Approved?',        config: { expression: 'approved == true', trueLabel: 'Yes', falseLabel: 'No' } } },
      { id: 'r1', type: 'signatureRequest', position: { x: 910, y: 60  }, data: { label: 'Sign Document',    config: { expiresInDays: 5 } } },
      { id: 'e2', type: 'sendEmail',        position: { x: 910, y: 260 }, data: { label: 'Notify Rejected',  config: { to: '{{requester.email}}', subject: 'Request rejected', body: 'Your HR request has been rejected.' } } },
      { id: 'n1', type: 'end',              position: { x: 1130, y: 150 }, data: { label: 'End',             config: {} } },
    ],
    edges: [
      { id: 'e1', source: 's1', target: 'e1' },
      { id: 'e2', source: 'e1', target: 'ap' },
      { id: 'e3', source: 'ap', target: 'c1' },
      { id: 'e4', source: 'c1', target: 'r1', sourceHandle: 'true' },
      { id: 'e5', source: 'c1', target: 'e2', sourceHandle: 'false' },
      { id: 'e6', source: 'r1', target: 'n1' },
      { id: 'e7', source: 'e2', target: 'n1' },
    ],
    variables: [
      { name: 'managerEmail',   type: 'string', defaultValue: '' },
      { name: 'requesterEmail', type: 'string', defaultValue: '' },
    ],
    settings: { timeoutHours: 48, retryOnFailure: false },
  }),
};

// ── 5. Procurement Approval ────────────────────────────────────────────────────

const procurementApproval: BuiltInTemplate = {
  id: 'tpl-procurement-approval',
  name: 'Procurement Approval',
  description: 'Multi-level procurement sign-off: Manager → Director → Signature → Webhook notification.',
  category: 'Procurement',
  icon: '🛒',
  complexity: 'Complex',
  steps: ['Notify', 'Manager Approval', 'Director Approval', 'Final Signature', 'ERP Webhook'],
  useCases: ['Purchase order authorisation', 'Capital expenditure sign-off', 'Contract renewals'],
  jsonDefinition: JSON.stringify({
    nodes: [
      { id: 's1', type: 'start',            position: { x: 50,  y: 200 }, data: { label: 'Start',               config: {} } },
      { id: 'e1', type: 'sendEmail',        position: { x: 250, y: 200 }, data: { label: 'Notify Stakeholders',  config: { to: '{{manager.email}}', subject: 'Procurement approval needed', body: 'Please approve the procurement request.' } } },
      { id: 'a1', type: 'approval',         position: { x: 470, y: 200 }, data: { label: 'Manager Approval',     config: { approverRole: 'manager',  timeoutHours: 24 } } },
      { id: 'a2', type: 'approval',         position: { x: 690, y: 200 }, data: { label: 'Director Approval',    config: { approverRole: 'director', timeoutHours: 48 } } },
      { id: 'r1', type: 'signatureRequest', position: { x: 910, y: 200 }, data: { label: 'Final Signature',      config: { expiresInDays: 7 } } },
      { id: 'wh', type: 'webhook',          position: { x: 1130, y: 200 }, data: { label: 'ERP Webhook',         config: { url: '{{erpWebhookUrl}}', method: 'POST', bodyTemplate: '{"orderId":"{{orderId}}","status":"approved"}' } } },
      { id: 'n1', type: 'end',              position: { x: 1350, y: 200 }, data: { label: 'End',                 config: {} } },
    ],
    edges: [
      { id: 'e1', source: 's1', target: 'e1' },
      { id: 'e2', source: 'e1', target: 'a1' },
      { id: 'e3', source: 'a1', target: 'a2' },
      { id: 'e4', source: 'a2', target: 'r1' },
      { id: 'e5', source: 'r1', target: 'wh' },
      { id: 'e6', source: 'wh', target: 'n1' },
    ],
    variables: [
      { name: 'managerEmail',  type: 'string', defaultValue: '' },
      { name: 'directorEmail', type: 'string', defaultValue: '' },
      { name: 'orderId',       type: 'string', defaultValue: '' },
      { name: 'erpWebhookUrl', type: 'string', defaultValue: '' },
    ],
    settings: { timeoutHours: 120, retryOnFailure: true },
  }),
};

// ── 6. Real Estate — Lease Agreement ─────────────────────────────────────────

const realEstateLease: BuiltInTemplate = {
  id: 'tpl-real-estate-lease',
  name: 'Lease Agreement',
  description: 'Send a residential or commercial lease to the tenant for signature, notify the landlord, and record the executed agreement.',
  category: 'Real Estate',
  icon: '🏠',
  complexity: 'Simple',
  steps: ['Send Lease', 'Tenant Signature', 'Landlord Counter-Sign', 'Record on Chain'],
  useCases: ['Residential rental agreements', 'Commercial property leases', 'Short-term holiday lets'],
  jsonDefinition: JSON.stringify({
    nodes: [
      { id: 's1', type: 'start',            position: { x: 50,  y: 150 }, data: { label: 'Start',                config: {} } },
      { id: 'e1', type: 'sendEmail',        position: { x: 250, y: 150 }, data: { label: 'Send Lease to Tenant', config: { to: '{{tenant.email}}', subject: 'Your lease agreement is ready to sign', body: 'Please review and sign the attached lease agreement.' } } },
      { id: 'r1', type: 'signatureRequest', position: { x: 470, y: 150 }, data: { label: 'Tenant Signature',      config: { expiresInDays: 5 } } },
      { id: 'r2', type: 'signatureRequest', position: { x: 690, y: 150 }, data: { label: 'Landlord Counter-Sign', config: { expiresInDays: 3 } } },
      { id: 'wh', type: 'webhook',          position: { x: 910, y: 150 }, data: { label: 'Record Agreement',      config: { url: '{{recordWebhookUrl}}', method: 'POST', bodyTemplate: '{"tenantId":"{{tenantId}}","status":"executed"}' } } },
      { id: 'n1', type: 'end',              position: { x: 1130, y: 150 }, data: { label: 'End',                  config: {} } },
    ],
    edges: [
      { id: 'e1', source: 's1', target: 'e1' },
      { id: 'e2', source: 'e1', target: 'r1' },
      { id: 'e3', source: 'r1', target: 'r2' },
      { id: 'e4', source: 'r2', target: 'wh' },
      { id: 'e5', source: 'wh', target: 'n1' },
    ],
    variables: [
      { name: 'tenantEmail',      type: 'string', defaultValue: '' },
      { name: 'landlordEmail',    type: 'string', defaultValue: '' },
      { name: 'tenantId',         type: 'string', defaultValue: '' },
      { name: 'recordWebhookUrl', type: 'string', defaultValue: '' },
    ],
    settings: { timeoutHours: 120, retryOnFailure: false },
  }),
};

// ── 7. Healthcare — Patient Consent ──────────────────────────────────────────

const patientConsent: BuiltInTemplate = {
  id: 'tpl-patient-consent',
  name: 'Patient Consent Form',
  description: 'Send a medical consent or treatment authorisation form, collect the patient\'s e-signature, and notify the care team.',
  category: 'Healthcare',
  icon: '🏥',
  complexity: 'Simple',
  steps: ['Send Consent Form', 'Patient Signs', 'AI Verify', 'Notify Care Team'],
  useCases: ['Surgical consent', 'Clinical trial enrolment', 'Telehealth authorisations'],
  jsonDefinition: JSON.stringify({
    nodes: [
      { id: 's1', type: 'start',            position: { x: 50,  y: 150 }, data: { label: 'Start',               config: {} } },
      { id: 'e1', type: 'sendEmail',        position: { x: 250, y: 150 }, data: { label: 'Send Consent Form',    config: { to: '{{patient.email}}', subject: 'Action required: Consent form', body: 'Please review and sign the consent form before your appointment.' } } },
      { id: 'r1', type: 'signatureRequest', position: { x: 470, y: 150 }, data: { label: 'Patient Signature',    config: { expiresInDays: 2 } } },
      { id: 'ai', type: 'aiAction',         position: { x: 690, y: 150 }, data: { label: 'AI Verify Consent',    config: { action: 'verify_signature', documentId: '{{documentId}}' } } },
      { id: 'e2', type: 'sendEmail',        position: { x: 910, y: 150 }, data: { label: 'Notify Care Team',     config: { to: '{{doctor.email}}', subject: 'Consent received', body: 'Patient has signed the consent form. Please proceed.' } } },
      { id: 'n1', type: 'end',              position: { x: 1130, y: 150 }, data: { label: 'End',                 config: {} } },
    ],
    edges: [
      { id: 'e1', source: 's1', target: 'e1' },
      { id: 'e2', source: 'e1', target: 'r1' },
      { id: 'e3', source: 'r1', target: 'ai' },
      { id: 'e4', source: 'ai', target: 'e2' },
      { id: 'e5', source: 'e2', target: 'n1' },
    ],
    variables: [
      { name: 'patientEmail', type: 'string', defaultValue: '' },
      { name: 'doctorEmail',  type: 'string', defaultValue: '' },
      { name: 'documentId',   type: 'string', defaultValue: '' },
    ],
    settings: { timeoutHours: 48, retryOnFailure: true },
  }),
};

// ── 8. Finance — Loan Agreement ───────────────────────────────────────────────

const loanAgreement: BuiltInTemplate = {
  id: 'tpl-loan-agreement',
  name: 'Loan Agreement',
  description: 'Route a loan document through AI risk review, multi-level bank officer sign-off, and borrower signature.',
  category: 'Finance',
  icon: '🏦',
  complexity: 'Complex',
  steps: ['AI Risk Analysis', 'Officer Approval', 'Director Sign-off', 'Borrower Signs', 'Core Banking Webhook'],
  useCases: ['Personal loan origination', 'Mortgage documentation', 'SME credit facilities'],
  jsonDefinition: JSON.stringify({
    nodes: [
      { id: 's1', type: 'start',            position: { x: 50,  y: 200 }, data: { label: 'Start',               config: {} } },
      { id: 'ai', type: 'aiAction',         position: { x: 250, y: 200 }, data: { label: 'AI Risk Analysis',    config: { action: 'risk_score', documentId: '{{documentId}}' } } },
      { id: 'a1', type: 'approval',         position: { x: 470, y: 200 }, data: { label: 'Loan Officer',        config: { approverRole: 'loan_officer', timeoutHours: 24 } } },
      { id: 'a2', type: 'approval',         position: { x: 690, y: 200 }, data: { label: 'Credit Director',     config: { approverRole: 'credit_director', timeoutHours: 48 } } },
      { id: 'e1', type: 'sendEmail',        position: { x: 910, y: 200 }, data: { label: 'Send to Borrower',    config: { to: '{{borrower.email}}', subject: 'Your loan agreement is ready', body: 'Please review and sign your loan agreement.' } } },
      { id: 'r1', type: 'signatureRequest', position: { x: 1130, y: 200 }, data: { label: 'Borrower Signature', config: { expiresInDays: 10 } } },
      { id: 'wh', type: 'webhook',          position: { x: 1350, y: 200 }, data: { label: 'Core Banking',       config: { url: '{{coreBankingUrl}}', method: 'POST', bodyTemplate: '{"loanId":"{{loanId}}","status":"executed"}' } } },
      { id: 'n1', type: 'end',              position: { x: 1570, y: 200 }, data: { label: 'End',                config: {} } },
    ],
    edges: [
      { id: 'e1', source: 's1', target: 'ai' },
      { id: 'e2', source: 'ai', target: 'a1' },
      { id: 'e3', source: 'a1', target: 'a2' },
      { id: 'e4', source: 'a2', target: 'e1' },
      { id: 'e5', source: 'e1', target: 'r1' },
      { id: 'e6', source: 'r1', target: 'wh' },
      { id: 'e7', source: 'wh', target: 'n1' },
    ],
    variables: [
      { name: 'borrowerEmail',  type: 'string', defaultValue: '' },
      { name: 'documentId',     type: 'string', defaultValue: '' },
      { name: 'loanId',         type: 'string', defaultValue: '' },
      { name: 'coreBankingUrl', type: 'string', defaultValue: '' },
    ],
    settings: { timeoutHours: 240, retryOnFailure: true },
  }),
};

// ── 9. Insurance — Policy Sign-off ────────────────────────────────────────────

const insurancePolicy: BuiltInTemplate = {
  id: 'tpl-insurance-policy',
  name: 'Insurance Policy Sign-off',
  description: 'Send an insurance policy to the customer, collect their signature, and trigger policy activation via webhook.',
  category: 'Insurance',
  icon: '🛡️',
  complexity: 'Simple',
  steps: ['Send Policy', 'Customer Signs', 'Activate Policy Webhook'],
  useCases: ['Life insurance onboarding', 'Vehicle insurance renewal', 'Health plan enrolment'],
  jsonDefinition: JSON.stringify({
    nodes: [
      { id: 's1', type: 'start',            position: { x: 50,  y: 150 }, data: { label: 'Start',              config: {} } },
      { id: 'e1', type: 'sendEmail',        position: { x: 250, y: 150 }, data: { label: 'Send Policy Docs',   config: { to: '{{customer.email}}', subject: 'Your insurance policy is ready', body: 'Please review and sign your policy document.' } } },
      { id: 'r1', type: 'signatureRequest', position: { x: 470, y: 150 }, data: { label: 'Customer Signature', config: { expiresInDays: 7 } } },
      { id: 'c1', type: 'condition',        position: { x: 690, y: 150 }, data: { label: 'Signed?',            config: { expression: 'envelopeStatus == "Completed"', trueLabel: 'Yes', falseLabel: 'No' } } },
      { id: 'wh', type: 'webhook',          position: { x: 910, y: 60  }, data: { label: 'Activate Policy',    config: { url: '{{policySystemUrl}}', method: 'POST', bodyTemplate: '{"policyId":"{{policyId}}","status":"active"}' } } },
      { id: 'e2', type: 'sendEmail',        position: { x: 910, y: 260 }, data: { label: 'Overdue Reminder',   config: { to: '{{customer.email}}', subject: 'Policy sign-off overdue', body: 'Your policy expires if unsigned. Please sign immediately.' } } },
      { id: 'n1', type: 'end',              position: { x: 1130, y: 150 }, data: { label: 'End',               config: {} } },
    ],
    edges: [
      { id: 'e1', source: 's1', target: 'e1' },
      { id: 'e2', source: 'e1', target: 'r1' },
      { id: 'e3', source: 'r1', target: 'c1' },
      { id: 'e4', source: 'c1', target: 'wh', sourceHandle: 'true' },
      { id: 'e5', source: 'c1', target: 'e2', sourceHandle: 'false' },
      { id: 'e6', source: 'wh', target: 'n1' },
      { id: 'e7', source: 'e2', target: 'n1' },
    ],
    variables: [
      { name: 'customerEmail',  type: 'string', defaultValue: '' },
      { name: 'policyId',       type: 'string', defaultValue: '' },
      { name: 'policySystemUrl', type: 'string', defaultValue: '' },
    ],
    settings: { timeoutHours: 168, retryOnFailure: false },
  }),
};

// ── 10. Education — Student Enrollment ────────────────────────────────────────

const studentEnrollment: BuiltInTemplate = {
  id: 'tpl-student-enrollment',
  name: 'Student Enrollment Agreement',
  description: 'Send enrollment documents to a student and guardian, collect signatures, and notify the registrar.',
  category: 'Education',
  icon: '🎓',
  complexity: 'Medium',
  steps: ['Send Enrollment Docs', 'Student Signs', 'Guardian Co-Signs', 'Notify Registrar'],
  useCases: ['University admission acceptance', 'Vocational course enrollment', 'International student agreements'],
  jsonDefinition: JSON.stringify({
    nodes: [
      { id: 's1', type: 'start',            position: { x: 50,  y: 150 }, data: { label: 'Start',               config: {} } },
      { id: 'e1', type: 'sendEmail',        position: { x: 250, y: 150 }, data: { label: 'Send Enrollment Docs', config: { to: '{{student.email}}', subject: 'Enrollment documents ready', body: 'Please review and sign your enrollment agreement.' } } },
      { id: 'r1', type: 'signatureRequest', position: { x: 470, y: 150 }, data: { label: 'Student Signature',    config: { expiresInDays: 7 } } },
      { id: 'r2', type: 'signatureRequest', position: { x: 690, y: 150 }, data: { label: 'Guardian Co-Sign',     config: { expiresInDays: 7 } } },
      { id: 'e2', type: 'sendEmail',        position: { x: 910, y: 150 }, data: { label: 'Notify Registrar',     config: { to: '{{registrar.email}}', subject: 'Enrollment complete', body: 'Student enrollment signed. Please process admission.' } } },
      { id: 'n1', type: 'end',              position: { x: 1130, y: 150 }, data: { label: 'End',                 config: {} } },
    ],
    edges: [
      { id: 'e1', source: 's1', target: 'e1' },
      { id: 'e2', source: 'e1', target: 'r1' },
      { id: 'e3', source: 'r1', target: 'r2' },
      { id: 'e4', source: 'r2', target: 'e2' },
      { id: 'e5', source: 'e2', target: 'n1' },
    ],
    variables: [
      { name: 'studentEmail',   type: 'string', defaultValue: '' },
      { name: 'guardianEmail',  type: 'string', defaultValue: '' },
      { name: 'registrarEmail', type: 'string', defaultValue: '' },
    ],
    settings: { timeoutHours: 168, retryOnFailure: true },
  }),
};

// ── 11. Technology — SaaS Subscription ───────────────────────────────────────

const saasSubscription: BuiltInTemplate = {
  id: 'tpl-saas-subscription',
  name: 'SaaS Subscription Agreement',
  description: 'Send a SaaS terms-of-service and DPA, collect customer signature, and provision access via webhook.',
  category: 'Technology',
  icon: '💻',
  complexity: 'Simple',
  steps: ['Send ToS & DPA', 'Customer Signs', 'Provision Access'],
  useCases: ['SaaS onboarding', 'Data processing agreements (GDPR)', 'Enterprise licence agreements'],
  jsonDefinition: JSON.stringify({
    nodes: [
      { id: 's1', type: 'start',            position: { x: 50,  y: 150 }, data: { label: 'Start',               config: {} } },
      { id: 'e1', type: 'sendEmail',        position: { x: 250, y: 150 }, data: { label: 'Send ToS & DPA',       config: { to: '{{customer.email}}', subject: 'Please sign your subscription agreement', body: 'Welcome! Please sign the Terms of Service and Data Processing Agreement.' } } },
      { id: 'r1', type: 'signatureRequest', position: { x: 470, y: 150 }, data: { label: 'Customer Signature',   config: { expiresInDays: 14 } } },
      { id: 'wh', type: 'webhook',          position: { x: 690, y: 150 }, data: { label: 'Provision Account',    config: { url: '{{provisioningUrl}}', method: 'POST', bodyTemplate: '{"customerId":"{{customerId}}","plan":"{{plan}}","status":"active"}' } } },
      { id: 'e2', type: 'sendEmail',        position: { x: 910, y: 150 }, data: { label: 'Welcome Email',        config: { to: '{{customer.email}}', subject: 'Your account is ready!', body: 'Your subscription is activated. Log in to get started.' } } },
      { id: 'n1', type: 'end',              position: { x: 1130, y: 150 }, data: { label: 'End',                 config: {} } },
    ],
    edges: [
      { id: 'e1', source: 's1', target: 'e1' },
      { id: 'e2', source: 'e1', target: 'r1' },
      { id: 'e3', source: 'r1', target: 'wh' },
      { id: 'e4', source: 'wh', target: 'e2' },
      { id: 'e5', source: 'e2', target: 'n1' },
    ],
    variables: [
      { name: 'customerEmail',  type: 'string', defaultValue: '' },
      { name: 'customerId',     type: 'string', defaultValue: '' },
      { name: 'plan',           type: 'string', defaultValue: 'starter' },
      { name: 'provisioningUrl', type: 'string', defaultValue: '' },
    ],
    settings: { timeoutHours: 336, retryOnFailure: false },
  }),
};

// ── 12. Construction — Project Contract ───────────────────────────────────────

const constructionContract: BuiltInTemplate = {
  id: 'tpl-construction-contract',
  name: 'Construction Project Contract',
  description: 'AI review of project scope, multi-stakeholder sign-off (contractor + client + engineer), then site system notification.',
  category: 'Construction',
  icon: '🏗️',
  complexity: 'Complex',
  steps: ['AI Scope Review', 'Contractor Signs', 'Client Signs', 'Engineer Approval', 'Site System Notify'],
  useCases: ['Building contracts', 'Sub-contractor agreements', 'Civil engineering project sign-offs'],
  jsonDefinition: JSON.stringify({
    nodes: [
      { id: 's1', type: 'start',            position: { x: 50,  y: 200 }, data: { label: 'Start',               config: {} } },
      { id: 'ai', type: 'aiAction',         position: { x: 250, y: 200 }, data: { label: 'AI Scope Review',     config: { action: 'analyse', documentId: '{{documentId}}' } } },
      { id: 'r1', type: 'signatureRequest', position: { x: 470, y: 200 }, data: { label: 'Contractor Signs',    config: { expiresInDays: 7 } } },
      { id: 'r2', type: 'signatureRequest', position: { x: 690, y: 200 }, data: { label: 'Client Signs',        config: { expiresInDays: 7 } } },
      { id: 'ap', type: 'approval',         position: { x: 910, y: 200 }, data: { label: 'Engineer Approval',   config: { approverRole: 'engineer', timeoutHours: 72 } } },
      { id: 'wh', type: 'webhook',          position: { x: 1130, y: 200 }, data: { label: 'Site System',        config: { url: '{{siteSystemUrl}}', method: 'POST', bodyTemplate: '{"projectId":"{{projectId}}","status":"contracted"}' } } },
      { id: 'n1', type: 'end',              position: { x: 1350, y: 200 }, data: { label: 'End',                config: {} } },
    ],
    edges: [
      { id: 'e1', source: 's1', target: 'ai' },
      { id: 'e2', source: 'ai', target: 'r1' },
      { id: 'e3', source: 'r1', target: 'r2' },
      { id: 'e4', source: 'r2', target: 'ap' },
      { id: 'e5', source: 'ap', target: 'wh' },
      { id: 'e6', source: 'wh', target: 'n1' },
    ],
    variables: [
      { name: 'contractorEmail', type: 'string', defaultValue: '' },
      { name: 'clientEmail',     type: 'string', defaultValue: '' },
      { name: 'documentId',      type: 'string', defaultValue: '' },
      { name: 'projectId',       type: 'string', defaultValue: '' },
      { name: 'siteSystemUrl',   type: 'string', defaultValue: '' },
    ],
    settings: { timeoutHours: 336, retryOnFailure: true },
  }),
};

// ── 13. Government — Permit Application ──────────────────────────────────────

const governmentPermit: BuiltInTemplate = {
  id: 'tpl-government-permit',
  name: 'Permit Application',
  description: 'Citizen submits a permit request; AI validates the form, officer reviews and approves, then the citizen signs the permit.',
  category: 'Government',
  icon: '🏛️',
  complexity: 'Complex',
  steps: ['AI Form Validation', 'Officer Review', 'Approved?', 'Permit Issued / Rejected', 'Citizen Signs'],
  useCases: ['Building permits', 'Business licence applications', 'Environmental clearances'],
  jsonDefinition: JSON.stringify({
    nodes: [
      { id: 's1', type: 'start',            position: { x: 50,  y: 200 }, data: { label: 'Start',               config: {} } },
      { id: 'ai', type: 'aiAction',         position: { x: 250, y: 200 }, data: { label: 'AI Form Validation',  config: { action: 'validate_form', documentId: '{{documentId}}' } } },
      { id: 'ap', type: 'approval',         position: { x: 470, y: 200 }, data: { label: 'Officer Review',      config: { approverRole: 'permits_officer', timeoutHours: 72 } } },
      { id: 'c1', type: 'condition',        position: { x: 690, y: 200 }, data: { label: 'Approved?',           config: { expression: 'approved == true', trueLabel: 'Yes', falseLabel: 'No' } } },
      { id: 'r1', type: 'signatureRequest', position: { x: 910, y: 80  }, data: { label: 'Citizen Signs Permit', config: { expiresInDays: 30 } } },
      { id: 'e1', type: 'sendEmail',        position: { x: 910, y: 300 }, data: { label: 'Rejection Notice',    config: { to: '{{citizen.email}}', subject: 'Permit application rejected', body: 'Your permit application has been rejected. Please contact the office.' } } },
      { id: 'wh', type: 'webhook',          position: { x: 1130, y: 80  }, data: { label: 'Gov Registry',      config: { url: '{{registryUrl}}', method: 'POST', bodyTemplate: '{"permitId":"{{permitId}}","status":"issued"}' } } },
      { id: 'n1', type: 'end',              position: { x: 1350, y: 200 }, data: { label: 'End',                config: {} } },
    ],
    edges: [
      { id: 'e1', source: 's1', target: 'ai' },
      { id: 'e2', source: 'ai', target: 'ap' },
      { id: 'e3', source: 'ap', target: 'c1' },
      { id: 'e4', source: 'c1', target: 'r1', sourceHandle: 'true' },
      { id: 'e5', source: 'c1', target: 'e1', sourceHandle: 'false' },
      { id: 'e6', source: 'r1', target: 'wh' },
      { id: 'e7', source: 'wh', target: 'n1' },
      { id: 'e8', source: 'e1', target: 'n1' },
    ],
    variables: [
      { name: 'citizenEmail', type: 'string', defaultValue: '' },
      { name: 'documentId',   type: 'string', defaultValue: '' },
      { name: 'permitId',     type: 'string', defaultValue: '' },
      { name: 'registryUrl',  type: 'string', defaultValue: '' },
    ],
    settings: { timeoutHours: 720, retryOnFailure: false },
  }),
};

// ── Export all templates ───────────────────────────────────────────────────────

export const builtInTemplates: BuiltInTemplate[] = [
  ndaSigning,
  employeeOnboarding,
  vendorAgreement,
  hrApproval,
  procurementApproval,
  realEstateLease,
  patientConsent,
  loanAgreement,
  insurancePolicy,
  studentEnrollment,
  saasSubscription,
  constructionContract,
  governmentPermit,
];

export const templateCategories = [
  'All',
  'Legal',
  'HR',
  'Procurement',
  'Real Estate',
  'Healthcare',
  'Finance',
  'Insurance',
  'Education',
  'Technology',
  'Construction',
  'Government',
] as const;

export type TemplateCategory = (typeof templateCategories)[number];

export const complexityColors = {
  Simple:  'bg-green-50 text-green-700 border border-green-200',
  Medium:  'bg-amber-50 text-amber-700 border border-amber-200',
  Complex: 'bg-red-50   text-red-700   border border-red-200',
} satisfies Record<string, string>;

