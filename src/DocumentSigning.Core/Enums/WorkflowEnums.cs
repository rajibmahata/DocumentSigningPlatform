namespace DocumentSigning.Core.Enums;

public enum WorkflowStatus
{
    Draft     = 0,
    Published = 1,
    Archived  = 2,
}

public enum WorkflowInstanceStatus
{
    Running   = 0,
    Paused    = 1,
    Completed = 2,
    Failed    = 3,
    Cancelled = 4,
}

public enum NodeExecutionStatus
{
    Pending   = 0,
    Running   = 1,
    Completed = 2,
    Failed    = 3,
    Skipped   = 4,
}

public enum WorkflowTriggerType
{
    Manual               = 0,
    OnEnvelopeCreated    = 1,
    OnEnvelopeCompleted  = 2,
    OnEnvelopeSigned     = 3,
    OnPaymentReceived    = 4,
    Scheduled            = 5,
    Webhook              = 6,
}
