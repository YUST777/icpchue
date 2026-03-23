'use client';

import { useEffect, useCallback, useState } from 'react';
import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { renderToString } from 'react-dom/server';
import { BookOpen, MonitorPlay, BarChart2, Puzzle, TerminalSquare, History } from 'lucide-react';

// ============================================================================
// ONBOARDING TOUR — جولة تعريفية تفاعلية باللغة العربية
// ============================================================================

const ONBOARDING_STORAGE_KEY = 'icpchue-onboarding-completed';

interface OnboardingTourProps {
    delay?: number;
    forceShow?: boolean;
    onComplete?: () => void;
}

const renderIcon = (IconComponent: React.ElementType) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Icon = IconComponent as any;
    return renderToString(
        <span className="inline-flex items-center justify-center bg-white/10 rounded-lg p-1.5 ml-2 -mt-1 shadow-sm border border-white/5 text-[#E8C15A]">
            <Icon size={20} strokeWidth={2} />
        </span>
    );
};

export default function OnboardingTour({
    delay = 2000,
    forceShow = false,
    onComplete,
}: OnboardingTourProps) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const hasSeen = localStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (hasSeen && !forceShow) return;

        const timer = setTimeout(() => setReady(true), delay);
        return () => clearTimeout(timer);
    }, [delay, forceShow]);

    const markCompleted = useCallback(() => {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
        onComplete?.();
    }, [onComplete]);

    // Safety: clean up any leftover driver.js overlays on unmount or re-render
    useEffect(() => {
        return () => {
            // Remove any stale driver.js overlay elements that might block clicks
            document.querySelectorAll('.driver-overlay, .driver-popover, .driver-active-element').forEach(el => el.remove());
            document.querySelectorAll('[class*="driver-"]').forEach(el => {
                if (el.classList.contains('driver-overlay') || el.classList.contains('driver-popover-wrapper')) {
                    el.remove();
                }
            });
            // Remove driver.js body class that might block pointer events
            document.body.classList.remove('driver-active');
            document.documentElement.style.removeProperty('pointer-events');
        };
    }, []);

    const startTour = useCallback(() => {
        const steps: DriveStep[] = [
            // Step 1: Welcome — left panel
            {
                element: '#onboarding-left-panel',
                popover: {
                    title: `<span class="align-middle">أهلاً بيك في ICPC HUE!</span>${renderIcon(BookOpen)}`,
                    description: 'موقع ICPC HUE هو بديل موقع Codeforces الكامل. أولاً هتلاقي نص المسألة على الشمال، يلا أوريك باقي الموقع!',
                    side: 'right' as const,
                    align: 'center' as const,
                },
            },
            // Step 2: Code Editor (IDE)
            {
                element: '#onboarding-code-workspace',
                popover: {
                    title: `<span class="align-middle">الـ IDE</span>${renderIcon(MonitorPlay)}`,
                    description: 'هنا هتحل المسألة. الـ IDE بيدعم كل اللغات زي Python و ++C وغيرها.',
                    side: 'left' as const,
                    align: 'center' as const,
                },
            },
            // Step 3: Test Cases Panel
            {
                element: '#onboarding-test-panel',
                popover: {
                    title: `<span class="align-middle">جرّب التست كيسز</span>${renderIcon(TerminalSquare)}`,
                    description: 'قبل ما تسلّم لـ Codeforces الإجابة، تقدر تختبرها في مكانك وتزوّد تست كيسز كمان!',
                    side: 'top' as const,
                    align: 'center' as const,
                },
            },
            // Step 4: Analytics tab
            {
                element: '#onboarding-tab-analytics',
                popover: {
                    title: `<span class="align-middle">الإحصائيات</span>${renderIcon(BarChart2)}`,
                    description: 'من هنا تقدر تعرف سرعة حلك بالنسبة للباقي.',
                    side: 'bottom' as const,
                    align: 'start' as const,
                },
            },
            // Step 5: Submissions tab
            {
                element: '#onboarding-tab-submissions',
                popover: {
                    title: `<span class="align-middle">المحاولات السابقة</span>${renderIcon(History)}`,
                    description: 'وكمان تاريخ لكل اللي سلّمته من هنا.',
                    side: 'bottom' as const,
                    align: 'start' as const,
                },
            },
            // Step 6: Extension + Submit button
            {
                element: '#onboarding-submit-btn',
                popover: {
                    title: `<span class="align-middle">الإكستنشن والتسليم</span>${renderIcon(Puzzle)}`,
                    description: 'لازم تنزّل الإكستنشن عشان تتقبل الإجابة في المنصة وكود فورسز. بالتوفيق في رحلتك! :)',
                    onNextClick: () => {
                        window.open(
                            'https://chromewebstore.google.com/detail/verdict-helper/jeiffogppnpnefphgpglagmgbcnifnhj',
                            '_blank'
                        );
                        driverInstance.destroy();
                        markCompleted();
                    },
                },
            },
        ];

        const driverInstance = driver({
            showProgress: true,
            animate: true,
            overlayColor: 'rgba(0, 0, 0, 0.75)',
            stagePadding: 8,
            stageRadius: 8,
            allowClose: true,
            doneBtnText: 'نزّل الإكستنشن',
            nextBtnText: '&larr; التالي',
            prevBtnText: 'السابق &rarr;',
            progressText: '{{current}} من {{total}}',
            popoverClass: 'icpchue-tour-popover',
            steps,
            onDestroyStarted: () => {
                // Ensure overlay is removed immediately
                driverInstance.destroy();
            },
            onDestroyed: () => {
                markCompleted();
                // Force cleanup any leftover DOM elements
                setTimeout(() => {
                    document.querySelectorAll('.driver-overlay, .driver-popover, .driver-active-element').forEach(el => el.remove());
                    document.body.classList.remove('driver-active');
                }, 100);
            },
        });

        requestAnimationFrame(() => {
            driverInstance.drive();
        });
    }, [onComplete, markCompleted]);

    useEffect(() => {
        if (ready) {
            startTour();
        }
    }, [ready, startTour]);

    // Inject RTL styles for driver.js popovers
    return (
        <style jsx global>{`
            .icpchue-tour-popover {
                direction: rtl !important;
                text-align: right !important;
                font-family: 'Segoe UI', Tahoma, 'Cairo', 'Noto Sans Arabic', sans-serif !important;
            }
            .icpchue-tour-popover .driver-popover-title {
                direction: rtl !important;
                text-align: right !important;
                display: flex !important;
                flex-direction: row-reverse !important;
                align-items: center !important;
                justify-content: flex-end !important;
                gap: 4px !important;
            }
            .icpchue-tour-popover .driver-popover-description {
                direction: rtl !important;
                text-align: right !important;
                line-height: 1.8 !important;
                font-size: 14px !important;
            }
            .icpchue-tour-popover .driver-popover-footer {
                direction: rtl !important;
            }
            .icpchue-tour-popover .driver-popover-navigation-btns {
                direction: rtl !important;
            }
        `}</style>
    );
}

export function resetOnboarding() {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
}
