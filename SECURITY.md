# Security Policy

## Supported Versions

Only the latest release running on the `main` branch is supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The CineTrekker team takes security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**Please DO NOT open a public GitHub issue for security vulnerabilities.**

Instead, please report security issues through one of the following channels:

1. **GitHub Private Vulnerability Reporting (Preferred)**:
   - Go to the **Security** tab of the [repository](https://github.com/MohamedJebahi21/cinetrekker/security/advisories)
   - Click **"Report a vulnerability"** to open a private advisory draft.

2. **Security Contact**:
   - Contact the maintainer directly via GitHub profile: [@MohamedJebahi21](https://github.com/MohamedJebahi21) or by email at `mohamed.jebahi21@gmail.com` with the subject `[SECURITY VULNERABILITY] CineTrekker`.

### What to Include

Please provide detailed information to help us reproduce and fix the issue:
- Type of vulnerability (e.g. XSS, authentication bypass, CSRF, RLS policy flaw)
- Step-by-step instructions or proof-of-concept (PoC)
- Affected endpoints, routes, or components
- Potential impact of the vulnerability

### Response Timeline

- **Acknowledgment**: Within 48 hours.
- **Triage & Assessment**: Within 5 business days.
- **Resolution & Release**: A fix will be developed and deployed promptly. We will coordinate public disclosure after the patch is in production.

## Security Architecture & Defenses

For detailed technical documentation on CineTrekker's security layers (CSP, Row Level Security, input sanitization, API rate limiting, and incident response procedures), see:
- [`docs/SECURITY.md`](docs/SECURITY.md) — Comprehensive technical security implementation
- [`docs/INCIDENT_RESPONSE.md`](docs/INCIDENT_RESPONSE.md) — Incident response runbook
- [`docs/SECURITY_REVIEWS.md`](docs/SECURITY_REVIEWS.md) — Recurring review cadence
