# Install the distributed router

`@p3sg/pr-attention-router` is the adopter-facing npm product. The P3 dashboard,
API, Google OAuth and Netlify deployment are independent private demonstration
infrastructure and are not required or included.

## Release contract

Version 1.0.0 requires Node 24, has no runtime dependencies and is licensed under
Apache-2.0. The supported JavaScript/TypeScript imports are exactly:

- `@p3sg/pr-attention-router`
- `@p3sg/pr-attention-router/publication`

Publication records are closed schemas. Unknown authority, analysis or risk-
dimension fields are rejected instead of preserved. Internal modules and the
workflow-only publication script are not public exports.

The repository prepares a staged npm release; it does not imply that version
1.0.0 is already public. Before approval, inspect the packed artifact with:

```sh
npm run package-smoke --workspace @p3sg/pr-attention-router
npm pack --dry-run --json --ignore-scripts --workspace @p3sg/pr-attention-router
```

## Reference integration

1. Install the reviewed exact release rather than a moving tag:

   ```sh
   npm install --save-exact @p3sg/pr-attention-router@1.0.0
   ```

2. Copy `node_modules/@p3sg/pr-attention-router/dist/examples/config/` to
   `config/pr-attention-router/` and the packaged workflow reference to
   `.github/workflows/pr-attention-review.yml`. Customize real repository paths,
   rubric semantics and verification-workflow names before enabling it.

3. Validate the host policy against tracked files:

   ```sh
   npx --no-install pr-attention-router check config/pr-attention-router .
   ```

4. Preserve trusted default-branch checkouts, same-repository author/head checks,
   read-only pull-request inspection, least-privilege jobs and isolated
   notification credentials. Never execute pull-request code in a credentialed
   job.

5. Configure repository variable `PAR_APP_WORKFLOWS_ENABLED=true`. AI requires
   the workflow's `OPENAI_API_KEY`; deterministic-only fallback must require human
   review. Email and Slack remain optional and isolated from classification.

6. Human-review and merge the integration, then exercise authorized LOW, MEDIUM
   and HIGH sandbox pull requests. Compare the deterministic floor, AI result,
   final tier, comment and `classification.json` artifact. Do not infer approval
   or merge authority from a tier.

The packaged workflow is a copyable reference, not a composite action or hosted
service. It installs the router into a trusted temporary directory with lifecycle
scripts disabled. Other adopters may consume the module/result contract without
the private P3 dashboard.

Before installing outside the ADR-0001 sandbox boundary, obtain owner approval and
amend or supersede that decision record.

## Staged publishing and trusted publisher

The release workflow uses npm OIDC rather than a stored npm token. Configure the
package's GitHub Actions trusted publisher with these exact values only after the
workflow exists on the default branch:

- GitHub organization or user: `p3sg`
- Repository: `risk-based-pr-attention-routing`
- Workflow filename: `publish-npm.yml`
- Environment: none
- Allowed action: `npm stage publish` only
- Direct `npm publish` and dist-tag management: disabled

The package must already exist on npm before a trusted-publisher relationship can
be created. Treat creation of that first registry package as a separately
authorized bootstrap operation; do not introduce a CI token to bypass this npm
constraint. Create the trust relationship only when a release is ready because
npm requires its first successful OIDC publish within two days.

Publish a GitHub release whose tag is exactly `v<package version>`. The workflow
validates the tag, runs the complete router/package gate and submits the package to
npm staging. Inspect the staged manifest and tarball, then approve it interactively
with npm 2FA. Committing or running the validation workflow alone does not publish
the package.

After the first successful OIDC stage, set npm Publishing access to **Require
two-factor authentication and disallow tokens**. Trusted publishing continues to
work because it uses short-lived OIDC credentials. See npm's
[trusted-publisher](https://docs.npmjs.com/trusted-publishers/) and
[staged-publishing](https://docs.npmjs.com/staged-publishing/) documentation.
