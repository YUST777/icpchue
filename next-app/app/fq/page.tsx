import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
    ArrowLeft,
    ArrowUpLeft,
    Check,
    ChevronDown,
    Code2,
    GraduationCap,
    Lightbulb,
    MessageCircleQuestion,
    Sparkles,
    Trophy,
    Users,
} from 'lucide-react';

export const metadata: Metadata = {
    title: 'كل اللي محتاج تعرفه عن ICPC HUE',
    description: 'إجابات بسيطة على أهم الأسئلة عن ICPC HUE والـ Competitive Programming في جامعة حورس.',
    alternates: { canonical: 'https://icpchue.com/fq' },
    openGraph: {
        title: 'كل اللي محتاج تعرفه عن ICPC HUE',
        description: 'هل لازم تكون محترف؟ هل لازم تكون مجهز تيم؟ اعرف كل التفاصيل.',
        url: 'https://icpchue.com/fq',
        type: 'article',
    },
};

const faqItems = [
    {
        icon: GraduationCap,
        question: 'إيه هي مسابقة ICPC؟',
        answer: (
            <>
                الـ <strong>ICPC</strong> اختصار لـ <strong>International Collegiate Programming Contest</strong>، وهي واحدة من أكبر مسابقات البرمجة التنافسية على مستوى العالم.
                <p className="mt-4">المسابقة بتمر بأكتر من مرحلة:</p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                    <li><span className="faq-pill">ECPC</span> التصفيات على مستوى مصر.</li>
                    <li><span className="faq-pill">ACPC</span> التصفيات العربية والأفريقية.</li>
                    <li><span className="faq-pill">World Finals</span> النهائيات العالمية.</li>
                </ul>
                <p className="mt-4">يعني لو كملت في المراحل، ممكن توصل إنك تنافس فرق من جامعات في دول مختلفة حول العالم.</p>
            </>
        ),
    },
    {
        icon: Code2,
        question: 'المسابقة بتعتمد على إيه؟',
        answer: (
            <>
                بكل بساطة، الأساس هو الـ <strong>Problem Solving</strong>: إنك تفهم المشكلة، تحللها، توصل لحل صح وفعّال، وتحول الحل ده لكود.
                <p className="mt-4">وعشان تتطور، هتتدرب على:</p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {['Algorithms', 'Data Structures', 'Graphs و Trees', 'كتابة الكود بسرعة ودقة', 'العمل ضمن فريق', 'التفكير تحت ضغط الوقت'].map((item) => (
                        <li key={item} className="flex items-center gap-2"><Check size={15} className="shrink-0 text-[#E8C15A]" />{item}</li>
                    ))}
                </ul>
            </>
        ),
    },
    {
        icon: Lightbulb,
        question: 'ممكن مثال على الأسئلة؟',
        answer: (
            <>
                ده كان سؤال فعلًا في <strong>ECPC 2026</strong> — آه، المسابقة كانت من 3 أيام حرفيًا 😂
                <div className="my-5 rounded-2xl border border-[#E8C15A]/20 bg-[#E8C15A]/[0.06] p-4 sm:p-5">
                    <p className="mb-2 text-sm font-black text-[#E8C15A]">ماشا والدب 🐻</p>
                    <p>وآه، أسماء الأسئلة أحيانًا بتكون عبيطة شوية.</p>
                    <p className="mt-3">ماشا عايزة تشتري شوكولاتة من سوبر ماركت، بس السوبر ماركت ده غريب شوية. لو سعر الشوكولاتة في اليوم الأول كان جنيه واحد، كل يوم السعر بيزيد 10 جنيه؛ يعني في اليوم اللي بعده هيبقى 11 جنيه.</p>
                    <p className="mt-3 font-bold text-white">المطلوب: تعمل كود يحسب سعر الشوكولاتة في اليوم المطلوب.</p>
                </div>
                <p>المسألة شكلها بسيط، لكن المسابقة بتختبر قدرتك على فهم التفاصيل والتعامل مع كل الحالات وكتابة حل صح. وعلى فكرة، لما بتحل سؤال في المسابقة بتاخد بلونة… آه، بلونة فعلًا 🎈</p>
            </>
        ),
    },
    {
        icon: Trophy,
        question: 'هستفاد إيه من المشاركة؟',
        answer: (
            <>
                شركات كبيرة زي <strong>Noon</strong> وغيرها بتقدّر جدًا الناس اللي شاركت في مسابقات الـ Competitive Programming، لأنك بتتدرب على مهارات مطلوبة في أي Interview محترم في شركات التكنولوجيا.
                <p className="mt-4">غالبًا هتقابل جزء خاص بالـ Problem Solving والـ Data Structures والـ Algorithms، ويطلبوا منك تفهم المسألة، تختار الحل المناسب، تكتب الكود وتشرح ليه الحل صح وفعّال.</p>
                <p className="mt-4">وإن شاء الله في يوم الـ Orientation هنحاول نجيب باشمهندس شارك وتأهل في ICPC أكتر من مرة، وبعدها اشتغل في <strong>Microsoft</strong>، عشان يحكيلكم بنفسه إزاي الـ Problem Solving ساعده في مشواره.</p>
                <p className="mt-4">وآه، فيه AI دلوقتي، لكن قدرتك على التفكير وتحليل المشاكل لسه من أهم المهارات المطلوبة لأي مبرمج.</p>
            </>
        ),
    },
    {
        icon: Sparkles,
        question: 'هل لازم تكون عندك خبرة؟',
        answer: <p><strong>لا، خالص.</strong> تقدر تبدأ معانا من الصفر، حتى لو لسه ما كتبتش كود قبل كده، أو دخلت الكلية قريب، أو مش عارف أي حد في الـ Community. إحنا هنبدأ معاك خطوة بخطوة.</p>,
    },
    {
        icon: Users,
        question: 'هل لازم أكون مجهز تيم؟',
        answer: <p>برضه <strong>لا</strong>. عادي جدًا تدخل لوحدك، وإحنا مع الوقت هنساعدكم في تكوين التيمات. كل تيم في المسابقة بيتكون من <strong>3 أفراد</strong>، فمتقلقش لو لسه مش عارف هتدخل مع مين.</p>,
    },
    {
        icon: MessageCircleQuestion,
        question: 'هل الانضمام بفلوس؟',
        answer: <p><strong>لا، الانضمام مجاني بالكامل.</strong> الـ Community قائم على فكرة: <em>طلاب بيساعدوا طلاب… وجيل بيسلّم جيل.</em> التدريب بيقدمه طلاب عندهم خبرة في المسابقات، أو Rank قوي على Codeforces، أو سبق وشاركوا في سيزون كامل.</p>,
    },
    {
        icon: Code2,
        question: 'هل التدريب عبارة عن محاضرات ومواد زيادة؟',
        answer: <p>لا، إحنا مش جايين نزود عليكم مواد وسكاشن 😭 التدريب بيكون موجه للتوبيكس والمهارات اللي هتحتاجها فعلًا في المسابقة، مع حل مسائل وتطبيق عملي بشكل مستمر. هتكتب كود، تحل، تغلط، تفهم غلطك، وتجرب تاني لحد ما مستواك يتحسن.</p>,
    },
    {
        icon: GraduationCap,
        question: 'مين بيدعم الـ Community؟',
        answer: <p>الـ Community بيحصل على دعم من إدارة الكلية وأعضاء هيئة التدريس، بالإضافة إلى الطلاب المشاركين والمنظمين. والموضوع مش حاجة غريبة أو جديدة؛ مجتمعات ICPC موجودة في جامعات كتير جدًا داخل مصر وخارجها، ودي أول خطوة لينا عشان نبني Community قوية داخل جامعة حورس.</p>,
    },
];

const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: {
            '@type': 'Answer',
            text: question === 'إيه هي مسابقة ICPC؟'
                ? 'ICPC اختصار لـ International Collegiate Programming Contest، وهي واحدة من أكبر مسابقات البرمجة التنافسية على مستوى العالم. تمر بمراحل ECPC ثم ACPC ثم النهائيات العالمية.'
                : 'اعرف الإجابة كاملة على صفحة الأسئلة الشائعة في ICPC HUE.',
        },
    })),
};

export default function FrequentlyAskedQuestions() {
    return (
        <main dir="rtl" className="min-h-screen overflow-hidden bg-[#070707] text-white selection:bg-[#E8C15A] selection:text-black">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

            <div className="pointer-events-none fixed inset-0 -z-0 opacity-70" aria-hidden="true">
                <div className="absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-[#E8C15A]/10 blur-[120px]" />
                <div className="absolute -bottom-40 -left-40 h-[24rem] w-[24rem] rounded-full bg-amber-700/10 blur-[120px]" />
                <div className="faq-grid absolute inset-0 opacity-40" />
            </div>

            <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 pb-5 pt-6 sm:px-8 sm:pt-8">
                <Link href="/" className="group flex items-center gap-3" aria-label="العودة إلى الصفحة الرئيسية">
                    <Image src="/icons/icpchue.svg" alt="ICPC HUE" width={42} height={42} priority className="h-10 w-10 transition-transform group-hover:scale-105" />
                    <span className="text-right leading-none">
                        <span className="block text-base font-black tracking-tight text-white">ICPC HUE</span>
                        <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.22em] text-white/35">Community</span>
                    </span>
                </Link>
                <Link href="/joinnow" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-white/75 transition hover:border-[#E8C15A]/40 hover:bg-[#E8C15A]/10 hover:text-[#E8C15A]">
                    انضم للمجتمع <ArrowLeft size={15} />
                </Link>
            </header>

            <section className="relative z-10 mx-auto max-w-4xl px-5 pb-12 pt-12 text-center sm:px-8 sm:pb-16 sm:pt-20">
                <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[#E8C15A]/20 bg-[#E8C15A]/[0.08] px-3.5 py-2 text-[11px] font-bold text-[#E8C15A]">
                    <Sparkles size={14} /> أسئلة بتتكرر كتير
                </div>
                <h1 className="text-4xl font-black leading-[1.15] tracking-tight text-white sm:text-6xl">كل اللي محتاج تعرفه عن <span className="text-[#E8C15A]">ICPC HUE</span></h1>
                <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/55 sm:text-lg">إيه هي مسابقة ICPC؟ هل لازم أكون محترف؟ هل لازم أكون مجهز تيم؟ والأهم… أنا هستفاد إيه من كل ده؟ تعالوا نجاوب على كل حاجة واحدة واحدة.</p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold text-white/35">
                    <span className="rounded-full border border-white/10 px-3 py-2">ECPC</span>
                    <ArrowLeft size={13} className="text-[#E8C15A]" />
                    <span className="rounded-full border border-white/10 px-3 py-2">ACPC</span>
                    <ArrowLeft size={13} className="text-[#E8C15A]" />
                    <span className="rounded-full border border-white/10 px-3 py-2">World Finals</span>
                </div>
            </section>

            <section className="relative z-10 mx-auto max-w-3xl px-5 pb-20 sm:px-8 sm:pb-28" aria-label="الأسئلة الشائعة">
                <div className="space-y-3">
                    {faqItems.map(({ icon: Icon, question, answer }, index) => (
                        <details key={question} className="faq-item group overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.035] transition-colors open:border-[#E8C15A]/30 open:bg-white/[0.05]" open={index === 0}>
                            <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-5 text-right outline-none transition hover:bg-white/[0.03] sm:px-6">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E8C15A]/15 bg-[#E8C15A]/[0.08] text-[#E8C15A]"><Icon size={19} /></span>
                                <span className="flex-1 text-base font-extrabold text-white sm:text-lg">{question}</span>
                                <ChevronDown className="faq-chevron shrink-0 text-white/35 transition-transform duration-300" size={20} />
                            </summary>
                            <div className="border-t border-white/[0.07] px-5 pb-6 pt-5 text-sm leading-8 text-white/65 sm:px-6 sm:text-[15px]">{answer}</div>
                        </details>
                    ))}
                </div>

                <div className="mt-8 rounded-3xl border border-[#E8C15A]/20 bg-gradient-to-br from-[#E8C15A]/[0.12] via-white/[0.04] to-transparent p-6 sm:mt-10 sm:p-8">
                    <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="mb-2 text-xs font-bold text-[#E8C15A]">جاهز تبدأ؟</p>
                            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">كل اللي محتاجه إنك تبدأ.</h2>
                            <p className="mt-2 text-sm leading-7 text-white/50">مش لازم تكون محترف، ومش لازم تكون مجهز تيم. إحنا هنكمل معاك الطريق.</p>
                        </div>
                        <Link href="/joinnow" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#E8C15A] px-5 py-3.5 text-sm font-black text-black shadow-lg shadow-[#E8C15A]/10 transition hover:bg-white">
                            انضم لـ ICPC HUE <ArrowUpLeft size={18} />
                        </Link>
                    </div>
                </div>

                <p className="mt-10 text-center text-xs font-bold tracking-wide text-white/25">ICPC HUE — جيل بيسلّم جيل 💛</p>
            </section>

            <style>{`
                .faq-grid {
                    background-image: linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
                    background-size: 42px 42px;
                    mask-image: linear-gradient(to bottom, black, transparent 75%);
                }
                .faq-item summary::-webkit-details-marker { display: none; }
                .faq-item[open] .faq-chevron { transform: rotate(180deg); color: #E8C15A; }
                .faq-item summary:focus-visible { box-shadow: inset 0 0 0 2px rgba(232,193,90,.5); }
                .faq-pill { display: inline-flex; align-items: center; border: 1px solid rgba(232,193,90,.2); border-radius: 999px; padding: .1rem .5rem; margin-left: .35rem; color: #E8C15A; font-size: .72rem; font-weight: 800; direction: ltr; }
            `}</style>
        </main>
    );
}
