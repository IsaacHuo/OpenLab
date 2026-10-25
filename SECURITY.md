# Security policy

## Supported versions

Maintainers address security problems in the current `main` branch and latest published research prerelease. The v0.1.0-alpha.1 source preview targets a local Windows-first service; it is not a hosted or multi-user service. No application runtime shipped in v0.0.1.

| Version line | Security scope |
| --- | --- |
| Current main / latest v0.1.0 alpha | Current source-preview fixes, with limitations below |
| v0.0.1 foundation | Historical repository tooling and documentation; no application runtime |

## Report privately

Use [GitHub private vulnerability reporting](https://github.com/IsaacHuo/OpenLab/security/advisories/new). Do not open a public issue for an undisclosed vulnerability. Include the affected revision, reproduction steps, impact, and a minimal sanitized example. Never include active tokens or private research datasets.

The initial security maintainer is [@IsaacHuo](https://github.com/IsaacHuo). This is a single-maintainer project with no guaranteed response SLA. Agree on remediation and coordinated disclosure through the private report before publishing exploit details.

## Security boundaries

The published v0.0.1 foundation release contains no application runtime or runtime protections. Current development source implements a loopback service with host/origin checks, session and CSRF validation, confirmed plans, scoped decisions, supervised cancellation and server-side credentials with Windows protection. See [development](docs/development.md) for implementation boundaries and [verification](docs/verification.md) for dated controlled tests and live evidence. A supervised worker is not an untrusted-code sandbox, and plugins are statically registered trusted code.

Repository CI runs documentation, type, application, browser, workflow and secret checks. These checks do not certify the safety of third-party research code. Application merge gates apply to the precise PR revision; historical local success is not a substitute for passing required-checks. The longer-term permission and isolation design remains in [architecture](docs/architecture.md).

If a credential is exposed, revoke or rotate it immediately through its provider. Removing it from Git does not invalidate it. Diagnostic reporting follows the [logging specification](docs/logging.md).
