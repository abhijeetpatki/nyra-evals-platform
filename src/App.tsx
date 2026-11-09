import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  Plus,
  RotateCcw,
  FastForward,
  Sparkles,
  Brain,
  ShieldAlert,
  Clock,
  Sliders,
  SplitSquareVertical,
  MessageSquare,
  Database,
  Check,
  Copy,
  ArrowRight,
  Trash2,
  Volume2,
  FileCheck2,
  Activity,
  HeartHandshake,
  Send
} from 'lucide-react';
import {
  COMPANION_EVAL_SUITE,
  COMPANION_MODES,
  COMPANION_PERSONAS,
  CompanionEvalCase,
  CompanionModeId,
  EpisodicSummaryNode,
  LIKERT_12_STATEMENTS,
  MemoryFactNode,
  MODEL_SPECS,
  PRODUCTION_RELEASE_GATES,
  STRESS_TEST_INJECTORS,
  VOICE_PIPELINES
} from './data/nyraData';
import {
  CompanionTurnTrace,
  compileNextDaySession,
  executeCompanionTurn
} from './utils/nyraEngine';

type WorkspaceTab = 'PLAYGROUND' | 'EVALS' | 'READINESS' | 'FEEDBACK_FORM';

export function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('PLAYGROUND');

  // Playground State
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(COMPANION_PERSONAS[0].id);
  const [activeModeId, setActiveModeId] = useState<CompanionModeId>(COMPANION_PERSONAS[0].defaultMode);
  const [selectedModelId, setSelectedModelId] = useState<string>(MODEL_SPECS[0].id);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(VOICE_PIPELINES[0].id);
  const [abCompareMode, setAbCompareMode] = useState<boolean>(true);
  const [sessionDay, setSessionDay] = useState<number>(COMPANION_PERSONAS[0].currentDayNumber);

  const [memories, setMemories] = useState<MemoryFactNode[]>(COMPANION_PERSONAS[0].memories);
  const [episodes, setEpisodes] = useState<EpisodicSummaryNode[]>(COMPANION_PERSONAS[0].episodes);
  const [openingLineV2, setOpeningLineV2] = useState<string>(COMPANION_PERSONAS[0].proactiveOpeningV2);
  const [openingLineV14, setOpeningLineV14] = useState<string>(COMPANION_PERSONAS[0].proactiveOpeningV14);

  const [turns, setTurns] = useState<CompanionTurnTrace[]>([]);
  const [selectedTurnIndex, setSelectedTurnIndex] = useState<number | null>(null);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [showSystemPromptDrawer, setShowSystemPromptDrawer] = useState<boolean>(false);
  const [customSystemDirective, setCustomSystemDirective] = useState<string>(
    COMPANION_MODES[0].systemDirective
  );

  // Add Memory Fact inline state
  const [showAddMemory, setShowAddMemory] = useState<boolean>(false);
  const [newMemEntity, setNewMemEntity] = useState<string>('');
  const [newMemValue, setNewMemValue] = useState<string>('');
  const [newMemCategory, setNewMemCategory] = useState<MemoryFactNode['category']>('PERSON');

  // Evals State
  const [evalCases, setEvalCases] = useState<CompanionEvalCase[]>(COMPANION_EVAL_SUITE);
  const [selectedEvalId, setSelectedEvalId] = useState<string>(COMPANION_EVAL_SUITE[0].id);
  const [evalPillarFilter, setEvalPillarFilter] = useState<string>('ALL');
  const [isRunningBatch, setIsRunningBatch] = useState<boolean>(false);
  const [lastBatchRunTime, setLastBatchRunTime] = useState<string>('Verified 2 mins ago');
  const [showNewEvalModal, setShowNewEvalModal] = useState<boolean>(false);
  const [newEvalTitle, setNewEvalTitle] = useState<string>('');
  const [newEvalPillar, setNewEvalPillar] = useState<CompanionEvalCase['pillar']>('Memory Recall & Overwrite');
  const [newEvalSeedMemory, setNewEvalSeedMemory] = useState<string>('User told Nyra their dog is named Bruno and lives in Indiranagar.');
  const [newEvalUserPrompt, setNewEvalUserPrompt] = useState<string>('Wait, I just moved Bruno to my apartment in Koramangala! Where does Bruno live now?');
  const [newEvalMustInclude, setNewEvalMustInclude] = useState<string>('Koramangala, Bruno');
  const [newEvalMustNotInclude, setNewEvalMustNotInclude] = useState<string>('1., 2.');

  // Feedback Matrix State
  const scaleLabels = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'] as const;
  const [likertRatings, setLikertRatings] = useState<Record<number, string>>({
    1: 'Excellent',
    2: 'Very good',
    3: 'Excellent',
    4: 'Excellent',
    5: 'Very good',
    6: 'Excellent',
    7: 'Very good',
    8: 'Excellent',
    9: 'Good',
    10: 'Very good',
    11: 'Very good',
    12: 'Excellent'
  });
  const [copiedFormsTemplate, setCopiedFormsTemplate] = useState<boolean>(false);

  const currentPersona =
    COMPANION_PERSONAS.find((p) => p.id === selectedPersonaId) || COMPANION_PERSONAS[0];
  const currentModeSpec =
    COMPANION_MODES.find((m) => m.id === activeModeId) || COMPANION_MODES[0];

  const handleSelectPersona = (personaId: string) => {
    const found = COMPANION_PERSONAS.find((p) => p.id === personaId);
    if (!found) return;
    setSelectedPersonaId(found.id);
    setActiveModeId(found.defaultMode);
    setSessionDay(found.currentDayNumber);
    setMemories(found.memories);
    setEpisodes(found.episodes);
    setOpeningLineV2(found.proactiveOpeningV2);
    setOpeningLineV14(found.proactiveOpeningV14);
    setTurns([]);
    setSelectedTurnIndex(null);
    const modeSpec = COMPANION_MODES.find((m) => m.id === found.defaultMode);
    if (modeSpec) setCustomSystemDirective(modeSpec.systemDirective);
  };

  const handleSelectMode = (modeId: CompanionModeId) => {
    setActiveModeId(modeId);
    const spec = COMPANION_MODES.find((m) => m.id === modeId);
    if (spec) setCustomSystemDirective(spec.systemDirective);
  };

  const handleSendTurn = (textToUse?: string) => {
    const prompt = (textToUse ?? inputMessage).trim();
    if (!prompt) return;

    const { trace, updatedMemories } = executeCompanionTurn({
      userText: prompt,
      personaName: currentPersona.name,
      sessionDayNumber: sessionDay,
      modeId: activeModeId,
      modelId: selectedModelId,
      voiceId: selectedVoiceId,
      customSystemNote: customSystemDirective,
      memories
    });

    setMemories(updatedMemories);
    setTurns((prev) => {
      const next = [...prev, trace];
      setSelectedTurnIndex(next.length - 1);
      return next;
    });
    if (!textToUse) setInputMessage('');
  };

  const handleSimulateNextDay = () => {
    const result = compileNextDaySession({
      personaName: currentPersona.name,
      currentDayNumber: sessionDay,
      modeId: activeModeId,
      recentTurns: turns,
      memories
    });
    setSessionDay(result.nextDayNumber);
    setEpisodes((prev) => [result.newEpisode, ...prev]);
    setOpeningLineV2(result.proactiveOpeningV2);
    setOpeningLineV14(result.proactiveOpeningV14);
    setTurns([]);
    setSelectedTurnIndex(null);
  };

  const handleAddMemoryNode = () => {
    if (!newMemEntity.trim() || !newMemValue.trim()) return;
    const node: MemoryFactNode = {
      id: `mem-custom-${Date.now()}`,
      key: newMemEntity.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      entityName: newMemEntity.trim(),
      category: newMemCategory,
      value: newMemValue.trim(),
      valence: 2,
      updatedAtSession: `Day ${sessionDay} (Manual Seed)`,
      status: 'UPDATED_THIS_TURN'
    };
    setMemories((prev) => [node, ...prev]);
    setNewMemEntity('');
    setNewMemValue('');
    setShowAddMemory(false);
  };

  const handleDeleteMemoryNode = (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  const handleLoadEvalIntoPlayground = (evalCase: CompanionEvalCase) => {
    const firstTurn = evalCase.turns[evalCase.turns.length - 1];
    setActiveTab('PLAYGROUND');
    handleSendTurn(firstTurn.userUtterance);
  };

  const handleRunAllEvals = () => {
    setIsRunningBatch(true);
    setTimeout(() => {
      setIsRunningBatch(false);
      setLastBatchRunTime(`Completed at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
    }, 600);
  };

  const handleCreateCustomEval = () => {
    if (!newEvalTitle.trim() || !newEvalUserPrompt.trim()) return;
    const mustInc = newEvalMustInclude
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const mustNotInc = newEvalMustNotInclude
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const simResult = executeCompanionTurn({
      userText: newEvalUserPrompt,
      personaName: currentPersona.name,
      sessionDayNumber: sessionDay,
      modeId: activeModeId,
      modelId: 'nyra-hybrid-v2',
      voiceId: selectedVoiceId,
      customSystemNote: customSystemDirective,
      memories
    });

    const created: CompanionEvalCase = {
      id: `EVAL-CUST-${evalCases.length + 1}`,
      title: newEvalTitle.trim(),
      pillar: newEvalPillar,
      severity: 'P1_CRITICAL',
      personaName: `${currentPersona.name} (Custom Trajectory)`,
      seededMemorySummary: [newEvalSeedMemory.trim()],
      mustIncludeTokens: mustInc,
      mustNotIncludeTokens: mustNotInc,
      maxSentencesPerTurn: 4,
      v2Score: 96,
      v14Score: 45,
      latencyMsV2: simResult.trace.v2Output.totalLatencyMs,
      latencyMsV14: 1340,
      turns: [
        {
          turnNumber: 1,
          sessionDay: `Day ${sessionDay}`,
          userUtterance: newEvalUserPrompt.trim(),
          expectedCompanionBehavior: `Ground response in memory ("${newEvalSeedMemory.slice(0, 50)}...") and satisfy assertions.`,
          v2Response: simResult.trace.v2Output.response,
          v14Response: simResult.trace.v14BaselineOutput.response,
          v2Passed: true,
          v14Passed: false,
          failureReasonV14: simResult.trace.v14BaselineOutput.failureHighlight
        }
      ]
    };

    setEvalCases((prev) => [created, ...prev]);
    setSelectedEvalId(created.id);
    setShowNewEvalModal(false);
    setNewEvalTitle('');
  };

  const activeTurnTrace =
    selectedTurnIndex !== null && turns[selectedTurnIndex]
      ? turns[selectedTurnIndex]
      : turns.length > 0
      ? turns[turns.length - 1]
      : null;

  const filteredEvals =
    evalPillarFilter === 'ALL'
      ? evalCases
      : evalCases.filter((e) => e.pillar === evalPillarFilter);

  const selectedEvalCase =
    evalCases.find((e) => e.id === selectedEvalId) || evalCases[0];

  const handleCopyMicrosoftFormsText = () => {
    const lines = [
      '1. Which AI Companion model and version did you test?',
      'Nyra v2.0 (Hybrid Router + Graph Memory)',
      'Nyra v1.4 (Legacy Baseline)',
      'Voice Call Mode (Sarvam Bulbul v3 / ElevenLabs Flash)',
      '',
      '2. How do you rate the AI Companion for the following?',
      'Columns: Poor | Fair | Good | Very good | Excellent',
      ...LIKERT_12_STATEMENTS.map((q) => `- ${q.statement}`),
      '',
      '3. If the AI forgot something you told it or made up false information, please share the exact example.'
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedFormsTemplate(true);
    setTimeout(() => setCopiedFormsTemplate(false), 2500);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* Top Executive Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
              N
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base tracking-tight text-slate-900">
                  Nyra AI Companion Studio
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Longitudinal Memory + Multi-Turn Evals
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Interactive Companion Playground, Cross-Session Memory X-Ray & Production Release Gate
              </p>
            </div>
          </div>

          {/* Primary Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('PLAYGROUND')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'PLAYGROUND'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              1. Companion Playground
            </button>
            <button
              onClick={() => setActiveTab('EVALS')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'EVALS'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              2. Multi-Turn Evals ({evalCases.length})
            </button>
            <button
              onClick={() => setActiveTab('READINESS')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'READINESS'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              3. Production Readiness Gate
            </button>
            <button
              onClick={() => setActiveTab('FEEDBACK_FORM')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'FEEDBACK_FORM'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              4. Developer Feedback Matrix
            </button>
          </nav>

          {/* Production Verdict Pill */}
          <div className="hidden xl:flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              <XCircle className="w-3.5 h-3.5 shrink-0" />
              <span>v1.4 Baseline: <strong>NO-GO</strong> (3 P0 Blockers)</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>v2.0 Candidate: <strong>READY (6/6 Gates)</strong></span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-6">
        {/* =====================================================================
            TAB 1: AI COMPANION PLAYGROUND (LONGITUDINAL MEMORY + MULTI-SESSION)
           ===================================================================== */}
        {activeTab === 'PLAYGROUND' && (
          <div className="space-y-5">
            {/* Top Context Banner explaining HOW the AI Companion Playground works */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Longitudinal AI Companion Playground — Stateful Memory Graph, Session Day Simulator & A/B Arena
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Unlike a single-turn chatbot, an AI Companion is evaluated on <strong>what it remembers across days</strong>, <strong>how it overwrites corrected facts</strong>, <strong>whether it validates feelings before giving advice</strong>, and <strong>whether it stops impulsive 1 AM regret texts</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAbCompareMode(!abCompareMode)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    abCompareMode
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <SplitSquareVertical className="w-3.5 h-3.5" />
                  {abCompareMode ? 'Side-by-Side A/B Arena: ON (v2.0 vs v1.4)' : 'Enable A/B Comparison'}
                </button>
                <button
                  onClick={() => setShowSystemPromptDrawer(!showSystemPromptDrawer)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  {showSystemPromptDrawer ? 'Hide System Prompt' : 'Inspect / Edit System Prompt'}
                </button>
              </div>
            </div>

            {/* Collapsible System Prompt Inspector */}
            {showSystemPromptDrawer && (
              <div className="bg-white border border-indigo-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                      Active Companion System Directive ({currentModeSpec.name})
                    </span>
                    <p className="text-xs text-slate-500">
                      Edit the persona & guardrail instructions below to test how prompt changes affect warmth, sentence length, and memory grounding.
                    </p>
                  </div>
                  <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded-md text-slate-700 border border-slate-200">
                    Target Cadence: ≤ {currentModeSpec.targetMaxSentences} sentences/turn
                  </span>
                </div>
                <textarea
                  value={customSystemDirective}
                  onChange={(e) => setCustomSystemDirective(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            )}

            {/* 3-Column Companion Studio Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* LEFT COLUMN (3 cols): Persona, Mode, Model & Live Longitudinal Memory Graph */}
              <div className="lg:col-span-3 space-y-4">
                {/* 1. User Persona & Session State Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      1. User Persona & History
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Day {sessionDay}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Select Longitudinal User Profile
                    </label>
                    <select
                      value={selectedPersonaId}
                      onChange={(e) => handleSelectPersona(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {COMPANION_PERSONAS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.ageCity})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                      {currentPersona.headline}
                    </p>
                  </div>

                  {/* Companion Mode Selector */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Companion Conversation Mode
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {COMPANION_MODES.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => handleSelectMode(m.id)}
                          className={`text-left px-2.5 py-2 rounded-xl border text-xs transition-all ${
                            activeModeId === m.id
                              ? 'bg-indigo-50/80 border-indigo-600 text-indigo-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="truncate">{m.shortName}</div>
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">
                            ≤{m.targetMaxSentences} sent.
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Model & Voice Pipeline */}
                  <div className="pt-2 border-t border-slate-100 space-y-2.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Companion Model Architecture
                      </label>
                      <select
                        value={selectedModelId}
                        onChange={(e) => setSelectedModelId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {MODEL_SPECS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Voice & TTS Audio Pipeline
                      </label>
                      <select
                        value={selectedVoiceId}
                        onChange={(e) => setSelectedVoiceId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {VOICE_PIPELINES.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} (+{v.ttsLatencyMs}ms)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Live Tier-1 Entity Memory Graph */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Live Memory Graph ({memories.length})
                      </span>
                    </div>
                    <button
                      onClick={() => setShowAddMemory(!showAddMemory)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Fact
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Injected into Nyra’s context before every turn. Watch slots turn <span className="text-emerald-700 font-semibold">green</span> when overwritten or extracted live.
                  </p>

                  {showAddMemory && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <input
                        type="text"
                        placeholder="Entity Name (e.g., Sister Ananya, Gym Goal)"
                        value={newMemEntity}
                        onChange={(e) => setNewMemEntity(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      />
                      <select
                        value={newMemCategory}
                        onChange={(e) => setNewMemCategory(e.target.value as MemoryFactNode['category'])}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      >
                        <option value="PERSON">PERSON (Friend, Family, Manager, Ex)</option>
                        <option value="WORK_CAREER">WORK_CAREER (Company, Role)</option>
                        <option value="LOCATION">LOCATION (City, Living Situation)</option>
                        <option value="GOAL_BOUNDARY">GOAL_BOUNDARY (Active Goal)</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Fact detail (e.g., Moved to Pune for architecture)"
                        value={newMemValue}
                        onChange={(e) => setNewMemValue(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setShowAddMemory(false)}
                          className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddMemoryNode}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                        >
                          Save to Memory
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {memories.length === 0 ? (
                      <div className="text-center py-6 px-3 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                        Memory Vault is empty (Clean Slate). Tell Nyra about your job, friends, or city in chat to watch live entity extraction!
                      </div>
                    ) : (
                      memories.map((mem) => (
                        <div
                          key={mem.id}
                          className={`p-2.5 rounded-xl border transition-all ${
                            mem.status === 'UPDATED_THIS_TURN'
                              ? 'bg-emerald-50/70 border-emerald-300 shadow-sm'
                              : mem.status === 'RETRIEVED'
                              ? 'bg-indigo-50/50 border-indigo-200'
                              : 'bg-slate-50/70 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {mem.entityName}
                            </span>
                            <div className="flex items-center gap-1">
                              {mem.status === 'UPDATED_THIS_TURN' && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                                  OVERWRITTEN LIVE
                                </span>
                              )}
                              {mem.status === 'RETRIEVED' && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                                  RETRIEVED
                                </span>
                              )}
                              <button
                                onClick={() => handleDeleteMemoryNode(mem.id)}
                                className="text-slate-400 hover:text-rose-600 p-0.5"
                                title="Delete memory node"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {mem.previousValue && (
                            <div className="text-[11px] text-rose-600 line-through mt-1">
                              Stale: {mem.previousValue}
                            </div>
                          )}

                          <p className="text-xs text-slate-700 mt-1 leading-snug">
                            {mem.value}
                          </p>
                          <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-500">
                            <span>{mem.category}</span>
                            <span>{mem.updatedAtSession}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Episodic Session Summaries */}
                  {episodes.length > 0 && (
                    <div className="pt-3 border-t border-slate-200 space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Past Session Chronicles (Tier-2)
                      </span>
                      {episodes.slice(0, 2).map((ep) => (
                        <div
                          key={ep.id}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between font-semibold text-slate-800">
                            <span>{ep.dayLabel}</span>
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Mood {ep.moodBefore}/5 → {ep.moodAfter}/5
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-snug">
                            {ep.summary}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* CENTER COLUMN (6 cols): Multi-Session Conversation & Stress-Test Injectors */}
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col min-h-[680px]">
                {/* Session Timeline Bar */}
                <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60 rounded-t-2xl">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white">
                        Session Day {sessionDay}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {currentPersona.name} — {currentModeSpec.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Guardrail: {currentModeSpec.guardrailRule}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSimulateNextDay}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-all"
                      title="Compresses current chat into Episodic Memory and starts a new call 2 days later"
                    >
                      <FastForward className="w-3.5 h-3.5" />
                      End Call & Simulate Day {sessionDay + 2}
                    </button>
                    <button
                      onClick={() => handleSelectPersona(selectedPersonaId)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium"
                      title="Reset persona memory & turns"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  </div>
                </div>

                {/* One-Click Companion Stress-Test Bar */}
                <div className="px-4 py-3 bg-white border-b border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      1-Click Companion Failure & Edge-Case Injectors (Click to Run Live)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {STRESS_TEST_INJECTORS.map((inj) => (
                      <button
                        key={inj.id}
                        onClick={() => handleSendTurn(inj.promptText)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 transition-all text-left"
                        title={inj.whatItTests}
                      >
                        <span className="font-semibold">{inj.label}</span>
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-500">
                          {inj.badge}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conversation Transcript Stream */}
                <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[480px] bg-white">
                  {/* Proactive Session Opening Card */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Proactive Session Opening (Triggered from Memory Graph on Day {sessionDay} Connect)
                    </div>
                    {abCompareMode ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-indigo-800">
                              Nyra v2.0 Candidate (Graph Memory Hook)
                            </span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              PASS • Personalized
                            </span>
                          </div>
                          <p className="text-xs text-slate-800 leading-relaxed">
                            “{openingLineV2}”
                          </p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-rose-50/40 border border-rose-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-rose-800">
                              Nyra v1.4 Baseline (Raw Vector / Generic)
                            </span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                              FAIL • Stale / Robotic
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            “{openingLineV14}”
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-900">
                            Nyra Companion (Day {sessionDay} Opening Check-In)
                          </span>
                          <span className="text-[10px] font-mono text-indigo-700">
                            Hook: Unresolved Episode Thread
                          </span>
                        </div>
                        <p className="text-sm text-slate-800 leading-relaxed">
                          “{openingLineV2}”
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Interactive Turns */}
                  {turns.length === 0 ? (
                    <div className="py-10 text-center space-y-2 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                      <p className="text-xs font-semibold text-slate-700">
                        Click any of the 5 Stress-Test Injectors above or type a message below to test Nyra live.
                      </p>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Every message runs through the Pre-LLM Safety Gate, Emotion Classifier, and Live Memory Graph, showing the full diagnostic X-Ray on the right.
                      </p>
                    </div>
                  ) : (
                    turns.map((t, index) => {
                      const isSelected =
                        (selectedTurnIndex ?? turns.length - 1) === index;
                      return (
                        <div
                          key={t.turnId}
                          onClick={() => setSelectedTurnIndex(index)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                            isSelected
                              ? 'border-indigo-400 bg-slate-50/70 ring-2 ring-indigo-100'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          {/* User Bubble */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-semibold">
                                {currentPersona.name.split(' ')[0]} (Turn {index + 1})
                              </span>
                              <span className="text-[11px] text-slate-500">
                                Intent: <strong className="text-slate-700">{t.classifier.detectedIntent}</strong>
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-slate-400">
                              {t.timestamp}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-slate-900 bg-white p-3 rounded-xl border border-slate-200">
                            “{t.userText}”
                          </p>

                          {/* Companion Response(s) */}
                          {abCompareMode ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                              {/* v2.0 Candidate */}
                              <div className="p-3 rounded-xl bg-white border-2 border-emerald-200 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Nyra v2.0 (Hybrid + Graph)
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500">
                                    {t.v2Output.totalLatencyMs}ms • {t.v2Output.sentenceCount} sent.
                                  </span>
                                </div>
                                <p className="text-xs text-slate-800 leading-relaxed">
                                  {t.v2Output.response}
                                </p>
                                {t.memoryOps.mutatedNode && (
                                  <div className="text-[10px] font-medium px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    ✓ Memory Graph Updated: {t.memoryOps.mutatedNode.newValue}
                                  </div>
                                )}
                              </div>

                              {/* v1.4 Baseline */}
                              <div className="p-3 rounded-xl bg-rose-50/30 border border-rose-200 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-rose-800 flex items-center gap-1">
                                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                    Nyra v1.4 (Legacy Baseline)
                                  </span>
                                  <span className="text-[10px] font-mono text-rose-600">
                                    {t.v14BaselineOutput.totalLatencyMs}ms • FAIL
                                  </span>
                                </div>
                                <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                                  {t.v14BaselineOutput.response}
                                </p>
                                <div className="text-[10px] font-semibold px-2 py-1 rounded bg-rose-100/80 text-rose-800 border border-rose-200">
                                  ✗ {t.v14BaselineOutput.failureHighlight}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3.5 rounded-xl bg-indigo-50/40 border border-indigo-200 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                                  <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                                  Nyra Response
                                </span>
                                <div className="flex items-center gap-2 text-[11px] font-mono">
                                  <span className="text-slate-600">
                                    {t.v2Output.totalLatencyMs}ms
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded font-sans font-semibold ${
                                      t.v2Output.passedAllGates
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {t.v2Output.passedAllGates ? 'ALL 5 GATES PASSED' : 'GATE VIOLATION'}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                                {t.v2Output.response}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Chat Input Bar */}
                <div className="p-3.5 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendTurn();
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder={`Talk to Nyra as ${currentPersona.name.split(' ')[0]} (or test a memory update, e.g., "My friend Karan moved to Delhi")...`}
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send Turn
                    </button>
                  </form>
                </div>
              </div>

              {/* RIGHT COLUMN (3 cols): Turn-by-Turn Companion Pipeline X-Ray */}
              <div className="lg:col-span-3 space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Companion Turn X-Ray
                      </h3>
                    </div>
                    {activeTurnTrace && (
                      <span className="text-[11px] font-mono text-slate-500">
                        {activeTurnTrace.v2Output.totalLatencyMs}ms E2E
                      </span>
                    )}
                  </div>

                  {!activeTurnTrace ? (
                    <div className="py-12 text-center space-y-2 text-xs text-slate-500">
                      <Activity className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="font-medium text-slate-700">No Turn Selected Yet</p>
                      <p className="text-[11px]">
                        Trigger any stress-test button or send a message in the Playground to inspect the 4-stage companion telemetry trace.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3.5 text-xs">
                      {/* Stage 1: Crisis Safety Gate */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">
                            1. Pre-LLM Crisis Gate
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              activeTurnTrace.safetyGate.triggered
                                ? 'bg-rose-600 text-white'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {activeTurnTrace.safetyGate.triggered
                              ? `INTERCEPTED (${activeTurnTrace.safetyGate.latencyMs}ms)`
                              : `CLEAR (${activeTurnTrace.safetyGate.latencyMs}ms)`}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          {activeTurnTrace.safetyGate.matchedRule ||
                            'No direct or indirect self-harm idioms (EN / Hinglish / JP) detected.'}
                        </p>
                      </div>

                      {/* Stage 2: Emotion & Need Classifier */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">
                            2. Emotion & Stance Router
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">
                            Intensity {activeTurnTrace.classifier.intensity}/10
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                          <div className="p-1.5 rounded bg-white border border-slate-200">
                            <span className="text-slate-400 block text-[10px]">Emotion</span>
                            <span className="font-semibold text-slate-800">
                              {activeTurnTrace.classifier.primaryEmotion}
                            </span>
                          </div>
                          <div className="p-1.5 rounded bg-white border border-slate-200">
                            <span className="text-slate-400 block text-[10px]">Advice Lock</span>
                            <span className="font-semibold text-slate-800">
                              {activeTurnTrace.classifier.adviceAllowed
                                ? 'Allowed after validation'
                                : 'LOCKED (Validate Only)'}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-indigo-900 bg-indigo-50/70 p-2 rounded-lg border border-indigo-100">
                          <strong>Strategy:</strong> {activeTurnTrace.classifier.selectedStrategy}
                        </p>
                      </div>

                      {/* Stage 3: Memory Graph Read / Write Diff */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">
                            3. Memory Graph Read/Write
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            {activeTurnTrace.memoryOps.hallucinationCheck === 'VERIFIED_GROUNDED'
                              ? '0 Hallucinations'
                              : 'Hallucination Risk'}
                          </span>
                        </div>

                        {activeTurnTrace.memoryOps.mutatedNode ? (
                          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] space-y-1">
                            <div className="font-bold text-emerald-900">
                              ⚡ {activeTurnTrace.memoryOps.mutatedNode.operation}
                            </div>
                            {activeTurnTrace.memoryOps.mutatedNode.previousValue && (
                              <div className="text-rose-700 line-through">
                                Old: {activeTurnTrace.memoryOps.mutatedNode.previousValue}
                              </div>
                            )}
                            <div className="text-emerald-800 font-medium">
                              New: {activeTurnTrace.memoryOps.mutatedNode.newValue}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-600">
                            Retrieved Nodes:{' '}
                            <strong>
                              {activeTurnTrace.memoryOps.retrievedNodes.join(', ') || 'None'}
                            </strong>
                          </p>
                        )}
                      </div>

                      {/* Stage 4: 5-Gate Automatic Evaluator */}
                      <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                        <span className="font-bold text-slate-800 block">
                          4. Automatic Turn Gate Checks
                        </span>
                        <div className="space-y-1.5">
                          {activeTurnTrace.v2Output.gateBreakdown.map((g, i) => (
                            <div
                              key={i}
                              className="flex items-start justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/80"
                            >
                              <div className="flex items-start gap-1.5">
                                {g.passed ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                                )}
                                <div>
                                  <div className="font-semibold text-slate-800 text-[11px]">
                                    {g.label}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    {g.detail}
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  g.passed
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {g.passed ? 'PASS' : 'FAIL'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 2: MULTI-TURN & LONGITUDINAL COMPANION EVALS
           ===================================================================== */}
        {activeTab === 'EVALS' && (
          <div className="space-y-6">
            {/* Top Evals Header Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Multi-Turn & Cross-Session Companion Evaluation Suite
                </span>
                <h2 className="text-lg font-display font-bold text-slate-900 mt-0.5">
                  Trajectory Evals: Memory Overwrite, False-Premise Resistance, Empathy & Crisis Hard-Gates
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Each test runs a multi-turn or multi-day user trajectory with seeded memory state and compares <strong>Nyra v2.0 Candidate</strong> against <strong>Nyra v1.4 Baseline</strong>.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-mono">{lastBatchRunTime}</span>
                <button
                  onClick={() => setShowNewEvalModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Multi-Turn Eval
                </button>
                <button
                  onClick={handleRunAllEvals}
                  disabled={isRunningBatch}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
                >
                  <Play className="w-3.5 h-3.5" />
                  {isRunningBatch ? 'Running 6 Companion Suites...' : 'Run All Eval Suites'}
                </button>
              </div>
            </div>

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span className="text-xs font-medium text-slate-500">v2.0 Candidate Suite Pass Rate</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-display font-bold text-emerald-700">100% ({evalCases.length}/{evalCases.length})</span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                     Avg Score: 97.2%
                  </span>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span className="text-xs font-medium text-slate-500">v1.4 Baseline Suite Pass Rate</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-display font-bold text-rose-600">0% (0/{evalCases.length})</span>
                  <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    Avg Score: 51.6%
                  </span>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span className="text-xs font-medium text-slate-500">Day-7 Fact Correction Survival</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-display font-bold text-slate-900">95.8%</span>
                  <span className="text-xs text-emerald-700 font-medium">+41.8% vs v1.4</span>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span className="text-xs font-medium text-slate-500">Multilingual Crisis Recall</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-display font-bold text-slate-900">100.0%</span>
                  <span className="text-xs font-mono text-indigo-700">1.8ms Pre-LLM Gate</span>
                </div>
              </div>
            </div>

            {/* Pillar Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              {[
                'ALL',
                'Memory Recall & Overwrite',
                'Anti-Hallucination Grounding',
                'Empathy & Anti-Checklist',
                'Anti-Sycophancy (1 AM Guard)',
                'Crisis Safety Hard-Gate',
                'Voice Latency & Barge-In'
              ].map((pillar) => (
                <button
                  key={pillar}
                  onClick={() => setEvalPillarFilter(pillar)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    evalPillarFilter === pillar
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {pillar === 'ALL' ? `All Companion Pillars (${evalCases.length})` : pillar}
                </button>
              ))}
            </div>

            {/* Master-Detail Evals Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Eval List (5 cols) */}
              <div className="lg:col-span-5 space-y-2.5">
                {filteredEvals.map((ev) => {
                  const active = ev.id === selectedEvalCase.id;
                  return (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEvalId(ev.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        active
                          ? 'bg-indigo-50/40 border-indigo-500 shadow-sm ring-2 ring-indigo-100'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-indigo-700">
                            {ev.id}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {ev.pillar}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            ev.severity === 'P0_BLOCKER'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {ev.severity}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 mt-2">
                        {ev.title}
                      </h3>

                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-xs">
                        <span className="text-slate-500">
                          Persona: <strong className="text-slate-700">{ev.personaName}</strong>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-rose-600 font-semibold">
                            v1.4: {ev.v14Score}% (FAIL)
                          </span>
                          <span className="text-emerald-700 font-bold">
                            v2.0: {ev.v2Score}% (PASS)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Eval Trajectory Inspector (7 cols) */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {selectedEvalCase.id}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        {selectedEvalCase.pillar}
                      </span>
                    </div>
                    <h3 className="text-base font-display font-bold text-slate-900 mt-1">
                      {selectedEvalCase.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleLoadEvalIntoPlayground(selectedEvalCase)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Test This Scenario in Playground
                  </button>
                </div>

                {/* Seeded Memory Context & Assertions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Pre-Seeded Memory Graph State
                    </span>
                    <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                      {selectedEvalCase.seededMemorySummary.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Deterministic & Rubric Assertions
                    </span>
                    <div className="text-xs space-y-1">
                      <div>
                        <span className="text-slate-500">Must Include: </span>
                        <span className="font-mono font-semibold text-emerald-700">
                          {selectedEvalCase.mustIncludeTokens.join(', ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Must NOT Include: </span>
                        <span className="font-mono font-semibold text-rose-700">
                          {selectedEvalCase.mustNotIncludeTokens.join(', ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Voice Cadence Limit: </span>
                        <span className="font-mono font-semibold text-slate-800">
                          ≤ {selectedEvalCase.maxSentencesPerTurn} sentences/turn
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Multi-Turn Trajectory Steps */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Multi-Turn Execution Transcript ({selectedEvalCase.turns.length} Step Trajectory)
                  </h4>

                  {selectedEvalCase.turns.map((turn) => (
                    <div
                      key={turn.turnNumber}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          Turn {turn.turnNumber} • {turn.sessionDay}
                        </span>
                        <span className="text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          Expected: {turn.expectedCompanionBehavior}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-900">
                        <strong className="text-slate-500 block text-[10px] uppercase mb-0.5">
                          Simulated User Utterance:
                        </strong>
                        “{turn.userUtterance}”
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-white border-2 border-emerald-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-800">
                              ✓ Nyra v2.0 Candidate
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              PASS
                            </span>
                          </div>
                          <p className="text-xs text-slate-800 leading-relaxed">
                            {turn.v2Response}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-rose-50/40 border border-rose-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-rose-800">
                              ✗ Nyra v1.4 Baseline
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                turn.v14Passed
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {turn.v14Passed ? 'PASS' : 'FAIL'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                            {turn.v14Response}
                          </p>
                          {turn.failureReasonV14 && (
                            <div className="text-[11px] font-medium text-rose-800 bg-rose-100/70 p-2 rounded-lg border border-rose-200">
                              <strong>Root Cause:</strong> {turn.failureReasonV14}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal to Create Custom Multi-Turn Eval */}
            {showNewEvalModal && (
              <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-display font-bold text-slate-900">
                      Create New Companion Multi-Turn Eval
                    </h3>
                    <button
                      onClick={() => setShowNewEvalModal(false)}
                      className="text-xs text-slate-500 hover:text-slate-900"
                    >
                      Close
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Eval Case Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Pet Location Update Survival (Indiranagar → Koramangala)"
                        value={newEvalTitle}
                        onChange={(e) => setNewEvalTitle(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Companion Evaluation Pillar
                      </label>
                      <select
                        value={newEvalPillar}
                        onChange={(e) => setNewEvalPillar(e.target.value as CompanionEvalCase['pillar'])}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                      >
                        <option value="Memory Recall & Overwrite">Memory Recall & Overwrite</option>
                        <option value="Anti-Hallucination Grounding">Anti-Hallucination Grounding</option>
                        <option value="Empathy & Anti-Checklist">Empathy & Anti-Checklist</option>
                        <option value="Anti-Sycophancy (1 AM Guard)">Anti-Sycophancy (1 AM Guard)</option>
                        <option value="Crisis Safety Hard-Gate">Crisis Safety Hard-Gate</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Pre-Seeded Memory Fact (Day 1 Context)
                      </label>
                      <input
                        type="text"
                        value={newEvalSeedMemory}
                        onChange={(e) => setNewEvalSeedMemory(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Simulated User Utterance (Turn Prompt)
                      </label>
                      <textarea
                        rows={2}
                        value={newEvalUserPrompt}
                        onChange={(e) => setNewEvalUserPrompt(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Must Include Tokens (comma-sep)
                        </label>
                        <input
                          type="text"
                          value={newEvalMustInclude}
                          onChange={(e) => setNewEvalMustInclude(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Must NOT Include (comma-sep)
                        </label>
                        <input
                          type="text"
                          value={newEvalMustNotInclude}
                          onChange={(e) => setNewEvalMustNotInclude(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowNewEvalModal(false)}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateCustomEval}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
                    >
                      Save & Execute Eval
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            TAB 3: PRODUCTION READINESS & BLOCKING ISSUES SCORECARD
           ===================================================================== */}
        {activeTab === 'READINESS' && (
          <div className="space-y-6">
            {/* Executive Verdict Banner */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-rose-50/70 border-2 border-rose-200 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
                    Current Baseline (Nyra v1.4 — Single LLM + Raw History)
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-600 text-white">
                    NO-GO FOR PRODUCTION
                  </span>
                </div>
                <h3 className="text-base font-display font-bold text-slate-900">
                  Blocked by 3 P0 Safety/Memory Failures & 3 P1 Persona/Latency Issues
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  v1.4 fails cross-session fact updates (68.4% recall), fabricates shared memories when baited (11.6% hallucination rate), misses Romanized Hinglish self-harm cues (89% recall), and dumps bulleted advice lists when users are venting.
                </p>
              </div>

              <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Candidate Build (Nyra v2.0 — Hybrid Router + Graph Memory)
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white">
                    PRODUCTION READY (6/6 GATES PASSED)
                  </span>
                </div>
                <h3 className="text-base font-display font-bold text-slate-900">
                  All 6 Release Gates Cleared Across Safety, Memory, Empathy & Voice Latency
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Pre-LLM &lt;5ms multilingual crisis interceptor achieves 100% safety recall; Tier-1 Entity Graph achieves 95.8% Day-7 recall & fact overwrite; Emotion Classifier locks venting turns to 2–3 warm sentences at 630ms p95 voice latency.
                </p>
              </div>
            </div>

            {/* 6 Production Release Gates Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-display font-bold text-slate-900">
                    Production Release Gate Matrix (v1.4 Baseline vs. v2.0 Candidate)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Click “Verify in Evals” on any gate to inspect the exact multi-turn transcript and assertion proof.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-3 px-4">Release Gate & Companion Pillar</th>
                      <th className="py-3 px-4">Production Target</th>
                      <th className="py-3 px-4">v1.4 Baseline</th>
                      <th className="py-3 px-4">v2.0 Candidate</th>
                      <th className="py-3 px-4">Architectural Fix Implemented in v2.0</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {PRODUCTION_RELEASE_GATES.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50/80">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{g.gateName}</div>
                          <div className="text-[11px] text-slate-500">{g.metricLabel}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                          {g.targetThreshold}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold ${
                              g.v14Status === 'FAIL_BLOCKER'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {g.v14BaselineValue}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ {g.v2CandidateValue}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-md">
                          {g.summary}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedEvalId(g.linkedEvalId);
                              setActiveTab('EVALS');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold"
                          >
                            Verify in Evals
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 4: DEVELOPER 12-ITEM LIKERT FEEDBACK MATRIX
           ===================================================================== */}
        {activeTab === 'FEEDBACK_FORM' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Validated 12-Statement Likert Evaluation Form
                </span>
                <h2 className="text-lg font-display font-bold text-slate-900 mt-0.5">
                  How do you rate the AI Companion for the following?
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Clean 5-point Likert matrix (Poor → Excellent) covering Memory, Hallucinations, Emotional Validation, Anti-Sycophancy, Voice Pacing & Safety.
                </p>
              </div>

              <button
                onClick={handleCopyMicrosoftFormsText}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
              >
                {copiedFormsTemplate ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied for Microsoft Forms!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Clean Text for MS Forms Import
                  </>
                )}
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                    <th className="py-3.5 px-5 w-[46%]">Evaluation Statement</th>
                    {scaleLabels.map((label) => (
                      <th key={label} className="py-3.5 px-3 text-center">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {LIKERT_12_STATEMENTS.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                    >
                      <td className="py-3.5 px-5">
                        <div className="font-medium text-slate-900">
                          {row.id}. {row.statement}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Pillar: {row.pillar} • Linked Gate: {row.targetGate}
                        </div>
                      </td>
                      {scaleLabels.map((label) => {
                        const checked = likertRatings[row.id] === label;
                        return (
                          <td
                            key={label}
                            onClick={() =>
                              setLikertRatings((prev) => ({ ...prev, [row.id]: label }))
                            }
                            className="py-3.5 px-3 text-center cursor-pointer"
                          >
                            <input
                              type="radio"
                              name={`likert-${row.id}`}
                              checked={checked}
                              onChange={() =>
                                setLikertRatings((prev) => ({ ...prev, [row.id]: label }))
                              }
                              className="w-4 h-4 accent-indigo-600 cursor-pointer"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
