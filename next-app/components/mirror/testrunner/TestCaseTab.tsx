import { useState } from 'react';
import {
    CheckCircle2,
    XCircle,
    Play,
    Plus,
    Edit2,
    Save,
    X
} from 'lucide-react';
import { SubmissionResult, Example, customTestCaseSchema } from '../types';

interface TestCaseTabProps {
    testCases: Example[];
    selectedTestCase: number;
    setSelectedTestCase: (index: number) => void;
    result: SubmissionResult | null;
    onAddTestCase?: (testCase: Example) => void;
    onDeleteTestCase?: (index: number) => void;
    onUpdateTestCase?: (index: number, testCase: Example) => void;
    sampleTestCasesCount: number;
}

export default function TestCaseTab({
    testCases,
    selectedTestCase,
    setSelectedTestCase,
    result,
    onAddTestCase,
    onDeleteTestCase,
    onUpdateTestCase,
    sampleTestCasesCount
}: TestCaseTabProps) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [formInput, setFormInput] = useState('');
    const [formOutput, setFormOutput] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    const handleAddTestCase = () => {
        setFormError(null);
        const validationResult = customTestCaseSchema.safeParse({
            input: formInput,
            output: formOutput
        });
        if (!validationResult.success) {
            setFormError(validationResult.error.issues[0]?.message || 'Invalid input');
            return;
        }
        const newTestCase: Example = {
            input: formInput.trim(),
            output: formOutput.trim(),
            expectedOutput: formOutput.trim(),
            isCustom: true
        };
        onAddTestCase?.(newTestCase);
        setFormInput('');
        setFormOutput('');
        setShowAddForm(false);
    };

    const handleUpdateTestCase = () => {
        if (editingIndex === null) return;
        setFormError(null);
        const validationResult = customTestCaseSchema.safeParse({
            input: formInput,
            output: formOutput
        });
        if (!validationResult.success) {
            setFormError(validationResult.error.issues[0]?.message || 'Invalid input');
            return;
        }
        const updatedTestCase: Example = {
            input: formInput.trim(),
            output: formOutput.trim(),
            expectedOutput: formOutput.trim(),
            isCustom: true
        };
        onUpdateTestCase?.(editingIndex, updatedTestCase);
        setFormInput('');
        setFormOutput('');
        setEditingIndex(null);
    };

    const startEditing = (index: number) => {
        const tc = testCases[index];
        setFormInput(tc.input);
        setFormOutput(tc.output || tc.expectedOutput || '');
        setEditingIndex(index);
        setShowAddForm(false);
        setFormError(null);
    };

    const cancelEditing = () => {
        setEditingIndex(null);
        setShowAddForm(false);
        setFormInput('');
        setFormOutput('');
        setFormError(null);
    };

    const isCustomTestCase = (index: number) => {
        return index >= sampleTestCasesCount || testCases[index]?.isCustom;
    };

    return (
        <>
            {/* Case Tabs with Add Button */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
                {testCases.map((tc, index) => (
                    <div key={index} className="relative group">
                        <button
                            onClick={() => {
                                setSelectedTestCase(index);
                                cancelEditing();
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${selectedTestCase === index
                                ? 'bg-[#2d2d2d] text-white shadow-sm'
                                : 'text-[#666] hover:text-[#A0A0A0] hover:bg-[#2d2d2d]/50'
                                } ${tc.isCustom ? 'pr-7' : ''}`}
                        >
                            {result && result.results[index] && (
                                result.results[index].passed
                                    ? <CheckCircle2 size={12} className="text-green-400" />
                                    : <XCircle size={12} className="text-red-400" />
                            )}
                            {tc.isCustom && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Custom test case" />}
                            Case {index + 1}
                        </button>
                        {isCustomTestCase(index) && onDeleteTestCase && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('Delete this test case?')) {
                                        onDeleteTestCase(index);
                                        if (selectedTestCase >= testCases.length - 1) {
                                            setSelectedTestCase(Math.max(0, testCases.length - 2));
                                        }
                                    }
                                }}
                                className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                title="Delete test case"
                            >
                                <X size={10} />
                            </button>
                        )}
                    </div>
                ))}

                {onAddTestCase && (
                    <button
                        onClick={() => {
                            setShowAddForm(true);
                            setEditingIndex(null);
                            setFormInput('');
                            setFormOutput('');
                            setFormError(null);
                        }}
                        className="px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 text-[#E8C15A] hover:bg-[#E8C15A]/10 border border-dashed border-[#E8C15A]/30 hover:border-[#E8C15A]/50"
                    >
                        <Plus size={12} />
                        Add
                    </button>
                )}
            </div>

            {/* Add/Edit Form */}
            {(showAddForm || editingIndex !== null) && (
                <div className="bg-[#252526] rounded-xl p-4 border border-white/10 space-y-4 animate-fade-in flex flex-col min-h-0">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-white">
                            {editingIndex !== null ? `Edit Test Case ${editingIndex + 1}` : 'Add Custom Test Case'}
                        </h3>
                        <button
                            onClick={cancelEditing}
                            className="p-1 text-[#666] hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {formError && (
                        <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                            {formError}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 flex-1 min-h-0">
                        <div className="flex flex-col min-h-0">
                            <label className="text-[10px] md:text-xs font-medium text-[#888] mb-1.5 md:mb-2 block uppercase tracking-wider">
                                Input <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                value={formInput}
                                onChange={(e) => setFormInput(e.target.value)}
                                placeholder="Enter test input..."
                                className="w-full h-40 bg-[#1e1e1e] border border-white/10 rounded-lg p-2.5 md:p-3 text-xs md:text-sm font-mono text-[#d4d4d4] placeholder-[#555] focus:outline-none focus:border-[#E8C15A]/50 resize-none scrollbar-thin scrollbar-thumb-white/10"
                            />
                        </div>
                        <div className="flex flex-col min-h-0">
                            <label className="text-[10px] md:text-xs font-medium text-[#888] mb-1.5 md:mb-2 block uppercase tracking-wider">
                                Expected Output <span className="text-[#555]">(optional)</span>
                            </label>
                            <textarea
                                value={formOutput}
                                onChange={(e) => setFormOutput(e.target.value)}
                                placeholder="Enter expected output..."
                                className="w-full h-40 bg-[#1e1e1e] border border-white/10 rounded-lg p-2.5 md:p-3 text-xs md:text-sm font-mono text-[#d4d4d4] placeholder-[#555] focus:outline-none focus:border-[#E8C15A]/50 resize-none scrollbar-thin scrollbar-thumb-white/10"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={cancelEditing}
                            className="px-4 py-2 text-xs font-medium text-[#888] hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={editingIndex !== null ? handleUpdateTestCase : handleAddTestCase}
                            className="px-4 py-2 bg-[#E8C15A] hover:bg-[#059669] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Save size={14} />
                            {editingIndex !== null ? 'Update' : 'Add Test Case'}
                        </button>
                    </div>
                </div>
            )}

            {/* Selected Test Case Details */}
            {!showAddForm && editingIndex === null && testCases[selectedTestCase] && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 flex-1 min-h-0">
                    <div className="flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-1.5 md:mb-2">
                            <label className="text-[10px] md:text-xs font-medium text-[#888] uppercase tracking-wider">Input</label>
                            {isCustomTestCase(selectedTestCase) && onUpdateTestCase && (
                                <button
                                    onClick={() => startEditing(selectedTestCase)}
                                    className="p-1 text-[#666] hover:text-[#E8C15A] transition-colors"
                                    title="Edit test case"
                                >
                                    <Edit2 size={12} />
                                </button>
                            )}
                        </div>
                        <div className="bg-[#2d2d2d] rounded-lg p-2.5 md:p-3 border border-white/5 font-mono text-xs md:text-sm text-[#d4d4d4] whitespace-pre-wrap leading-relaxed shadow-inner overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 h-48">
                            {testCases[selectedTestCase].input || <span className="italic text-[#555]">Empty input</span>}
                        </div>
                    </div>
                    <div className="flex flex-col min-h-0">
                        <label className="text-[10px] md:text-xs font-medium text-[#888] mb-1.5 md:mb-2 block uppercase tracking-wider">Expected Output</label>
                        <div className="bg-[#2d2d2d] rounded-lg p-2.5 md:p-3 border border-white/5 font-mono text-xs md:text-sm text-[#d4d4d4] whitespace-pre-wrap leading-relaxed shadow-inner overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 h-48">
                            {testCases[selectedTestCase].output || testCases[selectedTestCase].expectedOutput || <span className="italic text-[#555]">No expected output</span>}
                        </div>
                    </div>

                    {/* Actual Output */}
                    <div className="flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-1.5 md:mb-2">
                            <label className="text-[10px] md:text-xs font-medium text-[#888] block uppercase tracking-wider">Actual Output</label>
                            {result && result.results[selectedTestCase] && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${result.results[selectedTestCase].passed ? 'bg-[#E8C15A]/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {result.results[selectedTestCase].verdict}
                                </span>
                            )}
                        </div>
                        <div className={`bg-[#2d2d2d] rounded-lg p-2.5 md:p-3 border font-mono text-xs md:text-sm whitespace-pre-wrap leading-relaxed shadow-inner overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 h-48 ${result && result.results[selectedTestCase]
                            ? result.results[selectedTestCase].passed
                                ? 'border-[#E8C15A]/20 text-[#d4d4d4]'
                                : 'border-red-500/20 text-red-300'
                            : 'border-white/5 text-[#666]'
                            }`}>
                            {result && result.results[selectedTestCase]
                                ? (result.results[selectedTestCase].output || <span className="italic opacity-50">No output</span>)
                                : <span className="italic opacity-30">Run code to see output</span>
                            }
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {testCases.length === 0 && !showAddForm && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <Play size={28} className="text-[#444]" />
                    </div>
                    <p className="text-[#666] text-sm mb-4">No test cases available</p>
                    {onAddTestCase && (
                        <button
                            onClick={() => {
                                setShowAddForm(true);
                                setFormInput('');
                                setFormOutput('');
                            }}
                            className="px-4 py-2 text-xs font-medium rounded-lg flex items-center gap-2 text-[#E8C15A] hover:bg-[#E8C15A]/10 border border-[#E8C15A]/30"
                        >
                            <Plus size={14} />
                            Add Custom Test Case
                        </button>
                    )}
                </div>
            )}
        </>
    );
}
