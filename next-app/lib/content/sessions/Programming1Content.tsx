import { FileText } from 'lucide-react';

export function FullRevisionContent() {
    return (
        <div className="space-y-6 text-white/90">
            <section className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                <h3 className="text-xl font-bold mb-4 text-white">Session Overview</h3>
                <p className="text-white/70 mb-6">
                    This session covers a complete revision of the Programming 1 curriculum, including key concepts, problem-solving strategies, and preparation for the final exam.
                </p>

                <div className="bg-black/30 rounded-xl p-6 border border-white/5">
                    <h4 className="text-[#d59928] font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="bg-[#d59928] text-black w-6 h-6 rounded flex items-center justify-center text-xs">T</span>
                        Video Timeline
                    </h4>
                    <div className="space-y-3 font-mono text-sm">
                        <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded transition-colors group">
                            <span className="text-white/80 group-hover:text-white">Iostream</span>
                            <span className="text-[#d59928]">01:51</span>
                        </div>
                        <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded transition-colors group">
                            <span className="text-white/80 group-hover:text-white">if/else & Return & Switch</span>
                            <span className="text-[#d59928]">17:21</span>
                        </div>
                        <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded transition-colors group">
                            <span className="text-white/80 group-hover:text-white">Arrays & Loops</span>
                            <span className="text-[#d59928]">29:23</span>
                        </div>
                        <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded transition-colors group">
                            <span className="text-white/80 group-hover:text-white">Continue/break & 2D Array & Nested For</span>
                            <span className="text-[#d59928]">40:48</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export function ExamTrainingContent() {
    return (
        <div className="space-y-6 text-white/90">
            <section className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                <h3 className="text-xl font-bold mb-4 text-white">Session Overview</h3>
                <p className="text-white/70">
                    This is the recording of the live exam training session. Watch the video to review the problems and solutions discussed during the class.
                </p>
            </section>

            <section className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                    <FileText className="w-6 h-6 text-[#d59928]" />
                    Session Materials
                </h3>
                <div className="grid gap-4">
                    <a
                        href="/images/lessons/pro1/Revision%20Questions.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#d59928]/10 rounded-lg group-hover:bg-[#d59928]/20 transition-colors">
                                <FileText className="w-5 h-5 text-[#d59928]" />
                            </div>
                            <div>
                                <div className="font-medium text-white group-hover:text-[#d59928] transition-colors">Revision Questions</div>
                                <div className="text-xs text-white/40">PDF Document</div>
                            </div>
                        </div>
                    </a>
                </div>
            </section>
        </div>
    );
}
