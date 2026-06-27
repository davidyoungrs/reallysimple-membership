import { BookOpen } from 'lucide-react';

export function AdminManual() {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 max-w-4xl mx-auto text-slate-700">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Manual</h1>
          <p className="text-sm text-slate-500">Your complete guide to issuing, customizing, and managing mobile wallet passes</p>
        </div>
      </div>

      <div className="space-y-8 leading-relaxed">
        {/* Section 1 */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-1">1. Introduction</h2>
          <p className="mb-4">
            <strong>Really Simple Membership</strong> is a modern, web-based membership administration platform designed for club organizers, business owners, and membership-based groups. The platform replaces expensive custom mobile apps and wasteful plastic cards by compiling native digital passes that members can save directly into <strong>Apple Wallet</strong> (iOS) and <strong>Google Wallet</strong> (Android).
          </p>
          <h3 className="font-semibold text-slate-900 mb-2">Key Benefits:</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Cost-Efficient</strong>: Issue premium digital cards without building and maintaining custom app store applications.</li>
            <li><strong>Real-Time Synchronization</strong>: Any updates made to a member's credentials or card design automatically push to their mobile phone in real-time.</li>
            <li><strong>Location-Aware Alerts</strong>: Passes pop up directly on members' lock screens when they walk near your physical club locations.</li>
            <li><strong>Bulk Operations</strong>: Upload a CSV file of your members to automatically generate and distribute hundreds of passes in seconds.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-1">2. Quick Start / Setup</h2>
          <p className="mb-3">Follow these simple steps to access your organization and customize your membership workspace:</p>
          <ol className="list-decimal pl-5 space-y-3">
            <li>
              <strong>Sign In / Account Setup</strong>: Navigate to the platform's login page. Sign in using the email address you advised the Really Simple Applications team.
            </li>
            <li>
              <strong>Accessing Your Club</strong>: As a new user, a default club workspace will already be set up for you as a basic template. You do not need to create one from scratch.
            </li>
            <li>
              <strong>Customize Your Branding</strong>:
              <ul className="list-disc pl-5 mt-1.5 space-y-1">
                <li>On the <strong>Main Panel</strong> dashboard, locate your pre-configured club card.</li>
                <li>Click the edit pencil button (<strong>Edit Branding</strong>) to customize it.</li>
                <li>Modify your <strong>Club Name</strong>, <strong>Subdomain/Slug</strong> (e.g. <code>fitlife-gym</code>), and <strong>Logo URL</strong>.</li>
                <li>Define your <strong>Branding Colors</strong> (Primary, Secondary, Background, Text) which will apply to all administrator views and templates.</li>
                <li>Scroll down to the locations list to configure geofencing and click <strong>Save Club</strong>.</li>
              </ul>
            </li>
            <li>
              <strong>Open the Club Workspace</strong>: Find your club card on the <strong>Main Panel</strong> directory and click its card body to open its dedicated <strong>Club Workspace</strong> dashboard.
            </li>
          </ol>
        </section>

        {/* Section 3 */}
        <section className="space-y-6">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1">3. Core Features & Step-by-Step Workflows</h2>
          
          <div>
            <h3 className="font-bold text-slate-900 mb-2">3.1 Designing Card Templates</h3>
            <p className="mb-2">Templates control how your passes look in Apple and Google Wallet. You can create up to 6 custom templates for different tiers (e.g., Gold, VIP, Standard).</p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>Open your workspace and click <strong>Templates</strong> in the left-hand menu.</li>
              <li>Click <strong>Create Template</strong>.</li>
              <li>In the template editor form:
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Enter a <strong>Template Name</strong> (e.g., <em>Gold Membership</em>) and the <strong>Membership Type</strong> code.</li>
                  <li>Pick your <strong>Wallet Colors</strong> (Background, Foreground, and Label colors) to match your branding.</li>
                  <li>Select <strong>Strip Image</strong> options. Click <strong>🎨 Customize Strip Banner & Background</strong> to open the interactive canvas designer: choose <strong>Solid Color</strong> or <strong>Faded Image</strong>, drag to crop/position, and save.</li>
                  <li>Define <strong>Back of Card</strong> text fields (e.g., Club Terms, Benefits, Support Email).</li>
                </ul>
              </li>
              <li>Click <strong>Save Template</strong> to persist your design.</li>
            </ol>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-2">3.2 Issuing a Single Pass</h3>
            <p className="mb-2">Use the single-card generator to issue a pass to an individual member:</p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>Open your workspace and click <strong>Issue Card</strong> in the left-hand menu.</li>
              <li>Under the <strong>Card Template</strong> dropdown, choose the template to apply.</li>
              <li>In the <strong>Member Information</strong> block, fill in the <strong>Full Name</strong>, <strong>Email Address</strong>, <strong>Member Since (Year)</strong>, and optionally a <strong>Member Number</strong>.</li>
              <li>Upload a <strong>Member Photo</strong> (avatar). Note that the photo file size must be <strong>under 1MB</strong>.</li>
              <li>Pick an <strong>Expiration Date</strong> for the pass.</li>
              <li>Click <strong>Generate Membership Card</strong>.</li>
              <li>The system generates the pass credentials. You can copy the public url, click <strong>Add to Apple Wallet</strong>, or click <strong>Save to Google Pay</strong>.</li>
            </ol>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-2">3.3 Bulk CSV Importing</h3>
            <p className="mb-2">To issue membership passes to hundreds of members simultaneously:</p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>Open your workspace and select <strong>Members</strong> in the left-hand menu.</li>
              <li>Click <strong>Bulk CSV Import</strong>.</li>
              <li>Click <strong>Download Template</strong> to get the correct CSV header structure.</li>
              <li>Prepare your spreadsheet matching the template headers exactly.</li>
              <li>Upload your finalized CSV file and select the <strong>Default Template</strong>.</li>
              <li>Click <strong>Verify and Import</strong>. Passes will be generated and welcome emails sent automatically.</li>
            </ol>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-2">3.4 Filtering & Expiration Management</h3>
            <p className="mb-2">Keep track of expiring memberships using advanced filters:</p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>Open your workspace and click <strong>Members</strong> in the left-hand menu.</li>
              <li>Click the <strong>Filter by Expiration</strong> dropdown to select quick ranges (e.g. <em>Expiring in &lt; 30 days</em>) or select a <strong>Custom Range</strong> using the calendar pickers.</li>
              <li>To edit or revoke a member's pass, click the <strong>Edit/Pencil</strong> button on their directory card and adjust their status.</li>
            </ol>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-2">3.5 Configuring Geofencing (GPS Notifications)</h3>
            <p className="mb-2">Trigger local lock-screen messages when members walk near your club:</p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>Navigate back to the <strong>Main Panel</strong> (<code>/admin</code>).</li>
              <li>Click <strong>Edit Branding</strong> (the pencil icon) on your club's card.</li>
              <li>Scroll down to the <strong>Locations</strong> section. Click <strong>Add Location</strong>.</li>
              <li>Enter the location <strong>Name</strong>, <strong>Latitude</strong> (e.g., <code>51.5074</code>), and <strong>Longitude</strong> (e.g., <code>-0.1278</code>).</li>
              <li>In the <strong>Lock-screen Notification Message</strong> input, type the exact text to display (e.g., <em>Welcome to Gym London! Show your pass to check-in.</em>).</li>
              <li>Click <strong>Save Club</strong>. All passes will automatically load these coordinate boundaries.</li>
            </ol>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-2">3.6 Super User Governance</h3>
            <p className="mb-2">Root-level administrators can manage platform roles and club assignments:</p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>Navigate to <code>/admin/superuser</code> or click <strong>Super User</strong> in the left-hand menu.</li>
              <li><strong>Reordering Clubs</strong>: Drag and drop the club cards in the list to reorder how they are displayed across the platform.</li>
              <li><strong>Pre-authorizing Administrators</strong>: Enter the email address of a new admin and click <strong>Pre-authorize Email</strong>.</li>
              <li><strong>Modifying Roles</strong>: Click the <strong>Make Admin</strong> or <strong>Make Super Admin</strong> toggles next to registered accounts.</li>
            </ol>
          </div>
        </section>

        {/* Section 4 */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-1">4. Frequently Asked Questions (FAQ)</h2>
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-slate-900">What happens if a club is suspended?</h4>
              <p className="text-sm">If a club's status is set to suspended, all passes issued under that club are temporarily deactivated. Members viewing their public card URL will see a <strong>Club Suspended</strong> alert and passes will indicate they are inactive.</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900">How do members add passes to their phones?</h4>
              <p className="text-sm">When a card is generated, the system creates a unique verification link. The member opens this link on their mobile device and clicks <strong>Add to Apple Wallet</strong> or <strong>Save to Google Pay</strong>.</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900">Why is there a 1MB size limit on member photos?</h4>
              <p className="text-sm">Mobile wallet passes must load quickly and operate on low cellular bandwidth. Keeping photo uploads under 1MB ensures passes compile correctly and load instantly in the phone's wallet app without lag.</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900">How close does a member need to be to trigger a geofence notification?</h4>
              <p className="text-sm">Pass geofencing triggers notifications when a member is within approximately 100 meters (330 feet) of the specified GPS coordinates.</p>
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-1">5. Troubleshooting & Support</h2>
          <div className="space-y-3">
            <div>
              <h4 className="font-bold text-slate-900">"Rate Limit Exceeded" Error Message</h4>
              <p className="text-sm">To prevent abuse, write operations are limited to <strong>20 requests per minute</strong> per administrator. If you hit this limit, please wait 60 seconds before making further updates.</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900">"Access Denied" or Scraper Blocker</h4>
              <p className="text-sm">If you encounter a <code>403 Forbidden</code> error, the platform's bot defense may have identified your browser client as a scripting bot (e.g. Axios, Curl). Ensure you are accessing the platform via a standard web browser.</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900">Support Inquiries</h4>
              <p className="text-sm">For certificate or configuration help, please contact your system administrator or file an issue in the development repository.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
