import React, { useState, useEffect } from "react";
import { Users, DollarSign, SquareCheckBig, Check, Loader, Lightbulb } from "lucide-react";
import { generateText } from "../../services/gemini";

const Kg = [
  {
    id: 1,
    text: 'Recruit specialized "Canvas-Stretcher" (Gallery Wrap expert)',
    completed: false,
    category: "HR",
  },
  {
    id: 2,
    text: 'Print "Print To Frame Partner Packs" (50 cards + Steel/Canvas Samples)',
    completed: false,
    category: "Marketing",
  },
  {
    id: 3,
    text: "Secure 1,000 sq ft workshop (Kadawatha/Peliyagoda)",
    completed: false,
    category: "Operations",
  },
  {
    id: 4,
    text: "Stock 1.2mm Box Bars (Bulk purchase 50 lengths)",
    completed: false,
    category: "Inventory",
  },
  {
    id: 5,
    text: "Visit 10 Digital Art Printers in Nugegoda/Maharagama",
    completed: false,
    category: "Sales",
  },
];

const ExecutionPlan = () => {
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem("ptf_roadmap_tasks");
      return saved ? JSON.parse(saved) : Kg;
    } catch {
      return Kg;
    }
  });

  const [tips, setTips] = useState({});
  const [loadingTaskId, setLoadingTaskId] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem("ptf_roadmap_tasks", JSON.stringify(tasks));
    } catch (e) {
      console.error(e);
    }
  }, [tasks]);

  const toggleTask = (id) => {
    setTasks(tasks.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)));
  };

  const getStrategicTip = async (task) => {
    if (tips[task.id]) {
      setTips((prev) => {
        const next = { ...prev };
        delete next[task.id];
        return next;
      });
      return;
    }

    setLoadingTaskId(task.id);
    try {
      const prompt = `Task: "${task.text}". Business: "Print To Frame" - Steel Framing for Digital Art in Sri Lanka. Give 3 actionable steps.`;
      const tipText = await generateText(prompt);
      setTips((prev) => ({ ...prev, [task.id]: tipText }));
    } catch (error) {
      console.error(error);
      setTips((prev) => ({ ...prev, [task.id]: "Error generating strategic recommendation. Please try again." }));
    } finally {
      setLoadingTaskId(null);
    }
  };

  const completionPercent = Math.round(
    (tasks.filter((task) => task.completed).length / tasks.length) * 100
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h2 className="text-2xl font-bold text-on-surface">Growth Roadmap</h2>
        <div className="flex items-center space-x-4 bg-surface-container p-2 rounded-lg border border-outline-variant">
          <span className="text-sm font-medium text-on-surface-variant">Phase Readiness:</span>
          <div className="w-32 h-2 bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full bg-primary text-on-primary transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <span className="text-sm font-bold text-primary">{completionPercent}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Year 1 Card */}
          <div className="bg-surface-container rounded-2xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary text-on-primary" />
            <div className="ml-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-on-surface">Year 1: Market Dominance</h3>
                <span className="px-3 py-1 bg-primary/20 text-indigo-400 text-xs font-bold rounded-full uppercase">
                  Current Focus
                </span>
              </div>
              <p className="text-on-surface-variant mb-4 text-sm leading-relaxed">
                Becoming the #1 choice for Sri Lankan digital artists to secure their prints on steel frames.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-surface-container-low p-4 rounded-lg">
                  <h4 className="font-semibold text-on-surface mb-2 flex items-center text-sm">
                    <Users size={16} className="mr-2 text-primary" />
                    Art Network
                  </h4>
                  <ul className="text-xs text-on-surface-variant space-y-2 list-disc list-inside">
                    <li>Partner with top Art Printers.</li>
                    <li>Referral system for freelancers.</li>
                    <li>Quality-first gallery wrap guarantee.</li>
                  </ul>
                </div>
                <div className="bg-surface-container-low p-4 rounded-lg">
                  <h4 className="font-semibold text-on-surface mb-2 flex items-center text-sm">
                    <DollarSign size={16} className="mr-2 text-primary" />
                    Pricing
                  </h4>
                  <ul className="text-xs text-on-surface-variant space-y-2 list-disc list-inside">
                    <li>Affordable LKR 250 entry sqft.</li>
                    <li>Automatic commission payouts.</li>
                    <li>Bulk discounts for galleries.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Year 2 Card */}
          <div className="bg-surface-container rounded-2xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] p-6 relative overflow-hidden opacity-80">
            <div className="absolute top-0 left-0 w-1 h-full bg-surface-variant" />
            <div className="ml-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-on-surface">Year 2: Full Automation</h3>
                <span className="px-3 py-1 bg-surface-container text-on-surface-variant text-xs font-bold rounded-full uppercase">
                  Future Scale
                </span>
              </div>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-4">
                Full-service logistics: from artist's studio to the collector's wall.
              </p>
            </div>
          </div>
        </div>

        {/* Checklist Sidebar */}
        <div className="space-y-6">
          <div className="bg-surface-container rounded-2xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] p-6 h-full border-l-4 border-l-green-500">
            <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center">
              <SquareCheckBig size={20} className="mr-2 text-green-600" />
              Operational Checklist
            </h3>
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-surface-container border border-outline-variant/50 rounded-lg p-3 hover:border-outline-variant transition-colors"
                >
                  <div className="flex items-start cursor-pointer" onClick={() => toggleTask(task.id)}>
                    <div
                      className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center mr-3 flex-shrink-0 ${
                        task.completed ? "bg-green-500 border-green-500" : "border-outline-variant"
                      }`}
                    >
                      {task.completed && <Check size={12} className="text-on-surface" />}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${
                          task.completed ? "text-green-800 line-through font-normal" : "text-on-surface"
                        }`}
                      >
                        {task.text}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 ml-8">
                    <button
                      onClick={() => getStrategicTip(task)}
                      className="text-xs flex items-center text-primary hover:text-indigo-400 font-medium"
                    >
                      {loadingTaskId === task.id ? (
                        <Loader size={12} className="mr-1 animate-spin" />
                      ) : (
                        <Lightbulb size={12} className="mr-1" />
                      )}
                      {tips[task.id] ? "Close Tip" : "Specialist Strategy"}
                    </button>
                    {tips[task.id] && (
                      <div className="mt-2 p-3 bg-primary/10 rounded-lg text-xs text-on-surface leading-relaxed border border-indigo-100 whitespace-pre-wrap">
                        {tips[task.id]}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutionPlan;
