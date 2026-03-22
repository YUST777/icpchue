import Link from 'next/link';

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            <main className="max-w-4xl mx-auto px-6 py-20">
                <Link href="/" className="text-[#E8C15A]/40 text-xs font-bold uppercase tracking-widest hover:text-[#E8C15A] transition-colors mb-8 inline-block">&larr; Back to Home</Link>

                <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
                <p className="text-white/40 text-sm mb-12">Last Modified: March 22, 2026</p>

                <div className="prose prose-invert max-w-none">
                    <p className="text-white/70 text-lg leading-relaxed mb-8">
                        These Terms of Service (this &quot;Agreement&quot;) are a binding contract between you (&quot;Customer,&quot; &quot;you,&quot; or &quot;your&quot;) and ICPC HUE (&quot;ICPC HUE,&quot; &quot;we,&quot; or &quot;us&quot;). This Agreement governs your access to and use of the ICPC HUE platform and services.
                    </p>

                    {/* Agreement Acceptance */}
                    <section className="mb-12">
                        <h2 id="agreement-acceptance" className="text-2xl font-semibold mb-4 flex items-center gap-2">
                            Agreement Acceptance
                            <a href="#agreement-acceptance" className="text-[#E8C15A] opacity-0 hover:opacity-100 transition-opacity">#</a>
                        </h2>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-sm text-white/60 leading-relaxed">
                            <p className="mb-4">
                                THIS AGREEMENT TAKES EFFECT WHEN YOU ACCEPT THE TERMS DURING SIGN-UP OR BY ACCESSING OR USING THE SERVICES (the &quot;Effective Date&quot;). BY ACCEPTING THE TERMS DURING SIGN-UP OR BY ACCESSING OR USING THE SERVICES YOU:
                            </p>
                            <ul className="list-disc list-inside space-y-2 mb-4">
                                <li>ACKNOWLEDGE THAT YOU HAVE READ AND UNDERSTAND THIS AGREEMENT;</li>
                                <li>REPRESENT AND WARRANT THAT YOU HAVE THE RIGHT, POWER, AND AUTHORITY TO ENTER INTO THIS AGREEMENT;</li>
                                <li>ACCEPT THIS AGREEMENT AND AGREE THAT YOU ARE LEGALLY BOUND BY ITS TERMS.</li>
                            </ul>
                            <p className="font-semibold text-white/80">
                                IF YOU DO NOT ACCEPT THESE TERMS, YOU MAY NOT ACCESS OR USE THE SERVICES.
                            </p>
                        </div>
                    </section>

                    {/* Section 1 */}
                    <section className="mb-12">
                        <h2 id="definitions" className="text-2xl font-semibold mb-4 flex items-center gap-2">
                            1. Definitions
                            <a href="#definitions" className="text-[#E8C15A] opacity-0 hover:opacity-100 transition-opacity">#</a>
                        </h2>
                        <div className="space-y-4 text-white/70">
                            <p><strong className="text-white">&quot;Authorized User&quot;</strong> means students, trainees, trainers, and other individuals who are authorized to access and use the Services under the rights granted pursuant to this Agreement.</p>
                            <p><strong className="text-white">&quot;Customer Data&quot;</strong> means information, data, and other content, in any form or medium, that is submitted, posted, or otherwise transmitted by or on behalf of you through the Services.</p>
                            <p><strong className="text-white">&quot;Services&quot;</strong> means ICPC HUE&apos;s proprietary hosted software platform, including the web application, browser extension, and related tools for competitive programming training.</p>
                            <p><strong className="text-white">&quot;Third-Party Products&quot;</strong> means any third-party products provided with, integrated with, or incorporated into the Services, including but not limited to Codeforces integration.</p>
                        </div>
                    </section>

                    {/* Section 2 */}
                    <section className="mb-12">
                        <h2 id="access-and-use" className="text-2xl font-semibold mb-4 flex items-center gap-2">
                            2. Access and Use
                            <a href="#access-and-use" className="text-[#E8C15A] opacity-0 hover:opacity-100 transition-opacity">#</a>
                        </h2>

                        <h3 className="text-lg font-medium text-white mb-3">a. Provision of Access</h3>
                        <p className="text-white/70 mb-6">
                            Subject to and conditioned on your compliance with the terms and conditions of this Agreement, ICPC HUE will make available to you on a non-exclusive, non-transferable, and non-sublicensable basis, access to and use of the Services, solely for use by Authorized Users.
                        </p>

                        <h3 className="text-lg font-medium text-white mb-3">b. Use Restrictions</h3>
                        <p className="text-white/70 mb-4">You shall not at any time, directly or indirectly:</p>
                        <ul className="list-disc list-inside space-y-2 text-white/70 mb-6">
                            <li>Copy, modify, or create derivative works of the Services</li>
                            <li>Reverse engineer, disassemble, or decompile any part of the Services</li>
                            <li>Bypass any security measures or access the Services through unauthorized means</li>
                            <li>Upload or transmit any malicious code or harmful content</li>
                            <li>Use the Services in violation of any applicable law</li>
                        </ul>

                        <h3 className="text-lg font-medium text-white mb-3">c. Suspension</h3>
                        <p className="text-white/70">
                            ICPC HUE may temporarily suspend your access to the Services if we reasonably determine that there is a threat or attack on our systems, your use disrupts the Services for other users, you are using the Services for fraudulent or illegal activities, or your provision of Services is prohibited by applicable law.
                        </p>
                    </section>

                    {/* Section 3 */}
                    <section className="mb-12">
                        <h2 id="customer-responsibilities" className="text-2xl font-semibold mb-4 flex items-center gap-2">
                            3. Customer Responsibilities
                            <a href="#customer-responsibilities" className="text-[#E8C15A] opacity-0 hover:opacity-100 transition-opacity">#</a>
                        </h2>
                        <p className="text-white/70 mb-4">
                            You are responsible and liable for all uses of the Services resulting from access provided by you, directly or indirectly. You are responsible for:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-white/70">
                            <li>All Customer Data, including its content and use</li>
                            <li>The security and use of your access credentials</li>
                            <li>All access to and use of the Services through your account</li>
                            <li>Ensuring compliance with Codeforces&apos; terms of service when using our submission features</li>
                        </ul>
                    </section>

                    {/* Section 4 - Data Collection */}
                    <section className="mb-12">
                        <h2 id="data-collection" className="text-2xl font-semibold mb-4 flex items-center gap-2">
                            4. Data Collection and Storage
                            <a href="#data-collection" className="text-[#E8C15A] opacity-0 hover:opacity-100 transition-opacity">#</a>
                        </h2>

                        <h3 className="text-lg font-medium text-white mb-3">a. Data We Collect and Store</h3>
                        <p className="text-white/70 mb-4">
                            When you use the Services, we collect and store certain data on our servers to provide and improve the platform experience. This includes:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-white/70 mb-6">
                            <li><strong className="text-white">AI Chat Messages:</strong> Conversations with the AI assistant are stored on our servers to enable chat history and continued sessions.</li>
                            <li><strong className="text-white">User Profile Data:</strong> Your email address, Codeforces handle, account preferences, and authentication identifiers.</li>
                            <li><strong className="text-white">Usage Metadata:</strong> Problem view history and submission activity for analytics and caching purposes.</li>
                        </ul>

                        <h3 className="text-lg font-medium text-white mb-3">b. Data We Do NOT Store on Our Servers</h3>
                        <div className="bg-[#E8C15A]/5 border border-[#E8C15A]/20 rounded-lg p-6 text-sm text-white/70 leading-relaxed mb-6">
                            <p>
                                <strong className="text-[#E8C15A]">Your API Keys are never stored on our servers.</strong> When you configure an AI provider, the API key is stored exclusively in your browser&apos;s local storage and is never transmitted to or persisted on our servers.
                            </p>
                        </div>

                        <h3 className="text-lg font-medium text-white mb-3">c. Data Retention</h3>
                        <p className="text-white/70">
                            We retain your data for as long as your account is active or as needed to provide the Services. You may request deletion of your account and associated data by contacting us.
                        </p>
                    </section>

                    {/* Section 5 - Cookies */}
                    <section className="mb-12">
                        <h2 id="cookies" className="text-2xl font-semibold mb-4 flex items-center gap-2">
                            5. Cookies and Local Storage
                            <a href="#cookies" className="text-[#E8C15A] opacity-0 hover:opacity-100 transition-opacity">#</a>
                        </h2>
                        <p className="text-white/70 mb-4">
                            ICPC HUE uses cookies and browser local storage to operate the platform:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-white/70 mb-6">
                            <li><strong className="text-white">Authentication Cookies:</strong> We use secure cookies to maintain your login session. These are essential for the Services to function.</li>
                            <li><strong className="text-white">Local Storage:</strong> We use browser local storage to persist your AI provider API keys, editor preferences, and other client-side configuration. This data never leaves your browser.</li>
                            <li><strong className="text-white">Browser Extension:</strong> When you use the browser extension to submit solutions to Codeforces, the extension reads your Codeforces session cookies solely to authenticate the submission on your behalf. These cookies are transmitted for the duration of the submission request only and are never stored, logged, or persisted on our servers.</li>
                        </ul>
                        <p className="text-white/70">
                            We do not use third-party tracking cookies or advertising cookies.
                        </p>
                    </section>

                    {/* Section 6 */}
                    <section className="mb-12">
                        <h2 id="intellectual-property" className="text-2xl font-semibold mb-4 flex items-center gap-2">
                            6. Intellectual Property
                            <a href="#intellectual-property" className="text-[#E8C15A] opacity-0 hover:opacity-100 transition-opacity">#</a>
                        </h2>
                        <p className="text-white/70 mb-4">
                            <strong className="text-white">ICPC HUE IP:</strong> You acknowledge that ICPC HUE owns all right, title, and interest, including all intellectual property rights, in and to the Services and all related technology.
                        </p>
                        <p className="text-white/70">
                            <strong className="text-white">Customer Data:</strong> You retain all right, title, and interest in your Customer Data. You grant ICPC HUE a non-exclusive license to use your Customer Data solely to provide the Services.
                        </p>
                    </section>

                    {/* Section 7 */}
                    <section className="mb-12">
                        <h2 id="disclaimer" className="text-2xl font-semibold mb-4 flex items-center gap-2">
                            7. Disclaimer of Warranties
                            <a href="#disclaimer" className="text-[#E8C15A] opacity-0 hover:opacity-100 transition-opacity">#</a>
                        </h2>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-sm text-white/60">
                            <p>
                                THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND ICPC HUE HEREBY DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. ICPC HUE SPECIFICALLY DISCLAIMS ALL IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. ICPC HUE MAKES NO WARRANTY THAT THE SERVICES WILL MEET YOUR REQUIREMENTS, OPERATE WITHOUT INTERRUPTION, BE SECURE, ACCURATE, COMPLETE, OR ERROR FREE.
                            </p>
                        </div>
                    </section>

                    {/* Section 8 */}
                    <section className="mb-12">
                        <h2 id="limitation" className="text-2xl font-semibold mb-4 flex items-center gap-2">
                            8. Limitation of Liability
                            <a href="#limitation" className="text-[#E8C15A] opacity-0 hover:opacity-100 transition-opacity">#</a>
                        </h2>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-sm text-white/60">
                            <p>
                                IN NO EVENT WILL ICPC HUE BE LIABLE FOR ANY CONSEQUENTIAL, INCIDENTAL, INDIRECT, EXEMPLARY, SPECIAL, OR PUNITIVE DAMAGES; LOST PROFITS, REVENUE, OR BUSINESS; LOSS OF DATA; OR COST OF REPLACEMENT SERVICES.
                            </p>
                        </div>
                        <h3 className="text-lg font-medium text-white mb-3 mt-6">Third-Party Platform Risks</h3>
                        <p className="text-white/70">
                            ICPC HUE integrates with third-party platforms such as Codeforces. ICPC HUE is not responsible for any account restrictions, suspensions, bans, rate limiting, or other actions taken by Codeforces or any third-party platform against your account as a result of using the Services. You use these integration features at your own risk and acknowledge that third-party platforms may enforce their own policies independently of ICPC HUE.
                        </p>
                    </section>

                    {/* Section 9 */}
                    <section className="mb-12">
                        <h2 id="termination" className="text-2xl font-semibold mb-4 flex items-center gap-2">
                            9. Termination
                            <a href="#termination" className="text-[#E8C15A] opacity-0 hover:opacity-100 transition-opacity">#</a>
                        </h2>
                        <p className="text-white/70">
                            Either party may terminate this Agreement if the other party materially breaches this Agreement. Upon termination, you shall immediately discontinue use of the Services.
                        </p>
                    </section>

                    {/* Section 10 */}
                    <section className="mb-12">
                        <h2 id="changes" className="text-2xl font-semibold mb-4 flex items-center gap-2">
                            10. Changes to Terms
                            <a href="#changes" className="text-[#E8C15A] opacity-0 hover:opacity-100 transition-opacity">#</a>
                        </h2>
                        <p className="text-white/70">
                            ICPC HUE may modify this Agreement from time to time. We will provide reasonable notice of any material changes. Your continued use of the Services after such changes constitutes acceptance of the modified Agreement.
                        </p>
                    </section>

                    {/* Contact */}
                    <section className="mb-12">
                        <h2 id="contact" className="text-2xl font-semibold mb-4 flex items-center gap-2">
                            Contact
                            <a href="#contact" className="text-[#E8C15A] opacity-0 hover:opacity-100 transition-opacity">#</a>
                        </h2>
                        <p className="text-white/70">
                            If you have any questions about these Terms of Service, please contact us at{' '}
                            <a href="mailto:icpchue@horus.edu.eg" className="text-[#E8C15A] hover:underline">icpchue@horus.edu.eg</a>.
                        </p>
                    </section>
                </div>
            </main>
        </div>
    );
}
