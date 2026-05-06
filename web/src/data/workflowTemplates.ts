/**
 * 5 built-in workflow template definitions.
 * These are rendered in the "Template Library" tab and can be cloned into a merchant's workspace.
 */

export interface BuiltInTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  jsonDefinition: string;
}

// ── 1. NDA Signing ─────────────────────────────────────────────────────────────

const ndaSigning: BuiltInTemplate = {
  id: 'tpl-nda-signing',
  name: 'NDA Signing',
  description: 'Send an NDA to a counterparty, collect their signature, then archive or send a reminder based on the signing outcome.',
  category: 'Legal',
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
      { name: 'vendorEmail',         type: 'string', defaultValue: '' },
      { name: 'documentId',          type: 'string', defaultValue: '' },
      { name: 'blockchainWebhookUrl', type: 'string', defaultValue: '' },
    ],
    settings: { timeoutHours: 336, retryOnFailure: false },
  }),
};

// ── 4. HR Approval ─────────────────────────────────────────────────────────────

const hrApproval: BuiltInTemplate = {
  id: 'tpl-hr-approval',
  name: 'HR Approval',
  description: 'Route an HR request for manager approval, conditionally sign or reject, and notify the requester.',
  category: 'HR',
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
      { name: 'managerEmail',   type: 'string', defaultValue: '' },
      { name: 'directorEmail',  type: 'string', defaultValue: '' },
      { name: 'orderId',        type: 'string', defaultValue: '' },
      { name: 'erpWebhookUrl',  type: 'string', defaultValue: '' },
    ],
    settings: { timeoutHours: 120, retryOnFailure: true },
  }),
};

// ── Export all templates ───────────────────────────────────────────────────────

export const builtInTemplates: BuiltInTemplate[] = [
  ndaSigning,
  employeeOnboarding,
  vendorAgreement,
  hrApproval,
  procurementApproval,
];

export const templateCategories = ['Legal', 'HR', 'Procurement'];
