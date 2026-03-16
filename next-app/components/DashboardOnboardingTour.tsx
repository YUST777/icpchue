'use client';

import { useEffect, useCallback, useState } from 'react';
import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { renderToString } from 'react-dom/server';
import {
    LayoutDashboard, User, Trophy, Play, BookOpen, Bell,
    Map, Sparkles, MonitorPlay
} from 'lucide-react';

// ============================================================================
// DASHBOARD ONBOARDING TOUR — جولة تعريفية للداشبورد
// ============================================================================

const ONBOARDING_STORAGE_KEY = 'icpchue-dashboard-onboarding-completed';

interface DashboardOnboardingTourProps {
    delay?: number;
    forceShow?: boolean;
    onComplete?: () => void;
}

const renderIcon = (IconComponent: React.ElementType) => {
    return renderToString(
        <span className="inline-flex items-center justify-center bg-white/10 rounded-lg p-1.5 ml-2 -mt-1 shadow-sm border border-white/5 text-[#E8C15A]">
            <IconComponent size={20} strokeWidth={2} />
        </span>
    );
};

export default function DashboardOnboardingTour({
    delay = 1500,
    forceShow = false,
    onComplete,
}: DashboardOnboardingTourProps) {
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

    const startTour = useCallback(() => {
        const isMobile = window.innerWidth < 768;
        const steps: DriveStep[] = [
            // Step 1: Welcome — Dashboard area with video option
            {
                element: isMobile ? '#mobile-nav-dashboard' : '#onboarding-nav-dashboard',
                popover: {
                    title: `<span class="align-middle">أهلاً بيك في <bdi dir="ltr">ICPC HUE</bdi>!</span>${renderIcon(LayoutDashboard)}`,
                    description: `
                        <p style="margin-bottom:12px; direction:rtl;">الداشبورد بتاعك فيه كل حاجة — تقدمك، الإحصائيات، وأكتر. يلا أعرّفك على المكان.</p>
                        <div style="display:flex;gap:8px;margin-top:8px;direction:rtl;">
                            <a href="https://www.youtube.com/watch?v=tH--wuGCMuM" target="_blank" rel="noopener noreferrer"
                               style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#ccc;font-size:12px;text-decoration:none;transition:all 0.2s;"
                               onmouseover="this.style.background='rgba(255,255,255,0.15)';this.style.color='#fff'"
                               onmouseout="this.style.background='rgba(255,255,255,0.08)';this.style.color='#ccc'">
                                🎬 شوف فيديو الشرح
                            </a>
                        </div>
                    `,
                    side: (isMobile ? 'top' : 'right') as 'top' | 'right',
                    align: 'center' as const,
                },
            },
            // Step 2: Profile
            {
                element: isMobile ? '#mobile-nav-profile' : '#onboarding-nav-profile',
                popover: {
                    title: `<span class="align-middle">البروفايل والأشيفمنتس</span>${renderIcon(User)}`,
                    description: '<p dir="rtl">هنا البروفايل بتاعك. خش هنا عشان تشوف إنجازاتك والـ <bdi dir="ltr">Achievements</bdi> اللي كسبتها طول ما إنت بتحل.</p>',
                    side: (isMobile ? 'top' : 'right') as 'top' | 'right',
                    align: 'center' as const,
                },
            },
            // Step 3: Sessions
            {
                element: isMobile ? '#mobile-nav-sessions' : '#onboarding-nav-sessions',
                popover: {
                    title: `<span class="align-middle">السيشنز المسجلة</span>${renderIcon(Play)}`,
                    description: '<p dir="rtl">أكتر من <bdi dir="ltr">+17</bdi> ساعة شرح معمولة مخصوص عشانك! من أول <bdi dir="ltr">cin</bdi> و <bdi dir="ltr">cout</bdi> في الـ <bdi dir="ltr">C++</bdi> لحد الـ <bdi dir="ltr">Data Structures</bdi>. كل حاجة متسجلة هنا.</p>',
                    side: (isMobile ? 'top' : 'right') as 'top' | 'right',
                    align: 'center' as const,
                },
            },
            // Step 4: Sheets
            {
                element: isMobile ? '#mobile-nav-sheets' : '#onboarding-nav-sheets',
                popover: {
                    title: `<span class="align-middle">الشيتات والتدريب</span>${renderIcon(BookOpen)}`,
                    description: `
                        <p style="margin-bottom:8px; direction:rtl;">هنا الشغل بجد! متقسمين ٣ ليفلات:</p>
                        <ul style="list-style:none;padding:0;margin:0 0 8px 0;font-size:13px;line-height:1.9;direction:rtl;">
                            <li>🟢 <strong><bdi dir="ltr">Level 0</bdi></strong> — أساسيات اللغة والسينتاكس.</li>
                            <li>🟡 <strong><bdi dir="ltr">Level 1</bdi></strong> — بداية الـ <bdi dir="ltr">Problem Solving</bdi> الحقيقي.</li>
                            <li>🔴 <strong><bdi dir="ltr">Level 2</bdi></strong> — المسائل المتقدمة والداتا ستراكتشرز.</li>
                        </ul>
                        <p style="font-size:12px;color:#aaa;direction:rtl;">كل شيت بيمسك توبيك معين، وكل شيت جواه ٢٦ مسألة من <bdi dir="ltr">A</bdi> لـ <bdi dir="ltr">Z</bdi>.</p>
                    `,
                    side: (isMobile ? 'top' : 'right') as 'top' | 'right',
                    align: 'center' as const,
                },
            },
            // Step 5: Leaderboard
            {
                element: isMobile ? '#mobile-nav-leaderboard' : '#onboarding-nav-leaderboard',
                popover: {
                    title: `<span class="align-middle">الروماب والمنافسة</span>${renderIcon(Trophy)}`,
                    description: '<p dir="rtl">من هنا تقدر تتابع الرودماب وتتنافس مع باقي طلاب حورس! شوف مين الأول وحاول تسبقهم.</p>',
                    side: (isMobile ? 'top' : 'right') as 'top' | 'right',
                    align: 'center' as const,
                },
            },
            // Step 6: News
            {
                element: isMobile ? '#mobile-nav-news' : '#onboarding-nav-news',
                popover: {
                    title: `<span class="align-middle">الأخبار والتحديثات</span>${renderIcon(Bell)}`,
                    description: '<p dir="rtl">أخيراً، تابع أخبار التيم من التاب دي عشان ماتفوتكش أي مسابقة أو تحديث مهم. بالتوفيق يا بطل! 🚀</p>',
                    side: (isMobile ? 'top' : 'right') as 'top' | 'right',
                    align: 'center' as const,
                },
            },
        ];

        const driverInstance = driver({
            showProgress: true,
            animate: true,
            overlayColor: 'rgba(0, 0, 0, 0.75)',
            stagePadding: 10,
            stageRadius: 10,
            allowClose: true,
            doneBtnText: 'يلا نبدأ!',
            nextBtnText: '&larr; التالي',
            prevBtnText: 'السابق &rarr;',
            progressText: '{{current}} من {{total}}',
            popoverClass: 'icpchue-dashboard-tour-popover',
            steps,
            onDestroyed: () => {
                markCompleted();
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

    return (
        <style jsx global>{`
            .icpchue-dashboard-tour-popover {
                direction: rtl !important;
                text-align: right !important;
                font-family: 'Segoe UI', Tahoma, 'Cairo', 'Noto Sans Arabic', sans-serif !important;
            }
            .icpchue-dashboard-tour-popover .driver-popover-title {
                direction: rtl !important;
                text-align: right !important;
                display: flex !important;
                flex-direction: row-reverse !important;
                align-items: center !important;
                justify-content: flex-end !important;
                gap: 4px !important;
            }
            .icpchue-dashboard-tour-popover .driver-popover-description {
                direction: rtl !important;
                text-align: right !important;
                line-height: 1.8 !important;
                font-size: 14px !important;
            }
            .icpchue-dashboard-tour-popover .driver-popover-description ul {
                direction: rtl !important;
                text-align: right !important;
            }
            .icpchue-dashboard-tour-popover .driver-popover-footer {
                direction: rtl !important;
            }
            .icpchue-dashboard-tour-popover .driver-popover-navigation-btns {
                direction: rtl !important;
            }
        `}</style>
    );
}

export function resetDashboardOnboarding() {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
}
