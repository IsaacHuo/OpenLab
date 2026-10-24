# Security policy

## Supported versions

During the foundation stage, maintainers address security problems in the current `main` branch and latest published foundation release. No application runtime has shipped in v0.0.1. A version support matrix will be added before the first application release.

## Report privately

Use [GitHub private vulnerability reporting](https://github.com/IsaacHuo/OpenLab/security/advisories/new). Do not open a public issue for an undisclosed vulnerability. Include the affected revision, reproduction steps, impact, and a minimal sanitized example. Never include active tokens or private research datasets.

The initial security maintainer is [@IsaacHuo](https://github.com/IsaacHuo). This is a single-maintainer project with no guaranteed response SLA. Agree on remediation and coordinated disclosure through the private report before publishing exploit details.

## Security boundaries

Repository CI runs documentation checks, workflow validation, and a secret scan. These checks do not certify the safety of third-party research code. The planned runtime permission model and local-service protections are specified in [architecture](docs/architecture.md); they are not implemented protections in this release.

If a credential is exposed, revoke or rotate it immediately through its provider. Removing it from Git does not invalidate it. Diagnostic reporting follows the [logging specification](docs/logging.md).
