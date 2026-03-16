const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Add stealth plugin
puppeteer.use(StealthPlugin());

const targetUrl = process.argv[2];

if (!targetUrl) {
    console.error('Error: No URL provided');
    process.exit(1);
}

(async () => {
    console.error('🚀 Launching stealth browser for:', targetUrl);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.error(`🔗 Navigating...`);

        // First navigation attempt - Cloudflare might intercept
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        // Check if we're on a Cloudflare page FIRST before any wait
        let content = await page.content();
        const isCloudflare = content.includes('Just a moment') || content.includes('Checking your browser') || content.includes('cf-browser-verification');

        // Only wait if Cloudflare challenge is detected
        if (isCloudflare) {
            console.error('⏳ Cloudflare challenge detected, waiting...');
            let retries = 0;
            while ((content.includes('Just a moment') || content.includes('Checking your browser') || content.includes('cf-browser-verification')) && retries < 5) {
                await new Promise(r => setTimeout(r, 3000));
                content = await page.content();
                retries++;
            }
        }

        console.error('⏳ Waiting for .problem-statement...');
        await page.waitForSelector('.problem-statement', { timeout: 30000 });

        console.error('✅ Loaded. Extracting & sanitizing content...');

        const data = await page.evaluate(() => {
            const statement = document.querySelector('.problem-statement');
            if (!statement) return null;

            // ========== PHASE 1: THE CLEANUP (SANITIZER) ==========

            // 1. Remove MathJax Preview spans (causes duplicate text like "n n")
            statement.querySelectorAll('.MathJax_Preview').forEach(el => el.remove());

            // 2. Remove MathJax processed nodes (we want raw LaTeX only)
            statement.querySelectorAll('.MathJax').forEach(el => el.remove());
            statement.querySelectorAll('.MathJax_Display').forEach(el => el.remove());

            // 3. Convert <script type="math/tex"> to $$$...$$$  (Codeforces format)
            // Display math (block equations) - use \[ ... \]
            statement.querySelectorAll('script[type="math/tex; mode=display"]').forEach(script => {
                const latex = script.textContent || '';
                const span = document.createElement('span');
                span.className = 'cf-display-math';
                span.textContent = '\\[' + latex + '\\]';
                script.replaceWith(span);
            });

            // Inline math - use \( ... \)
            statement.querySelectorAll('script[type="math/tex"]').forEach(script => {
                const latex = script.textContent || '';
                const span = document.createElement('span');
                span.className = 'cf-inline-math';
                span.textContent = '\\(' + latex + '\\)';
                script.replaceWith(span);
            });

            // 4. Remove any remaining non-essential scripts
            statement.querySelectorAll('script').forEach(el => el.remove());

            // 5. Fix relative image URLs
            statement.querySelectorAll('img').forEach(img => {
                const src = img.getAttribute('src');
                if (src && !src.startsWith('http')) {
                    img.setAttribute('src', `https://codeforces.com${src}`);
                }
                img.style.maxWidth = '100%';
            });

            // ========== PHASE 2: EXTRACTION ==========

            const header = document.querySelector('.problem-statement .header');
            const inputSpec = statement.querySelector('.input-specification');
            const outputSpec = statement.querySelector('.output-specification');
            const sampleTests = statement.querySelector('.sample-tests');
            const noteSection = statement.querySelector('.note');

            // Helper: Extract clean HTML from a section (removes section title)
            const extractSectionHTML = (el) => {
                if (!el) return null;
                const clone = el.cloneNode(true);
                const title = clone.querySelector('.section-title');
                if (title) title.remove();
                return clone.innerHTML.trim();
            };

            // 1. Metadata (keep original text for display)
            const title = header?.querySelector('.title')?.textContent?.trim() || 'Unknown';
            const timeLimitEl = header?.querySelector('.time-limit');
            const memoryLimitEl = header?.querySelector('.memory-limit');
            const inputFileEl = header?.querySelector('.input-file');
            const outputFileEl = header?.querySelector('.output-file');

            // Extract the actual value (skip the label node)
            const timeLimit = timeLimitEl?.childNodes[1]?.textContent?.trim() || '2 seconds';
            const memoryLimit = memoryLimitEl?.childNodes[1]?.textContent?.trim() || '256 megabytes';
            const inputType = inputFileEl?.childNodes[1]?.textContent?.trim() || 'standard input';
            const outputType = outputFileEl?.childNodes[1]?.textContent?.trim() || 'standard output';

            // 2. Story (everything between header and input-specification)
            let storyHTML = '';
            const stopClasses = ['input-specification', 'output-specification', 'sample-tests', 'note'];

            if (header) {
                let currentNode = header.nextElementSibling;
                while (currentNode) {
                    // Stop if we hit a known section
                    if (stopClasses.some(cls => currentNode.classList?.contains(cls))) break;
                    storyHTML += currentNode.outerHTML;
                    currentNode = currentNode.nextElementSibling;
                }
            }

            // 3. Input/Output Specifications
            const inputSpecHTML = extractSectionHTML(inputSpec);
            const outputSpecHTML = extractSectionHTML(outputSpec);

            // 4. Note Section
            const noteHTML = extractSectionHTML(noteSection);

            // 5. Test Cases (clean extraction with proper newline handling)
            const extractSampleText = (preNode) => {
                // Clone to avoid modifying the original
                const clone = preNode.cloneNode(true);

                // Replace <br> with newline text nodes
                clone.querySelectorAll('br').forEach(br => {
                    br.replaceWith('\n');
                });

                // Handle Codeforces div-based line formatting
                clone.querySelectorAll('div').forEach(div => {
                    // Add newline after each div's content
                    div.after('\n');
                });

                // Get text and clean up
                return clone.textContent?.trim() || '';
            };

            const testCases = [];
            const inputs = statement.querySelectorAll('.sample-test .input pre');
            const outputs = statement.querySelectorAll('.sample-test .output pre');

            inputs.forEach((inputNode, i) => {
                if (outputs[i]) {
                    testCases.push({
                        id: i + 1,
                        input: extractSampleText(inputNode),
                        output: extractSampleText(outputs[i])
                    });
                }
            });

            // 6. Parse time/memory to numbers for header display
            let timeLimitMs = 2000;
            const timeMatch = timeLimit.match(/([\d.]+)/);
            if (timeMatch) {
                timeLimitMs = parseFloat(timeMatch[1]) * 1000;
            }

            let memoryLimitMB = 256;
            const memMatch = memoryLimit.match(/(\d+)/);
            if (memMatch) {
                memoryLimitMB = parseInt(memMatch[1]);
            }

            return {
                meta: {
                    title,
                    timeLimit,      // Original text: "2 seconds"
                    memoryLimit,    // Original text: "256 megabytes"
                    timeLimitMs,    // Numeric: 2000
                    memoryLimitMB,  // Numeric: 256
                    inputType,
                    outputType
                },
                story: storyHTML,
                inputSpec: inputSpecHTML,
                outputSpec: outputSpecHTML,
                note: noteHTML,
                testCases
            };
        });

        if (data) {
            console.log(JSON.stringify(data));
        } else {
            console.error('❌ Element not found');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        if (browser) await browser.close();
    }
})();
