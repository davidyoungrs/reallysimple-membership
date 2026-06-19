# Git & Vercel Dev-to-Prod Transition Roadmap

This guide details the actionable tasks needed to set up a secure, private development lifecycle and split environments between **Staging/Dev** and **Live Production**.

---

## 🔒 1. Repository Security & Privacy (GitHub)
- [ ] **Convert Repository to Private**:
  - Go to your repository settings page on GitHub.
  - Scroll to the bottom of the **General** settings tab to the **Danger Zone**.
  - Click **Change visibility** and select **Make private**.
- [ ] **Establish Branch Protection Rules**:
  - In GitHub settings, click **Branches** in the sidebar.
  - Add a protection rule for the `main` (production) branch.
  - Check **Require a pull request before merging** to prevent direct commits/pushes from accidentally going live.

---

## 🌿 2. Branching & Environments Setup (GitHub)
- [x] **Create the Staging Branch**:
  - Create a new branch named `development` locally or from GitHub:
    ```bash
    git checkout -b development
    git push origin development
    ```
- [x] **Align Local Workflow**:
  - Set your local working directory to pull from `development` by default.
  - Avoid making direct edits on `main`. Work on feature branches or `development` first.

---

## ⚡ 3. Multi-Environment Configurations (Vercel)
- [ ] **Re-Authorize Private Repo**:
  - Ensure Vercel is authorized to view your private repositories (Vercel will usually request permissions automatically if it loses read access).
- [ ] **Separate Database URL**:
  - In Neon Database, create a database branch (e.g., `dev` or `staging`) representing test data.
  - In **Vercel Settings ➔ Environment Variables**, edit `DATABASE_URL`:
    - Set the live DB URL exclusively for the **Production** environment.
    - Set the test DB URL for **Preview** and **Development** environments.
- [ ] **Separate Clerk Authentication Keys**:
  - In Vercel, assign your Clerk production keys (`CLERK_SECRET_KEY` and `VITE_CLERK_PUBLISHABLE_KEY`) to the **Production** environment.
  - In Vercel, assign your Clerk sandbox keys to **Preview** and **Development** environments.
- [ ] **Separate Stripe Payment Keys**:
  - Assign Stripe Live API keys (`sk_live_...`) to **Production**.
  - Assign Stripe Test API keys (`sk_test_...`) to **Preview** and **Development** for sandbox credit card transactions.

---

## 🔄 4. Feature Release Workflow Checklist
- [ ] 1. Create feature branch off `development`: `git checkout -b feature/my-new-feature`
- [ ] 2. Develop locally, run `npm run dev` to test against sandbox configurations.
- [ ] 3. Commit and push feature branch: `git push origin feature/my-new-feature`
- [ ] 4. Create Pull Request on GitHub to merge into `development`.
- [ ] 5. Open and test the unique **Vercel Preview URL** commented on the PR.
- [ ] 6. Merge PR into `development` to release to the Staging server.
- [ ] 7. When ready to go live, open a PR from `development` to `main` and merge to publish to the production domain.
